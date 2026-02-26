#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateFlyIn } from "./tools/generate-flyin.js";
import { PRESETS } from "./tools/list-presets.js";

const cesiumToken = process.env.CESIUMION;
if (!cesiumToken) {
  console.error("CESIUMION environment variable is required");
  process.exit(1);
}

const server = new McpServer({
  name: "cesiumjs-flyin",
  version: "1.0.0",
});

// Register list_presets tool
server.tool(
  "list_presets",
  "Returns preset cities with recommended camera angles for fly-in animations",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(PRESETS, null, 2),
        },
      ],
    };
  }
);

// Register generate_flyin tool
server.tool(
  "generate_flyin",
  "Generate a Google Earth Studio-style fly-in animation for a city. Outputs numbered PNG frames (frame_0001.png, frame_0002.png, ...) to the specified directory. To turn the frames into a video, use Remotion (recommended for React-based pipelines) or FFmpeg (e.g. `ffmpeg -framerate 30 -i frames/frame_%04d.png -c:v libx264 -pix_fmt yuv420p output.mp4`).",
  {
    city: z.string().describe("City name to fly into (e.g. 'Chicago', 'Tokyo')"),
    outputDir: z.string().describe("Directory path to save the PNG frame sequence"),
    width: z.number().default(1920).describe("Frame width in pixels (default: 1920)"),
    height: z.number().default(1080).describe("Frame height in pixels (default: 1080)"),
    fps: z.number().default(30).describe("Frames per second (default: 30)"),
    durationSeconds: z.number().default(6).describe("Animation duration in seconds (default: 6)"),
    startAltitude: z.number().default(800000).describe("Starting altitude in meters (default: 800000 = 800km)"),
    endAltitude: z.number().default(2000).describe("Ending altitude in meters (default: 2000 = 2km)"),
    tiltAngle: z.number().default(45).describe("Final camera tilt angle in degrees (default: 45)"),
    heading: z.number().default(0).describe("Camera heading/bearing in degrees (default: 0 = north)"),
    easing: z.enum(["cinematic", "cubic", "quintic", "linear"]).default("cinematic").describe("Easing profile: 'cinematic' (fast descent + long settle, best for audio sync), 'quintic' (strong symmetric ease), 'cubic' (gentle symmetric ease), 'linear'"),
  },
  async (params) => {
    try {
      const result = await generateFlyIn({
        ...params,
        cesiumToken: cesiumToken!,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
