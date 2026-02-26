# Agent Integration

Instructions for connecting the CesiumJS Fly-In MCP server to AI agent clients.

## Prerequisites

- **Node.js** 18+
- **Cesium Ion token** - [Sign up free](https://ion.cesium.com/)

## Claude Code

```bash
claude mcp add cesiumjs-flyin -e CESIUMION=your_token -- npx -y cesiumjs-flyin-mcp
```

Or add it to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "cesiumjs-flyin": {
      "command": "npx",
      "args": ["-y", "cesiumjs-flyin-mcp"],
      "env": {
        "CESIUMION": "your_cesium_ion_token_here"
      }
    }
  }
}
```

## Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cesiumjs-flyin": {
      "command": "npx",
      "args": ["-y", "cesiumjs-flyin-mcp"],
      "env": {
        "CESIUMION": "your_cesium_ion_token_here"
      }
    }
  }
}
```

Config file locations:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CESIUMION` | Yes | Your Cesium Ion access token. Get one at [ion.cesium.com](https://ion.cesium.com/) |

The server reads from `.env` automatically via `dotenv`. When configuring via MCP client config, you can pass it in the `env` block instead.

## Example Tool Invocations

### List available presets

```
Use the list_presets tool to see cities with recommended camera angles.
```

### Generate a fly-in

```
Use generate_flyin with:
  city: "Chicago"
  outputDir: "./output/chicago"
  durationSeconds: 6
  easing: "cinematic"
```

### Generate with custom parameters

```
Use generate_flyin with:
  city: "Tokyo"
  outputDir: "./output/tokyo"
  width: 3840
  height: 2160
  fps: 60
  durationSeconds: 10
  startAltitude: 1000000
  endAltitude: 1500
  tiltAngle: 50
  heading: 45
  easing: "quintic"
```

## Recommended Workflow

1. **Explore presets** - Call `list_presets` to see cities with tuned camera angles
2. **Generate frames** - Call `generate_flyin` with your chosen city and parameters
3. **Render video** - Use the PNG sequence in Remotion, FFmpeg, or any video tool:
   ```bash
   # FFmpeg example
   ffmpeg -framerate 30 -i output/chicago/frame_%04d.png -c:v libx264 -pix_fmt yuv420p output.mp4
   ```
