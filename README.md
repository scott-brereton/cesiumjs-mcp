# CesiumJS Fly-In MCP Server

An MCP (Model Context Protocol) server that generates Google Earth Studio-style fly-in animations using CesiumJS and Puppeteer. Give it a city name and it renders a cinematic aerial zoom as a numbered PNG frame sequence.

The output is a directory of PNGs — not a video. To turn them into a video, use [Remotion](https://remotion.dev) (ideal for React-based pipelines with overlays, titles, and effects) or FFmpeg for a quick encode:

```bash
ffmpeg -framerate 30 -i frames/frame_%04d.png -c:v libx264 -pix_fmt yuv420p output.mp4
```

## Prerequisites

- **Node.js** 18+
- **npm**
- **Cesium Ion account** - [Sign up free](https://ion.cesium.com/) to get an access token

## Quick Install (Claude Code)

```bash
claude mcp add cesiumjs-flyin -e CESIUMION=your_token -- npx -y cesiumjs-flyin-mcp
```

That's it. Replace `your_token` with your [Cesium Ion](https://ion.cesium.com/) access token.

## Install from Source

```bash
git clone https://github.com/scott-brereton/cesiumjs-mcp.git
cd cesiumjs-mcp
npm install
cp .env.example .env   # Add your Cesium Ion token
npm run build
```

## MCP Tools

### `generate_flyin`

Generates a fly-in animation for a given city. Geocodes the city, launches a headless browser with CesiumJS, animates the camera from orbital altitude down to street level, and captures each frame as a PNG.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `city` | string | *(required)* | City name (e.g. "Chicago", "Tokyo") |
| `outputDir` | string | *(required)* | Directory to save PNG frames |
| `width` | number | 1920 | Frame width in pixels |
| `height` | number | 1080 | Frame height in pixels |
| `fps` | number | 30 | Frames per second |
| `durationSeconds` | number | 6 | Animation duration |
| `startAltitude` | number | 800000 | Start altitude in meters (800km) |
| `endAltitude` | number | 2000 | End altitude in meters (2km) |
| `tiltAngle` | number | 45 | Final camera tilt in degrees |
| `heading` | number | 0 | Camera heading in degrees (0 = north) |
| `easing` | string | "cinematic" | Easing profile (see below) |

**Output:** Returns JSON with `success`, `city`, `frameCount`, `outputDir`, `resolution`, and `message`.

### `list_presets`

Returns preset cities with recommended camera angles. No parameters required.

## Easing Profiles

| Profile | Description |
|---|---|
| `cinematic` | Asymmetric curve: fast descent peaking at ~30%, then long gentle settle. Best for audio sync with whoosh effects. |
| `cubic` | Symmetric cubic ease-in-out. Smooth, balanced acceleration/deceleration. |
| `quintic` | Stronger symmetric ease. More dramatic acceleration at start and end. |
| `linear` | Constant speed, no easing. |

## Supported Cities

The built-in lookup table provides instant geocoding for these cities (any other city falls back to OpenStreetMap Nominatim):

New York, Los Angeles, Chicago, London, Paris, Tokyo, Sydney, Dubai, Rome, Berlin, Moscow, Beijing, Mumbai, San Francisco, Seattle, Toronto, Rio de Janeiro, Singapore, Cairo, Istanbul

Presets with recommended camera angles are available for: New York, Chicago, London, Tokyo, Dubai, San Francisco, Paris, Sydney.

## Agent Integration

See [agents.md](agents.md) for full MCP configuration instructions for Claude Desktop, Claude Code, and other MCP clients.

Quick start for Claude Code:

```bash
claude mcp add cesiumjs-flyin -e CESIUMION=your_token -- npx -y cesiumjs-flyin-mcp
```

## Remotion Integration

The PNG frame sequences are designed to drop into a [Remotion](https://remotion.dev) project. Here's a minimal component:

```tsx
// src/components/FlyIn.tsx
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";

export const FlyIn: React.FC<{ totalFrames: number }> = ({ totalFrames }) => {
  const frame = useCurrentFrame();
  const frameIndex = Math.min(frame + 1, totalFrames);
  const frameNum = String(frameIndex).padStart(4, "0");
  const src = staticFile(`frames/frame_${frameNum}.png`);

  return (
    <AbsoluteFill>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};
```

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { FlyIn } from "./components/FlyIn";

export const RemotionRoot = () => (
  <Composition
    id="CityFlyIn"
    component={FlyIn}
    durationInFrames={180} // fps * durationSeconds
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ totalFrames: 180 }}
  />
);
```

Copy the generated frames into `public/frames/` and render with:

```bash
npx remotion render src/index.ts CityFlyIn out/flyin.mp4
```

## Development

```bash
npm run build    # Compile TypeScript
npm run start    # Start MCP server
npm run dev      # Build + start
```

## How It Works

1. **Geocoding** - City name is resolved via built-in lookup table or OpenStreetMap Nominatim fallback
2. **Camera path** - All frames are pre-computed using logarithmic altitude interpolation (altitude change is perceived logarithmically) combined with the selected easing function
3. **Rendering** - Puppeteer launches headless Chrome with WebGL (ANGLE/SwiftShader), loads CesiumJS with Google Photorealistic 3D Tiles via Cesium Ion
4. **Frame capture** - Camera position is set for each frame, tiles are waited on to load, then the viewport is captured as a PNG
5. **Output** - Numbered PNGs (`frame_0001.png`, `frame_0002.png`, ...) ready for any video pipeline

## License

MIT
