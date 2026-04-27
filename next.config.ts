import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : [];
      config.externals = [...existing, "@sparticuz/chromium", "playwright-core"];
    }
    return config;
  },
};

export default nextConfig;
