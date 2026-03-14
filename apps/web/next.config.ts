import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        hostname: "**.convex.cloud",
        pathname: "/**",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
