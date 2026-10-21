import { NextResponse, after } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { salonSettings } from "@/db/schema";
import { sendText } from "@/modules/marketing/infrastructure/evolution";
import { markWhatsappHuman, receptionistAvailable, receptionistReply } from "@/modules/marketing/application/receptionist";
import { withinLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

type Upsert = {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    pushName?: string;
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
  };
};

/** Marca ids que nós mesmos enviamos, para diferenciar da equipe respondendo pelo celular. */
async function rememberSent(id: string) {
  await withinLimit(`wa:sent:${id}`, 1, 86400 * 2);
}
async function wasSentByUs(id: string): Promise<boolean> {
  const rows = (await db.execute(sql`select 1 from core_rate_limits where key = ${`wa:sent:${id}`} limit 1`)) as unknown as unknown[];
  return rows.length > 0;
}

/** Mensagens que chegam no WhatsApp do salão (Evolution API). Responde rápido e processa depois. */
export async function POST(req: Request) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret || new URL(req.url).searchParams.get("t") !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Upsert;
  const ev = (body.event ?? "").toLowerCase().replace(/_/g, ".");
  const d = body.data;
  const jid = d?.key?.remoteJid ?? "";
  const text = (d?.message?.conversation ?? d?.message?.extendedTextMessage?.text ?? "").trim();
  if (ev !== "messages.upsert" || !body.instance || !jid.endsWith("@s.whatsapp.net") || !d?.key?.id) return NextResponse.json({ ok: true, ignored: true });

  const instance = body.instance;
  const msgId = d.key.id;
  const fromMe = Boolean(d.key.fromMe);
  const number = jid.split("@")[0];
  const phone = number.replace(/^55/, "");

  after(async () => {
    try {
      const [s] = await db
        .select({ tenantId: salonSettings.tenantId, on: salonSettings.aiReceptionist })
        .from(salonSettings)
        .where(eq(salonSettings.waQrInstance, instance))
        .limit(1);
      if (!s?.on || !receptionistAvailable()) return;
      if (fromMe) {
        // a equipe respondeu pelo celular: a IA sai da conversa (volta sozinha depois de 12 h ou no "Resolvido")
        if (!(await wasSentByUs(msgId))) await markWhatsappHuman(s.tenantId, phone);
        return;
      }
      if (!text) return;
      if (!(await withinLimit(`wa:in:${msgId}`, 1, 86400))) return; // reentrega do mesmo evento
      const r = await receptionistReply({ tenantId: s.tenantId, channel: "WHATSAPP", externalId: phone, text, clientPhone: phone, clientName: d.pushName ?? null });
      if (r.reply) {
        const sent = await sendText(instance, number, r.reply);
        if (sent.id) await rememberSent(sent.id);
      }
    } catch (e) {
      console.error("wa-webhook", e);
    }
  });
  return NextResponse.json({ ok: true });
}
