import { NextResponse } from "next/server";
import { runAutomationsForAll } from "@/modules/marketing/application/automations";
import { purgeRateLimits } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Cron da Vercel (vercel.json) ou chamada manual com o segredo. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  // Falha fechado: sem CRON_SECRET configurado, ninguém dispara a rotina por aqui.
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runAutomationsForAll();
  await purgeRateLimits().catch(() => undefined);
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), result });
}
