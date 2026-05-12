import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // for testing
      },
      // {
      //   protocol: "https",
      //   hostname: "lh3.googleusercontent.com",
      //   pathname: "/a/**",
      // },
      // {
      //   protocol: "https",
      //   hostname: "*.fbcdn.net",
      // },
      // {
      //   protocol: "https",
      //   hostname: "graph.facebook.com",
      // },
    ],
  },
};

export default nextConfig;
