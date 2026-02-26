# Future Features Plan

A curated roadmap of practical additions for cesiumjs-mcp, organized into tiers by value and complexity. Each feature stays within the project's core mission: **generating cinematic globe animations as PNG frame sequences for Remotion video projects via MCP tools**.

Features are informed by Google Earth Studio workflows, aerial cinematography techniques, and the project's existing architecture.

---

## Architectural Insight

The current rendering pipeline is already general-purpose. The `CameraFrame` interface carries six degrees of freedom (`longitude`, `latitude`, `altitude`, `heading`, `pitch`, `roll`), and the Puppeteer frame-capture loop simply iterates any `CameraFrame[]` array. This means:

- **New animation types** only require new frame-computation functions — the rendering pipeline is reusable as-is.
- **The viewer HTML API** (`initViewer`, `setCameraPosition`, `areTilesLoaded`) needs no changes for camera-only enhancements.
- A shared rendering session extracted from `generate-flyin.ts` would eliminate duplication when adding new tools.

---

## Tier 1 — High Value, Low Complexity

### 1. `geocode_city` Tool

Expose the existing `geocode()` function as a standalone MCP tool. Returns resolved city name, latitude, and longitude — or an error.

**Why:** Currently, a failed geocode only surfaces after Puppeteer has launched Chrome and initialized CesiumJS (5–10 seconds wasted). This tool lets an LLM validate a city name before committing to a full render. It also lets users confirm the resolved coordinates match their intent.

**Scope:** ~15 lines in `index.ts`. Zero new files, zero new dependencies.

**Parameters:** `city` (string)
**Returns:** `{ name, lat, lon }`

---

### 2. `preview_frame` Tool

Render a single frame at a specified camera position. Accepts a city (or raw coordinates) plus altitude, tilt, and heading. Returns path to one PNG.

**Why:** Right now, testing camera angles requires rendering all 180 frames. A preview takes ~10–15 seconds instead of minutes, enabling rapid iteration on parameters. Useful for: "Show me what Tokyo looks like from 5000m at heading 45" before committing to a full animation.

**Scope:** Reuses ~80% of the existing Puppeteer pipeline — launch browser, init viewer, set camera, wait for tiles, capture one screenshot, close.

**Parameters:** `city` or `{lon, lat}`, `altitude`, `tiltAngle`, `heading`, `outputPath`, `width`, `height`
**Returns:** `{ path, resolution }`

---

### 3. Fly-Out / Pull-Away Mode

Reverse the fly-in animation so the camera starts close and pulls away to orbital altitude. The classic "zoom out to reveal context" ending shot.

**Why:** This is the natural bookend to a fly-in. In the current architecture, reversing the `CameraFrame[]` array automatically inverts the pitch timeline (start tilted, end at nadir), which is cinematically correct for a pull-away.

**Scope:** Add a `direction: "in" | "out"` parameter to `generate_flyin`. When `"out"`, call `.reverse()` on the computed frames array before rendering. ~5 lines of logic.

---

### 4. Dynamic Heading (Slow Pan)

Interpolate heading from `startHeading` to `endHeading` during the animation, creating a gradual rotation as the camera descends.

**Why:** Fixed heading makes every fly-in feel static. A slow 30–60 degree pan during descent adds significant cinematic quality with minimal complexity. This is one of the most common adjustments professional drone operators make.

**Scope:** Add shortest-arc heading interpolation in `computeCameraFrames`. ~10 lines. The existing `heading` parameter becomes `endHeading`; add `startHeading` (defaults to same value for backward compatibility).

**Math:** Normalize heading delta to [-180, 180], then `heading(t) = startHeading + delta * easedT`.

---

### 5. Configurable Tilt Onset

The current pitch transition (nadir to oblique) is hardcoded to begin at 50% through the eased timeline. Make this configurable.

**Why:** Different shot styles call for different reveal timing. `tiltOnset: 0.0` tilts immediately (horizon visible from the start, "photographer's reveal"). `tiltOnset: 0.8` keeps nadir until late (dramatic late reveal). The current behavior maps to `tiltOnset: 0.5`.

**Scope:** Change one hardcoded `0.5` in `camera.ts` to use a parameter. ~3 lines.

**Parameter:** `tiltOnset` (number 0–1, default 0.5)

---

### 6. JSON Metadata Manifest

Output a `manifest.json` alongside the PNG frames after every render. Contains all metadata needed for downstream consumers to auto-configure playback.

**Why:** Currently, if someone receives a frame directory without the MCP response context (e.g., handed off between team members), they have to guess the fps, resolution, and frame count. A Remotion `<Composition>` requires exactly `fps`, `durationInFrames`, and `width`/`height` — all of which can be read from the manifest. The `pattern` field (printf-style `%04d`) works with both Remotion's `staticFile()` and FFmpeg's `-i` flag.

**Example output:**
```json
{
  "version": 1,
  "city": "Chicago",
  "fps": 30,
  "frameCount": 180,
  "width": 1920,
  "height": 1080,
  "durationSeconds": 6,
  "pattern": "frame_%04d.png",
  "easing": "cinematic",
  "camera": {
    "startAltitude": 800000,
    "endAltitude": 2000,
    "tiltAngle": 45,
    "heading": 0,
    "latitude": 41.8781,
    "longitude": -87.6298
  },
  "audioSync": {
    "whooshPeakFrame": 54,
    "whooshPeakTimestamp": 1.8
  }
}
```

The `audioSync` field is derived from the existing "cinematic" easing function's blend point at `t=0.3` — the moment of maximum apparent velocity. This gives audio editors a precise sync point for whoosh/swoosh sound effects.

**Scope:** Low. Write one JSON file after frame capture completes. ~15 lines.

---

## Tier 2 — New Animation Types

### 7. `generate_orbit` Tool

Circle the camera around a point of interest at a fixed altitude and distance. The standard "establishing shot" in aerial cinematography — the natural companion to fly-in.

**Why:** In Google Earth Studio workflows, the two most common shots are fly-in (establish the location) and orbit (showcase it). A Remotion project would sequence them: fly-in → orbit. This is the single highest-value new animation type.

**Math:** At each frame, compute camera position on a circle of radius `r` around the target:
- `cameraLon = targetLon + r * sin(angle) / cos(targetLat)`
- `cameraLat = targetLat + r * cos(angle)`
- `heading = angle + 180°` (always facing center)
- Pitch and altitude remain constant (or slowly vary for a descending orbit).

**Parameters:** `city`, `orbitRadius` (km), `altitude`, `tiltAngle`, `startAngle`, `endAngle` (default 360°), `direction` ("cw"/"ccw"), `outputDir`, `fps`, `durationSeconds`, `width`, `height`

**Scope:** New `computeOrbitFrames()` function (~40 lines). Refactor Puppeteer pipeline into a shared module to avoid duplicating `generate-flyin.ts`.

---

### 8. Spiral Descent

The camera follows a helical path — circling the target while descending. Mimics helicopter or drone approach footage and is one of the most recognized cinematic aerial shots.

**Why:** Combines the visual interest of an orbit with the geographic reveal of a fly-in. Google Earth Studio's "Spiral" quick-start is one of its most popular templates.

**Math:** Parameterize as polar coordinates with decaying radius:
- `r(t) = startRadius * (1 - easedT)`
- `angle(t) = totalRevolutions * 2π * easedT`
- Heading auto-tracks to face center: `heading = atan2(deltaLon, deltaLat) + 180°`

**Parameters:** Add `spiralRevolutions` (number, default 1.5) and `spiralRadius` (km, auto-calculated from start altitude if omitted) to `generate_flyin`.

**Scope:** Medium. Core trigonometry is straightforward; main subtlety is longitude correction for latitude.

---

### 9. `generate_flyover` Tool (Point-to-Point)

Fly between two cities via a great-circle arc, ascending to a cruise altitude at the midpoint. Creates the classic Google Earth "travel between places" animation.

**Why:** Enables transition shots for documentaries, travel videos, and journalism. This is a shot type that cannot be achieved by composing existing tools.

**Math:** Great-circle interpolation between two lat/lon pairs with an altitude arc:
- Position: `slerp(cityA, cityB, t)` on the sphere
- Altitude: parabolic arc peaking at `cruiseAltitude` at `t=0.5`
- Heading: bearing along the great-circle path at each point
- Pitch: nadir during cruise, tilting toward ground at endpoints

**Parameters:** `fromCity`, `toCity`, `cruiseAltitude`, `startAltitude`, `endAltitude`, `durationSeconds`, etc.

**Scope:** Medium-high. Requires great-circle math (Haversine/Vincenty, ~50 lines) plus altitude profiling.

---

### 10. Fly-In-to-Orbit Combination

A two-phase animation: fly-in to a location, then seamlessly transition into an orbit. One of Google Earth Studio's most popular templates.

**Why:** Provides both geographic context (the descent) and a detailed showcase (the orbit) in a single animation, eliminating the need to manually stitch two separate renders.

**Scope:** Compose frames from `computeCameraFrames()` (first phase) and `computeOrbitFrames()` (second phase), with a smooth transition zone in between. Requires Tier 2 orbit to be built first.

**Parameters:** Inherit from both `generate_flyin` and `generate_orbit`, plus `flyinDuration` / `orbitDuration` split.

---

## Tier 3 — Polish and Cinematic Quality

### 11. Bounce / Overshoot Settle Easing

A new easing option where the camera slightly overshoots (descends past the target altitude) then bounces back, adding energy to the ending. Mimics the natural behavior of a crane arm reaching its endpoint.

**Math:** Underdamped spring in the final phase:
`overshoot(t) = 1 - e^(-damping * t) * cos(frequency * t)`

**Scope:** Add `"bounce"` to the `EasingName` enum. ~20 lines for the new easing function.

---

### 12. Camera Shake / Handheld Feel

Subtle pseudo-random perturbation to heading, pitch, and roll for a less robotic feel. Simulates micro-movements of a real drone or helicopter camera.

**Math:** Sum of sine waves with irrational frequency ratios (no noise library needed):
- `shake(t) = A₁·sin(2π·7.3·t) + A₂·sin(2π·13.7·t + φ)` applied to heading/pitch/roll with different phases
- Multiplied by a window function to fade in/out at animation boundaries
- Roll amplitude kept much smaller than heading/pitch (roll is visually dominant)

**Parameters:** `shakeIntensity` (0–1, default 0), `shakeFrequency` ("low"/"medium"/"high")

**Scope:** ~20 lines as a post-processing pass on the computed `CameraFrame[]`.

---

### 13. Time of Day / Lighting

Control the sun position to render golden hour, sunset, night (with city lights), or specific times. Google Earth Studio's most requested atmospheric feature.

**Why:** Lighting transforms the mood of every shot. A sunset fly-in over Paris vs. a midday fly-in are entirely different experiences.

**Implementation:** CesiumJS supports `viewer.scene.globe.enableLighting = true` and sun position via `viewer.clock`. Add a `timeOfDay` parameter ("sunrise", "golden_hour", "midday", "sunset", "night") that maps to appropriate clock settings.

**Scope:** Modifications to `viewer.html` to accept and apply lighting settings. Medium complexity.

---

### 14. Optional WebP Frame Format

Add a `format` parameter (`"png" | "webp"`) to `generate_flyin`. WebP files are 25–35% smaller than PNG at visually lossless quality, which matters when generating 180 frames at 1920x1080 (easily 1–2 GB as PNGs).

**Why:** Puppeteer already supports `type: "webp"` in `page.screenshot()`. Remotion's `<Img>` component handles WebP without issues. For workflows that prioritize speed and disk space over lossless fidelity, WebP is a significant improvement.

**Scope:** Low. Change the screenshot `type` based on a parameter. Default remains `"png"` for backward compatibility. Do not add AVIF — Puppeteer does not support it as a screenshot format.

---

### 15. Bloom and Lens Flare Toggles

Expose CesiumJS's built-in `PostProcessStageLibrary` effects as optional boolean flags.

**Why:** CesiumJS ships with GLSL shaders for bloom, ambient occlusion, depth of field, lens flare, and silhouettes. Of these, **bloom** and **lens flare** are the most cinematically relevant for fly-in animations — bloom adds a soft glow to bright areas (water reflections, sunlit buildings), and lens flare adds a photographic quality when the sun is in frame.

**Implementation:** In `viewer.html`, toggle `viewer.scene.postProcessStages` based on parameters passed during init.

**Parameters:** `bloom: boolean` (default false), `lensFlare: boolean` (default false)

**Scope:** Low. A few lines in the viewer initialization.

---

### 16. FOV Animation

Animate the camera's field of view during the animation. Starting wide and narrowing creates compression and focus; starting narrow and widening creates an expansive reveal.

**Why:** Even a subtle FOV shift (60° → 45°) during a fly-in adds perceived cinematic quality. A dramatic FOV shift creates a dolly zoom / Hitchcock vertigo effect.

**Implementation:** Add `fovStart` and `fovEnd` parameters. Expose a `setFOV()` function in `viewer.html`. Interpolate FOV alongside other camera properties in the frame loop.

**Scope:** Low. Requires adding a `fov` field to `CameraFrame` and a small viewer API addition.

---

### 17. Dutch Angle / Banking Roll

Introduce controlled roll for dramatic compositions or realistic banking during curved paths.

**Two modes:**
- **Static Dutch angle:** Interpolate roll from `startRoll` to `endRoll`
- **Dynamic banking:** Derive roll proportionally from heading change rate (camera banks into turns, like an aircraft)

**Scope:** Low for static roll (one `lerp`). Medium for dynamic banking (requires computing heading derivative across frames).

---

## Tier 4 — Advanced Additions (Build if Demand Warrants)

### 18. GeoJSON / KML Data Overlays

Render geographic data (borders, routes, regions) on the globe during animations.

**Why:** Journalists and educators use geographic overlays extensively. CesiumJS has native GeoJSON/KML support.

**Parameters:** `overlays: Array<{ url: string, color?: string, opacity?: number }>`

**Scope:** Requires `viewer.html` modifications to load and render data sources. Medium.

---

### 19. Marker and Label Annotations

Render text labels or pin markers at specific coordinates during the animation.

**Why:** Eliminates post-production compositing for simple annotations (city names, landmark labels). The MCP tool controls the full rendering pipeline, so labels can be baked into frames.

**Parameters:** `markers: Array<{ lat, lon, label, style? }>`

**Scope:** Uses CesiumJS `Entity` API for labels/billboards. Medium.

---

### 20. Multi-Waypoint Spline Paths

Define a sequence of camera waypoints and interpolate smoothly between them using Catmull-Rom splines.

**Why:** Enables "city tour" shots, scenic approaches that follow a river or coastline, and arbitrary creative camera paths.

**Scope:** High. Catmull-Rom evaluation is well-documented but adds meaningful code. Edge cases (segment length variation, heading discontinuities) require care. This is the most architecturally significant addition.

---

### 21. Animated Route Drawing

A polyline that progressively draws itself along a path during the animation — the "Indiana Jones travel line" effect.

**Why:** Extremely popular for travel and journey content. Combined with a point-to-point camera, this creates a compelling visual narrative.

**Scope:** CesiumJS supports time-dynamic polyline entities. Requires viewer-side changes to add and animate the entity. Medium-high.

---

### 22. Resolution Presets

Named resolution presets for common video platforms alongside the existing raw width/height parameters.

| Preset | Resolution | Aspect | Use Case |
|--------|-----------|--------|----------|
| `"youtube"` | 1920×1080 | 16:9 | YouTube, standard video |
| `"youtube_4k"` | 3840×2160 | 16:9 | 4K YouTube |
| `"instagram_story"` | 1080×1920 | 9:16 | Instagram/TikTok stories |
| `"instagram_square"` | 1080×1080 | 1:1 | Instagram feed |
| `"twitter"` | 1280×720 | 16:9 | Twitter/X video |

**Scope:** Low. A lookup table that maps preset names to width/height values.

---

## What NOT to Build

These ideas were evaluated and rejected for adding unnecessary complexity without proportional value:

| Idea | Reason to Skip |
|------|---------------|
| **`stitch_frames` video assembly** | Out of scope. Remotion handles composition; ffmpeg hint already in output. Adding ffmpeg as a dependency bloats the MCP server. |
| **`generate_flyout` as separate tool** | Unnecessary. A `direction` parameter on `generate_flyin` achieves the same thing. |
| **Split-screen / comparison view** | Composition belongs in Remotion, not the MCP server. Users can render two sequences and composite them. |
| **Location metadata tool** | Scope creep. Elevation, timezone, and population data are available from dozens of other APIs. |
| **Easing curve visualization** | Solves a non-problem. An LLM choosing between 4 named profiles benefits from text descriptions, not images. |
| **Custom waypoints in v1** | Premature abstraction. The value of opinionated tools (fly-in, orbit) is hiding complexity behind simple parameters. |
| **Alpha channel / transparent sky** | CesiumJS has known artifacts with transparent backgrounds (black stroke around globe, translucent conflicts). Chroma-keying the uniform sky in Remotion is more reliable. |
| **360° / VR rendering** | Requires multi-camera stitching. Entirely different rendering paradigm. Out of scope. |
| **Historical imagery / timelapse** | Requires external imagery sources not available through standard CesiumJS. |
| **Low-res proxy sequences** | Users can just pass smaller `width`/`height` for previews. Generating two sets doubles render time. |
| **Text overlays and annotations in-frame** | Remotion's core competency. React components with CSS are superior to baking labels into PNGs. (Exception: 3D-positioned CesiumJS billboards in Tier 4.) |
| **Color grading / LUT application** | CSS `filter` properties in Remotion (`contrast`, `saturate`, `hue-rotate`) handle this trivially. LUT support adds significant API surface. |
| **Motion blur between frames** | Requires 4–8x sub-frame rendering or optical flow. Way outside scope. |
| **Depth maps / motion vectors** | No consumer in Remotion's workflow. Remotion layers via React DOM, not depth-buffer compositing. |
| **Batch rendering tool** | MCP clients can already sequence calls. Browser reuse optimization can be internal if needed. |

---

## Recommended Implementation Order

**Phase 1 — Quick Wins** (each is a focused PR):
1. `geocode_city` tool (#1)
2. `preview_frame` tool (#2)
3. Fly-out `direction` parameter (#3)
4. Dynamic heading — `startHeading`/`endHeading` (#4)
5. Configurable `tiltOnset` (#5)
6. JSON metadata manifest with audio sync markers (#6)

**Phase 2 — Refactor + New Animation Types:**
7. Extract shared Puppeteer rendering session from `generate-flyin.ts`
8. `generate_orbit` tool (#7)
9. Spiral descent mode (#8)
10. Bounce/overshoot easing (#11)

**Phase 3 — Cinematic Polish:**
11. Camera shake (#12)
12. Time of day / lighting (#13)
13. Optional WebP frame format (#14)
14. Bloom and lens flare toggles (#15)
15. FOV animation (#16)
16. Resolution presets (#22)

**Phase 4 — Advanced (demand-driven):**
17. `generate_flyover` point-to-point (#9)
18. Fly-in-to-orbit combination (#10)
19. Dutch angle / banking roll (#17)
20. GeoJSON overlays (#18)
21. Markers and labels (#19)
22. Multi-waypoint spline paths (#20)
23. Animated route drawing (#21)
