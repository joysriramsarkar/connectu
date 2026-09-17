import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors must be fixed before building.
  // Previously set to `true` which allowed broken code to be deployed.
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint errors must be fixed before building.
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        // Google profile photos (used by Firebase Auth / Google OAuth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
