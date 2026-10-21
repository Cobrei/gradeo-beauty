import { NextResponse } from "next/server";
import { getActor } from "@/modules/core/application/auth";
import { can } from "@/lib/context";
import { conversationTranscript, receptionistAvailable, receptionistReply } from "@/modules/marketing/application/receptionist";
import { DomainError } from "@/lib/errors";

export const maxDuration = 60;

/** Chat de teste dentro do sistema: a dona conversa com a recepcionista antes de ligar no link público. */
async function guard() {
  const actor = await getActor();
  if (!actor || !can(actor, "core.settings.manage")) return null;
  return actor;
}

export async function GET() {
  const actor = await guard();
  if (!actor) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  const messages = await conversationTranscript(actor.tenantId, "TEST", `teste-${actor.userId}`);
  return NextResponse.json({ enabled: receptionistAvailable(), messages: messages.map((m) => ({ role: m.role, text: m.text })) });
}

export async function POST(req: Request) {
  const actor = await guard();
  if (!actor) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  if (!receptionistAvailable()) return NextResponse.json({ error: "A recepcionista ainda não foi ativada (falta a chave de IA)." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  try {
    const r = await receptionistReply({ tenantId: actor.tenantId, channel: "TEST", externalId: `teste-${actor.userId}`, text });
    return NextResponse.json({ reply: r.reply, needsHuman: r.needsHuman });
  } catch (e) {
    if (!(e instanceof DomainError)) console.error("recepcionista-teste", e);
    return NextResponse.json({ error: e instanceof DomainError ? e.message : "Falha ao responder." }, { status: 500 });
  }
}
