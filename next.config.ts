import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/roadmap",
  images: { unoptimized: true },
};

export default nextConfig;
