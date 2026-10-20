import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ADR-007: rotas leves; pacotes de servidor fora do bundle do cliente
  serverExternalPackages: ["postgres", "@node-rs/argon2"],
  experimental: { optimizePackageImports: [] },
};

export default nextConfig;
