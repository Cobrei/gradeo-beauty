import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/** IP de quem fez a requisição (atrás da Vercel vem em x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/**
 * Conta uma tentativa e diz se ainda está dentro do limite.
 * Janela fixa no Postgres: funciona em serverless, sem serviço extra.
 */
export async function withinLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  try {
    const rows = (await db.execute(
      sql`insert into core_rate_limits (key, bucket, hits) values (${key}, ${bucket}, 1)
          on conflict (key, bucket) do update set hits = core_rate_limits.hits + 1
          returning hits`,
    )) as unknown as { hits: number }[];
    return Number(rows[0]?.hits ?? 1) <= max;
  } catch (e) {
    console.error("rate-limit", e);
    return true; // nunca derruba o login por falha do limitador
  }
}

/** Limpeza das janelas antigas (rotina diária). */
export async function purgeRateLimits() {
  await db.execute(sql`delete from core_rate_limits where at < now() - interval '2 days'`);
}

export const LIMIT_MSG = "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
