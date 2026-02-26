import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { geocode } from "../utils/geocode.js";
import { computeCameraFrames } from "../cesium/camera.js";
import type { EasingName } from "../utils/easing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface FlyInOptions {
  city: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  startAltitude: number;
  endAltitude: number;
  tiltAngle: number;
  heading: number;
  easing: EasingName;
  outputDir: string;
  cesiumToken: string;
}

export interface FlyInResult {
  success: boolean;
  city: string;
  frameCount: number;
  outputDir: string;
  resolution: string;
  message: string;
}

/**
 * Wait for globe tiles to finish loading, with a timeout.
 */
async function waitForTilesLoaded(
  page: puppeteer.Page,
  timeoutMs: number
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const loaded = await page.evaluate(() => {
      return (window as any).areTilesLoaded();
    });
    if (loaded) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/**
 * Wait for the next animation frame to ensure the scene is rendered.
 */
async function waitForRender(page: puppeteer.Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

/**
 * Generate a fly-in animation, capturing numbered PNG frames.
 */
export async function generateFlyIn(opts: FlyInOptions): Promise<FlyInResult> {
  const {
    city,
    width,
    height,
    fps,
    durationSeconds,
    startAltitude,
    endAltitude,
    tiltAngle,
    heading,
    easing,
    outputDir,
    cesiumToken,
  } = opts;

  // Geocode the city
  const location = await geocode(city);
  const totalFrames = fps * durationSeconds;

  // Compute all camera frames upfront
  const frames = computeCameraFrames({
    longitude: location.lon,
    latitude: location.lat,
    startAltitude,
    endAltitude,
    tiltAngle,
    heading,
    totalFrames,
    easing,
  });

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve viewer HTML path
  const viewerPath = path.resolve(__dirname, "../cesium/viewer.html");
  if (!fs.existsSync(viewerPath)) {
    throw new Error(`Viewer HTML not found at ${viewerPath}`);
  }

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      `--window-size=${width},${height}`,
    ],
  });

  // Collect browser console errors for debugging
  const consoleErrors: string[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // Capture console messages for debugging
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warn") {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`[pageerror] ${String(err)}`);
    });

    // Load the viewer HTML
    await page.goto(`file://${viewerPath}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Initialize CesiumJS viewer with Ion token
    const initResult = await page.evaluate(async (token: string) => {
      try {
        await (window as any).initViewer(token);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message || String(e) };
      }
    }, cesiumToken);

    if (!initResult.ok) {
      throw new Error(`CesiumJS init failed: ${initResult.error}`);
    }

    // Give CesiumJS a moment to set up the scene
    await new Promise((r) => setTimeout(r, 2000));

    // Set the initial camera position and warm up tiles
    const firstFrame = frames[0];
    await page.evaluate(
      (lon: number, lat: number, alt: number, h: number, p: number, r: number) => {
        (window as any).setCameraPosition(lon, lat, alt, h, p, r);
      },
      firstFrame.longitude,
      firstFrame.latitude,
      firstFrame.altitude,
      firstFrame.heading,
      firstFrame.pitch,
      firstFrame.roll
    );

    // Warm-up: wait up to 20 seconds for initial tiles to load
    await waitForTilesLoaded(page, 20000);
    await waitForRender(page);

    // Frame capture loop
    let prevAltitude = -1;
    let prevPitch = -999;
    let tilesSettled = false;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      // Detect if the camera has meaningfully changed from previous frame
      const altDelta = Math.abs(frame.altitude - prevAltitude) / Math.max(frame.altitude, 1);
      const pitchDelta = Math.abs(frame.pitch - prevPitch);
      const cameraChanged = altDelta > 0.005 || pitchDelta > 0.1; // >0.5% altitude or >0.1° pitch

      // Set camera position
      await page.evaluate(
        (lon: number, lat: number, alt: number, h: number, p: number, r: number) => {
          (window as any).setCameraPosition(lon, lat, alt, h, p, r);
        },
        frame.longitude,
        frame.latitude,
        frame.altitude,
        frame.heading,
        frame.pitch,
        frame.roll
      );

      if (cameraChanged) {
        // Camera moved meaningfully — wait for new tiles, but keep it brief.
        // At 30fps consecutive frames are close together; tiles from the
        // previous frame mostly carry over, so 1.5s is enough for incremental loads.
        tilesSettled = false;
        await waitForTilesLoaded(page, 1500);
      } else if (!tilesSettled) {
        // Camera is near-static but tiles haven't fully settled yet — one generous wait
        tilesSettled = await waitForTilesLoaded(page, 3000);
      }
      // else: camera hasn't moved AND tiles are already settled — skip waiting

      // Render wait
      await waitForRender(page);

      // Capture screenshot
      const frameNum = String(i + 1).padStart(4, "0");
      const framePath = path.join(outputDir, `frame_${frameNum}.png`);
      await page.screenshot({ path: framePath, type: "png" });

      prevAltitude = frame.altitude;
      prevPitch = frame.pitch;
    }

    return {
      success: true,
      city: location.name,
      frameCount: totalFrames,
      outputDir,
      resolution: `${width}x${height}`,
      message: `Generated ${totalFrames} frames for fly-in to ${location.name}. To render as video, use Remotion (npx remotion render) or FFmpeg (ffmpeg -framerate ${fps} -i ${outputDir}/frame_%04d.png -c:v libx264 -pix_fmt yuv420p output.mp4).`,
    };
  } catch (error) {
    // Enhance error with console errors if available
    const baseMessage =
      error instanceof Error ? error.message : String(error);
    const debugInfo =
      consoleErrors.length > 0
        ? `\nBrowser console errors:\n${consoleErrors.join("\n")}`
        : "";
    throw new Error(`${baseMessage}${debugInfo}`);
  } finally {
    await browser.close();
  }
}
