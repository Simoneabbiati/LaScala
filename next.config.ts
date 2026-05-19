import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql", "docx"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "**.wikimedia.org" },
    ],
  },
};

export default nextConfig;
