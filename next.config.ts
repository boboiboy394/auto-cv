import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server components to use these native/Node packages
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
