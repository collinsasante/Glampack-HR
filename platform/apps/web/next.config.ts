import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces and copies only the files actually needed at runtime into .next/standalone —
  // a much leaner production Docker image than shipping the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
