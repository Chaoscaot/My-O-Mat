import type { NextConfig } from "next"

const convexImageHost = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new URL(process.env.NEXT_PUBLIC_CONVEX_URL).hostname
  : "**.convex.cloud"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: convexImageHost,
        port: "",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
