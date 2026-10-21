import { NextResponse } from "next/server";
import { getPublicSalon } from "@/modules/core/application/settings";
import { conversationTranscript, receptionistAvailable, receptionistReply } from "@/modules/marketing/application/receptionist";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { DomainError } from "@/lib/errors";

export const maxDuration = 60;

const SESSION = /^[a-zA-Z0-9-]{16,64}$/;

async function salonFor(slug: string) {
  const salon = await getPublicSalon(slug);
  if (!salon || !salon.aiReceptionist || !receptionistAvailable()) return null;
  return salon;
}

/** Retoma a conversa do chat público (mesma sessão do navegador). */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await salonFor(slug);
  if (!salon) return NextResponse.json({ enabled: false });
  const sid = new URL(req.url).searchParams.get("s") ?? "";
  const messages = SESSION.test(sid) ? await conversationTranscript(salon.tenantId, "WEB", sid) : [];
  return NextResponse.json({ enabled: true, name: salon.aiName?.trim() || "Bia", messages: messages.map((m) => ({ role: m.role, text: m.text })) });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await salonFor(slug);
  if (!salon) return NextResponse.json({ error: "A recepcionista não está disponível." }, { status: 404 });
  let body: { s?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const sid = String(body.s ?? "");
  const text = String(body.text ?? "").trim();
  if (!SESSION.test(sid) || !text) return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  if (!(await withinLimit(`ai:ip:${await clientIp()}`, 60, 3600))) return NextResponse.json({ error: "Muitas mensagens. Tente de novo mais tarde." }, { status: 429 });
  try {
    const r = await receptionistReply({ tenantId: salon.tenantId, channel: "WEB", externalId: sid, text });
    return NextResponse.json({ reply: r.reply, needsHuman: r.needsHuman });
  } catch (e) {
    const msg = e instanceof DomainError ? e.message : "A recepcionista está indisponível agora. Fale com o salão pelo WhatsApp.";
    if (!(e instanceof DomainError)) console.error("recepcionista", e);
    return NextResponse.json({ error: msg }, { status: e instanceof DomainError && e.code === "RATE_LIMIT" ? 429 : 500 });
  }
}
