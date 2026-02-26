# CesiumJS Fly-In MCP Server

## Project Overview
MCP server that generates Google Earth Studio-style fly-in animations using CesiumJS + Puppeteer. Outputs numbered PNG frame sequences for use in Remotion video projects.

## Architecture
- **Language:** TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Rendering:** Puppeteer (headless Chrome with ANGLE/SwiftShader for WebGL)
- **3D Engine:** CesiumJS with Cesium Ion default global tileset
- **Output:** Numbered PNG frames (`frame_0001.png`, `frame_0002.png`, etc.)

## MCP Tools
1. **`generate_flyin`** - Main tool. Geocodes city, launches headless browser, animates camera from orbital altitude to city, captures frames.
2. **`list_presets`** - Returns preset cities with recommended camera angles.

## Key Technical Details
- Cesium Ion token stored in `.env` as `CESIUMION` (not `CESIUM_ION_TOKEN`)
- Puppeteer flags: `--use-gl=angle`, `--use-angle=swiftshader`, `--disable-web-security`
- Camera interpolation uses cubic ease-in-out for cinematic feel
- Each frame waits for `scene.globe.tilesLoaded` with 5s timeout
- Default: 1920x1080, 30fps, 6 seconds, 800km start -> 2km end altitude

## Commands
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript
- `npm run start` - Start MCP server
- `npm run dev` - Development mode

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
│   └── utils/
│       ├── geocode.ts         # City geocoding (lookup + Nominatim fallback)
│       └── easing.ts          # Easing functions
├── .env                       # CESIUMION token
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## Development Notes
- Keep dependencies minimal
- Get v1 working first, iterate from there
- Output designed for Remotion `<Img>` / `<Sequence>` components
