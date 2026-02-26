# CesiumJS Fly-In MCP Server

## Project Overview
MCP server that generates Google Earth Studio-style fly-in animations using CesiumJS + Puppeteer. Outputs numbered PNG frame sequences for use in Remotion video projects.

## Architecture
- **Language:** TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Rendering:** Puppeteer (headless Chrome with ANGLE for WebGL)
- **3D Engine:** CesiumJS 1.125 (pinned) with Google Photorealistic 3D Tiles via Cesium Ion
- **Output:** Numbered PNG frames (`frame_0001.png`, `frame_0002.png`, etc.)

## MCP Tools
1. **`generate_flyin`** - Main tool. Geocodes city, launches headless browser, animates camera from orbital altitude to city, captures frames.
2. **`list_presets`** - Returns preset cities with recommended camera angles.

## Key Technical Details
- Cesium Ion token stored in `.env` as `CESIUMION` (not `CESIUM_ION_TOKEN`)
- Puppeteer flags: `--use-gl=angle`, `--no-sandbox`, `--disable-web-security`
- Default easing is "cinematic" (asymmetric fast-descent + long-settle curve). Also supports "cubic", "quintic", "linear"
- Tile loading uses adaptive timeouts: 20s warmup, 1.5s per frame when camera moves, 3s one-shot when settling
- Tile check accesses Cesium internals (`_surface._tileLoadQueueHigh/Medium`) pinned to Cesium 1.125 — verify if upgrading
- Default: 1920x1080, 30fps, 6 seconds, 800km start -> 2km end altitude
- Nominatim geocoding fallback rate-limited to 1 req/sec per OSM usage policy

## Commands
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript
- `npm run start` - Start MCP server
- `npm run dev` - Development mode
- `npm test` - Run vitest tests

## File Structure
```
cesiumjs-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── tools/
│   │   ├── generate-flyin.ts  # Main fly-in generation tool
│   │   └── list-presets.ts    # City presets tool
│   ├── cesium/
│   │   ├── viewer.html        # Minimal CesiumJS viewer page
│   │   └── camera.ts          # Camera animation logic
│   ├── utils/
│   │   ├── geocode.ts         # City geocoding (lookup + Nominatim fallback)
│   │   └── easing.ts          # Easing functions
│   └── __tests__/
│       ├── camera.test.ts     # Camera frame computation tests
│       └── easing.test.ts     # Easing function tests
├── .env                       # CESIUMION token
├── package.json
├── tsconfig.json
├── agents.md
└── CLAUDE.md
```

## Development Notes
- Keep dependencies minimal
- CesiumJS pinned to 1.125 — tile loading internals may change in newer versions
- Output designed for Remotion `<Img>` / `<Sequence>` components
