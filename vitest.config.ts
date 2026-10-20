import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "src/test/server-only-stub.ts") } },
  test: { environment: "node", include: ["src/**/*.test.ts"], fileParallelism: false, env: { DATABASE_URL: "postgres://beauty:beauty@localhost:5432/beauty_test" } },
});
