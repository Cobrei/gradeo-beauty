import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Conexão única por processo (ADR-003). Em serverless, `max` baixo evita
 * esgotar conexões; em produção usar pooler (PgBouncer/Neon pooler).
 */
// Em migrações/seed (scripts) prefere a conexão direta (sem pooler), quando existir.
const direct = process.env.DB_DIRECT === "1" ? process.env.DATABASE_URL_UNPOOLED : undefined;
const url = direct ?? process.env.DATABASE_URL ?? "postgres://beauty:beauty@localhost:5432/beauty";

declare global {
  var __appSql: ReturnType<typeof postgres> | undefined;
}

const sql =
  globalThis.__appSql ??
  postgres(url, { max: process.env.NODE_ENV === "production" ? 5 : 10, prepare: false, idle_timeout: 20 });
if (process.env.NODE_ENV !== "production") globalThis.__appSql = sql;

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { sql as rawSql };
