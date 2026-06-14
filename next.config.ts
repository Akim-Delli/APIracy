import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "ffmpeg-static"],
  // Vercel's file tracing misses sharp's native binaries (@img/sharp-linux-x64 +
  // @img/sharp-libvips-linux-x64, which ships libvips-cpp.so) and the ffmpeg
  // binary, so force them into the serverless function bundles.
  outputFileTracingIncludes: {
    "/api/process": ["./node_modules/@img/**/*"],
    "/api/video/thumbnail": [
      "./node_modules/@img/**/*",
      "./node_modules/ffmpeg-static/ffmpeg",
    ],
  },
};

export default nextConfig;
