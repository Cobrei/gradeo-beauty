// Build na Vercel: aplica migrações e o seed de demonstração antes do `next build`.
// Sem DATABASE_URL (primeiro deploy, antes de conectar o banco) só compila e avisa.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });

if (process.env.DATABASE_URL) {
  // RESET_DEMO=1 num deploy único recria a escola de demonstração do zero.
  if (process.env.RESET_DEMO === "1") run("node scripts/reset-demo.mjs");
  run("npm run db:migrate");
  // Permissões novas do código chegam às escolas que já existem.
  run("npm run db:sync-roles");
  if (process.env.SEED_DEMO !== "false") run("npm run db:seed");
} else {
  console.warn("\n[gradeo] DATABASE_URL ausente: pulando migrações e seed. Conecte o banco (Storage → Neon) e faça Redeploy.\n");
}
run("npx next build");
