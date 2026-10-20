import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ADR-007: rotas leves; pacotes de servidor fora do bundle do cliente
  serverExternalPackages: ["postgres", "@node-rs/argon2"],
  // importação de clientes por planilha: até 4 MB (limite da Vercel é 4,5 MB)
  experimental: { optimizePackageImports: [], serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
