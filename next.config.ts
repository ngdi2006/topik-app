import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow isolated verification without touching a running development server's cache.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.vietqr.io',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'ydrzamsfwvdwpxgqhtly.supabase.co',
      },
    ],
  },
};

export default nextConfig;
