import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/video/thumbnail": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
