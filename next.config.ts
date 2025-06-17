import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: ['192.168.4.26:3000', 'https://192.168.4.26:3000']
  }
};

export default nextConfig;
