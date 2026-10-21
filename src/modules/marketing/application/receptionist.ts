import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { assertCan, withTenant, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { aiConversations, aiMessages, salonSettings } from "@/db/schema";
import { z } from "zod";
import { getPublicSalonById } from "@/modules/core/application/settings";
import { publicBook, publicCatalog, publicSlots } from "@/modules/agenda/application/public-booking";
import { DomainError } from "@/lib/errors";
import { todayISO } from "@/lib/dates";
import { addDays, localTime } from "@/lib/time";
import { formatBRL, toCents } from "@/lib/money";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { withinLimit } from "@/lib/rate-limit";
import {
  TOOLS,
  buildSystemPrompt,
  textOf,
  trimHistory,
  type ModelBlock,
  type ModelMessage,
  type ModelResponse,
  type SalonContext,
} from "../domain/receptionist";

export type Channel = "WEB" | "WHATSAPP" | "TEST";
export type CallModel = (args: { system: string; messages: ModelMessage[]; tools: typeof TOOLS }) => Promise<ModelResponse>;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_TOOL_ROUNDS = 6;

export function receptionistAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Chamada real à API da Anthropic (sem SDK, para não pesar o bundle). */
export const anthropicCall: CallModel = async ({ system, messages, tools }) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new DomainError("AI_OFF", "Recepcionista sem chave de IA configurada.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system, messages, tools }),
    });
    if (!r.ok) {
      const body = await r.text();
      console.error("anthropic", r.status, body.slice(0, 500));
      throw new DomainError("AI_ERROR", "A recepcionista está indisponível agora.");
    }
    return (await r.json()) as ModelResponse;
  } finally {
    clearTimeout(timer);
  }
};

type Salon = NonNullable<Awaited<ReturnType<typeof getPublicSalonById>>>;

/** Executa uma ferramenta pedida pelo modelo. Só enxerga dados públicos do salão. */
async function runTool(
  salon: Salon,
  conv: { id: string; channel: Channel; clientPhone: string | null },
  name: string,
  input: Record<string, unknown>,
): Promise<{ result: string; isError?: boolean; patch?: Partial<typeof aiConversations.$inferInsert> }> {
  const s = (k: string) => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
  const catalog = await publicCatalog(salon.slug);
  const today = todayISO();

  if (name === "listar_servicos") {
    if (!catalog) return { result: "O agendamento online deste salão está desligado. Para agendar, chame chamar_humano." };
    const prosOf = (sid: string) =>
      catalog.professionals.filter((p) => !p.serviceIds.length || p.serviceIds.includes(sid)).map((p) => ({ id: p.id, nome: p.nickname || p.name }));
    const list = catalog.services.map((x) => ({
      id: x.id,
      nome: x.name,
      categoria: x.category,
      preco: formatBRL(toCents(x.price)),
      duracao_min: x.durationMin,
      descricao: x.description || undefined,
      profissionais: prosOf(x.id),
    }));
    return { result: JSON.stringify(list) };
  }

  if (name === "horarios_livres") {
    if (!catalog) return { result: "Agendamento online desligado.", isError: true };
    const svc = catalog.services.find((x) => x.id === s("servico_id"));
    if (!svc) return { result: "Serviço não encontrado. Chame listar_servicos para pegar o id certo.", isError: true };
    const date = s("data");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > addDays(today, 60)) return { result: "Data inválida: use AAAA-MM-DD entre hoje e os próximos 60 dias.", isError: true };
    const pros = catalog.professionals.filter((p) => (!p.serviceIds.length || p.serviceIds.includes(svc.id)) && (!s("profissional_id") || p.id === s("profissional_id")));
    if (!pros.length) return { result: "Nenhuma profissional faz esse serviço pelo agendamento online.", isError: true };
    const out = [];
    for (const p of pros.slice(0, 6)) {
      const slots = await publicSlots(salon.slug, date, p.id, svc.id);
      out.push({ profissional_id: p.id, profissional: p.nickname || p.name, horarios: slots.slice(0, 16) });
    }
    return { result: JSON.stringify({ data: date, servico: svc.name, livres: out }) };
  }

  if (name === "criar_pedido_agendamento") {
    if (!catalog) return { result: "Agendamento online desligado.", isError: true };
    const phone = normalizePhone(s("telefone") || conv.clientPhone || "");
    if (!phone || phone.length < 10) return { result: "Telefone inválido: peça o celular com DDD.", isError: true };
    const nome = s("nome");
    if (nome.length < 2) return { result: "Peça o nome da cliente.", isError: true };
    try {
      const r = await publicBook(salon.slug, {
        serviceId: s("servico_id"),
        professionalId: s("profissional_id"),
        date: s("data"),
        time: s("hora"),
        name: nome,
        phone,
        notes: ["Pedido feito pela recepcionista virtual", s("observacao")].filter(Boolean).join(" · "),
      });
      return {
        result: JSON.stringify({ ok: true, aviso: "Pedido registrado. O salão confirma pelo WhatsApp. Não diga que está confirmado." }),
        patch: { appointmentId: r.id, clientName: nome.slice(0, 120), clientPhone: phone },
      };
    } catch (e) {
      const msg = e instanceof DomainError ? e.message : "Não foi possível registrar.";
      return { result: `Erro: ${msg} Ofereça outros horários (chame horarios_livres de novo).`, isError: true };
    }
  }

  if (name === "chamar_humano") {
    const motivo = s("motivo").slice(0, 500) || "Cliente pediu atendimento";
    return {
      result: JSON.stringify({ ok: true, aviso: conv.channel === "WHATSAPP" ? "A equipe vai responder por aqui." : "Peça nome e celular (se ainda não tiver) para a equipe chamar no WhatsApp." }),
      patch: { needsHuman: true, humanReason: motivo, ...(conv.channel === "WHATSAPP" ? { status: "HUMAN" } : {}) },
    };
  }

  return { result: "Ferramenta desconhecida.", isError: true };
}

export type ReplyInput = {
  tenantId: string;
  channel: Channel;
  externalId: string; // sessão web ou telefone do WhatsApp
  text: string;
  clientPhone?: string | null;
  clientName?: string | null;
};

export type ReplyOutput = { conversationId: string; reply: string | null; needsHuman: boolean };

/**
 * Responde uma mensagem da cliente. Guarda tudo na conversa.
 * No WhatsApp, quando a equipe assumiu (status HUMAN), a IA fica calada (reply = null).
 */
export async function receptionistReply(input: ReplyInput, callModel: CallModel = anthropicCall): Promise<ReplyOutput> {
  const text = input.text.trim().slice(0, 1200);
  if (!text) throw new DomainError("VALIDATION", "Mensagem vazia.");
  const salon = await getPublicSalonById(input.tenantId);
  if (!salon) throw new DomainError("NOT_FOUND", "Salão não encontrado.");
  if (!salon.aiReceptionist && input.channel !== "TEST") throw new DomainError("AI_OFF", "A recepcionista deste salão está desligada.");

  // limites: protege o custo do salão e da gradeo
  if (!(await withinLimit(`ai:tenant:${input.tenantId}`, 600, 86400))) throw new DomainError("RATE_LIMIT", "Muitas mensagens hoje. Fale com o salão pelo WhatsApp.");
  if (!(await withinLimit(`ai:conv:${input.tenantId}:${input.channel}:${input.externalId}`, 40, 86400)))
    throw new DomainError("RATE_LIMIT", "Limite de mensagens desta conversa por hoje. O salão vai te responder pelo WhatsApp.");

  const phone = normalizePhone(input.clientPhone ?? "") || null;

  // pega ou cria a conversa e grava a mensagem da cliente
  const { conv, history } = await withTenant(input.tenantId, async (tx) => {
    let [c] = await tx
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.channel, input.channel), eq(aiConversations.externalId, input.externalId)))
      .limit(1);
    if (!c) {
      [c] = await tx
        .insert(aiConversations)
        .values({ tenantId: input.tenantId, channel: input.channel, externalId: input.externalId, clientPhone: phone, clientName: input.clientName?.slice(0, 120) || null })
        .returning();
    }
    const rows = await tx
      .select({ role: aiMessages.role, raw: aiMessages.raw, text: aiMessages.text })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, c.id))
      .orderBy(desc(aiMessages.createdAt))
      .limit(30);
    await tx.insert(aiMessages).values({ tenantId: input.tenantId, conversationId: c.id, role: "user", text, raw: { role: "user", content: text } });
    await tx
      .update(aiConversations)
      .set({ messageCount: sql`${aiConversations.messageCount} + 1`, lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(aiConversations.id, c.id));
    const hist: ModelMessage[] = rows.reverse().map((r) => (r.raw as ModelMessage) ?? { role: r.role === "assistant" ? "assistant" : "user", content: r.text });
    return { conv: c, history: hist };
  });

  if (input.channel === "WHATSAPP" && conv.status === "HUMAN") {
    // a equipe assumiu; depois de 12 h sem mexer, a IA volta a atender
    if (Date.now() - new Date(conv.updatedAt).getTime() < 12 * 3600_000) return { conversationId: conv.id, reply: null, needsHuman: true };
    await withTenant(input.tenantId, (tx) => tx.update(aiConversations).set({ status: "OPEN" }).where(eq(aiConversations.id, conv.id)));
  }

  const ctx: SalonContext = {
    salonName: salon.salonName,
    aiName: salon.aiName?.trim() || "Bia",
    today: todayISO(),
    nowTime: localTime(new Date()),
    address: (salon.addressJson as { text?: string } | null)?.text ?? null,
    instagram: salon.instagram,
    whatsapp: salon.whatsapp ? formatPhone(salon.whatsapp) : null,
    openingHours: salon.openingHours ?? {},
    instructions: salon.aiInstructions,
    channel: input.channel,
    knownPhone: phone ? formatPhone(phone) : conv.clientPhone ? formatPhone(conv.clientPhone) : null,
    knownName: conv.clientName || input.clientName || null,
  };
  const system = buildSystemPrompt(ctx);
  const messages: ModelMessage[] = trimHistory([...history, { role: "user", content: text }]);
  const toStore: { role: string; text: string; raw: ModelMessage }[] = [];
  let patch: Partial<typeof aiConversations.$inferInsert> = {};
  let tokensIn = 0;
  let tokensOut = 0;
  let reply = "";

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await callModel({ system, messages, tools: TOOLS });
    tokensIn += res.usage?.input_tokens ?? 0;
    tokensOut += res.usage?.output_tokens ?? 0;
    const assistantMsg: ModelMessage = { role: "assistant", content: res.content };
    messages.push(assistantMsg);
    toStore.push({ role: "assistant", text: textOf(res.content), raw: assistantMsg });
    const uses = res.content.filter((b): b is Extract<ModelBlock, { type: "tool_use" }> => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length || round === MAX_TOOL_ROUNDS) {
      reply = textOf(res.content);
      // nunca deixa um pedido de ferramenta sem resposta no histórico (a próxima chamada falharia)
      if (uses.length) toStore[toStore.length - 1].raw = { role: "assistant", content: [{ type: "text", text: reply || "…" }] };
      break;
    }
    const results: ModelBlock[] = [];
    for (const u of uses) {
      const r = await runTool(salon, { id: conv.id, channel: input.channel, clientPhone: phone ?? conv.clientPhone }, u.name, u.input ?? {});
      if (r.patch) patch = { ...patch, ...r.patch };
      results.push({ type: "tool_result", tool_use_id: u.id, content: r.result, ...(r.isError ? { is_error: true } : {}) });
    }
    const toolMsg: ModelMessage = { role: "user", content: results };
    messages.push(toolMsg);
    toStore.push({ role: "tool", text: "", raw: toolMsg });
  }

  if (!reply) reply = "Desculpe, não consegui responder agora. A equipe do salão vai te chamar em breve. 💕";

  await withTenant(input.tenantId, async (tx) => {
    for (const m of toStore) await tx.insert(aiMessages).values({ tenantId: input.tenantId, conversationId: conv.id, role: m.role, text: m.text, raw: m.raw });
    await tx
      .update(aiConversations)
      .set({
        ...patch,
        tokensIn: sql`${aiConversations.tokensIn} + ${tokensIn}`,
        tokensOut: sql`${aiConversations.tokensOut} + ${tokensOut}`,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, conv.id));
  });

  return { conversationId: conv.id, reply, needsHuman: Boolean(patch.needsHuman ?? conv.needsHuman) };
}

/** Mensagens visíveis de uma conversa (para o chat público retomar). */
export async function conversationTranscript(tenantId: string, channel: Channel, externalId: string) {
  return withTenant(tenantId, async (tx) => {
    const [c] = await tx
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(and(eq(aiConversations.channel, channel), eq(aiConversations.externalId, externalId)))
      .limit(1);
    if (!c) return [];
    const rows = await tx
      .select({ role: aiMessages.role, text: aiMessages.text, at: aiMessages.createdAt })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, c.id))
      .orderBy(asc(aiMessages.createdAt));
    return rows.filter((r) => r.role !== "tool" && r.text.trim());
  });
}

// ——— Área do salão ———


export async function receptionistSettings(actor: Actor) {
  assertCan(actor, "core.settings.manage");
  return withTenantRead(actor, async (tx) => {
    const [s] = await tx
      .select({ on: salonSettings.aiReceptionist, name: salonSettings.aiName, instructions: salonSettings.aiInstructions, slug: salonSettings.slug, onlineBooking: salonSettings.onlineBooking })
      .from(salonSettings)
      .limit(1);
    return s;
  });
}

const settingsInput = z.object({
  on: z.boolean(),
  name: z.string().trim().max(40).optional(),
  instructions: z.string().trim().max(3000).optional(),
});

export async function saveReceptionistSettings(actor: Actor, raw: unknown) {
  assertCan(actor, "core.settings.manage");
  const i = settingsInput.parse(raw);
  if (i.on && !receptionistAvailable()) throw new DomainError("AI_OFF", "A recepcionista ainda não foi ativada pela gradeo. Fale com o suporte.");
  await withTenantTx(actor, (tx, ctx) =>
    tx
      .update(salonSettings)
      .set({ aiReceptionist: i.on, aiName: i.name || null, aiInstructions: i.instructions || null, ...ctx.stampUpdate() })
      .where(eq(salonSettings.tenantId, actor.tenantId)),
  );
}

export async function listConversations(actor: Actor, opts: { onlyHuman?: boolean } = {}) {
  assertCan(actor, "core.settings.manage");
  return withTenantRead(actor, (tx) =>
    tx
      .select()
      .from(aiConversations)
      .where(opts.onlyHuman ? eq(aiConversations.needsHuman, true) : sql`${aiConversations.channel} <> 'TEST'`)
      .orderBy(desc(aiConversations.lastMessageAt))
      .limit(100),
  );
}

export async function conversationDetail(actor: Actor, id: string) {
  assertCan(actor, "core.settings.manage");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return withTenantRead(actor, async (tx) => {
    const [c] = await tx.select().from(aiConversations).where(eq(aiConversations.id, id)).limit(1);
    if (!c) return null;
    const msgs = await tx
      .select({ role: aiMessages.role, text: aiMessages.text, at: aiMessages.createdAt })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, id))
      .orderBy(asc(aiMessages.createdAt));
    return { conv: c, messages: msgs.filter((m) => m.role !== "tool" && m.text.trim()) };
  });
}

/** A equipe resolveu: tira o alerta e devolve a conversa para a IA. */
export async function resolveConversation(actor: Actor, id: string) {
  assertCan(actor, "core.settings.manage");
  await withTenantTx(actor, (tx, ctx) =>
    tx.update(aiConversations).set({ needsHuman: false, status: "OPEN", ...ctx.stampUpdate() }).where(eq(aiConversations.id, id)),
  );
}

export async function pendingHumanCount(actor: Actor): Promise<number> {
  return withTenantRead(actor, async (tx) => {
    const [r] = await tx.select({ n: sql<number>`count(*)::int` }).from(aiConversations).where(eq(aiConversations.needsHuman, true));
    return r?.n ?? 0;
  });
}

/** A equipe assumiu a conversa no WhatsApp: a IA fica calada nessa conversa. */
export async function markWhatsappHuman(tenantId: string, phone: string) {
  await withTenant(tenantId, (tx) =>
    tx
      .update(aiConversations)
      .set({ status: "HUMAN", updatedAt: new Date() })
      .where(and(eq(aiConversations.channel, "WHATSAPP"), eq(aiConversations.externalId, phone))),
  );
}
