// Teste de integração da recepcionista com um "modelo" roteirizado (sem rede).
// Roda só com AI_IT=1 contra o banco de desenvolvimento (precisa do salão demo).
import { describe, expect, it } from "vitest";
import type { ModelBlock, ModelMessage, ModelResponse } from "../domain/receptionist";

const RUN = process.env.AI_IT === "1";

function lastToolResult(messages: ModelMessage[]): string {
  const m = messages[messages.length - 1];
  if (Array.isArray(m.content)) {
    const b = m.content.find((x) => x.type === "tool_result") as Extract<ModelBlock, { type: "tool_result" }> | undefined;
    return b?.content ?? "";
  }
  return "";
}

/** Garante a regra da API: todo tool_use tem tool_result logo depois, e começa pela cliente. */
function assertValidHistory(messages: ModelMessage[]) {
  expect(messages[0].role).toBe("user");
  messages.forEach((m, i) => {
    if (m.role === "assistant" && Array.isArray(m.content)) {
      const ids = m.content.filter((b) => b.type === "tool_use").map((b) => (b as { id: string }).id);
      if (ids.length) {
        const next = messages[i + 1];
        expect(next?.role).toBe("user");
        const got = Array.isArray(next.content) ? next.content.filter((b) => b.type === "tool_result").map((b) => (b as { tool_use_id: string }).tool_use_id) : [];
        expect(got.sort()).toEqual(ids.sort());
      }
    }
  });
}

describe.skipIf(!RUN)("recepcionista (integração)", () => {
  it("lista serviços, acha horário, cria pedido e mantém histórico válido", async () => {
    process.env.DATABASE_URL = "postgres://beauty:beauty@localhost:5432/beauty";
    const { db } = await import("@/db/client");
    const { users, salonSettings, appointments, aiConversations } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { receptionistReply } = await import("./receptionist");
    const { addDays } = await import("@/lib/time");
    const { todayISO } = await import("@/lib/dates");

    const [u] = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.email, "dona@salao.demo")).limit(1);
    const tenantId = u.tenantId;
    await db.update(salonSettings).set({ aiReceptionist: true, onlineBooking: true }).where(eq(salonSettings.tenantId, tenantId));
    await db.execute((await import("drizzle-orm")).sql`delete from core_rate_limits where key like 'ai:%'`);

    let calls = 0;
    let svc = "";
    let pro = "";
    let date = "";
    let time = "";
    const seen: ModelMessage[][] = [];
    const fake = async ({ messages }: { messages: ModelMessage[] }): Promise<ModelResponse> => {
      seen.push(JSON.parse(JSON.stringify(messages)));
      calls++;
      const usage = { input_tokens: 100, output_tokens: 20 };
      if (calls === 1) return { stop_reason: "tool_use", usage, content: [{ type: "text", text: "Vou ver os serviços." }, { type: "tool_use", id: "t1", name: "listar_servicos", input: {} }] };
      if (calls === 2) {
        const list = JSON.parse(lastToolResult(messages)) as { id: string; profissionais: { id: string }[] }[];
        const first = list.find((x) => x.profissionais.length)!;
        svc = first.id;
        pro = first.profissionais[0].id;
        // procura um dia com horário (até 10 dias)
        date = addDays(todayISO(), 1);
        return { stop_reason: "tool_use", usage, content: [{ type: "tool_use", id: "t2", name: "horarios_livres", input: { servico_id: svc, data: date, profissional_id: pro } }] };
      }
      if (calls === 3) {
        const r = JSON.parse(lastToolResult(messages)) as { livres: { horarios: string[] }[] };
        time = r.livres[0]?.horarios[0] ?? "";
        expect(time).toMatch(/^\d{2}:\d{2}$/);
        return { stop_reason: "end_turn", usage, content: [{ type: "text", text: `Tenho ${time}. Confirma?` }] };
      }
      if (calls === 4) {
        return {
          stop_reason: "tool_use",
          usage,
          content: [{ type: "tool_use", id: "t3", name: "criar_pedido_agendamento", input: { servico_id: svc, profissional_id: pro, data: date, hora: time, nome: "Cliente Teste IA", telefone: "51988887777" } }],
        };
      }
      if (calls === 5) {
        expect(lastToolResult(messages)).toContain('"ok":true');
        return { stop_reason: "end_turn", usage, content: [{ type: "text", text: "Pedido enviado! O salão confirma pelo WhatsApp." }] };
      }
      return { stop_reason: "end_turn", usage, content: [{ type: "text", text: "ok" }] };
    };

    const sid = `it-${Date.now()}-abcdefgh`;
    const r1 = await receptionistReply({ tenantId, channel: "WEB", externalId: sid, text: "quero agendar amanhã" }, fake);
    expect(r1.reply).toContain("Confirma");
    const r2 = await receptionistReply({ tenantId, channel: "WEB", externalId: sid, text: "sim, Cliente Teste IA, 51988887777" }, fake);
    expect(r2.reply).toContain("Pedido enviado");

    // a 4ª chamada recebeu o histórico salvo da 1ª mensagem: precisa ser válido para a API
    assertValidHistory(seen[3]);
    assertValidHistory(seen[4]);

    const [conv] = await db.select().from(aiConversations).where(eq(aiConversations.externalId, sid)).limit(1);
    expect(conv.appointmentId).toBeTruthy();
    expect(conv.clientName).toBe("Cliente Teste IA");
    expect(conv.tokensIn).toBe(500);
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, conv.appointmentId!)).limit(1);
    expect(appt.source).toBe("ONLINE");
    expect(appt.notes ?? "").toContain("recepcionista virtual");

    // limpeza: recusa o pedido de teste
    await db.update(appointments).set({ deletedAt: new Date() }).where(eq(appointments.id, appt.id));
  }, 60_000);

  it("chamar_humano marca a conversa e, no WhatsApp, cala a IA", async () => {
    process.env.DATABASE_URL = "postgres://beauty:beauty@localhost:5432/beauty";
    const { db } = await import("@/db/client");
    const { users, aiConversations } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { receptionistReply } = await import("./receptionist");
    const [u] = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.email, "dona@salao.demo")).limit(1);
    let n = 0;
    const fake = async (): Promise<ModelResponse> => {
      n++;
      if (n === 1) return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "h1", name: "chamar_humano", input: { motivo: "quer cancelar" } }] };
      return { stop_reason: "end_turn", content: [{ type: "text", text: "A equipe já vai te responder." }] };
    };
    const phone = `5199${String(Date.now()).slice(-7)}`;
    const r = await receptionistReply({ tenantId: u.tenantId, channel: "WHATSAPP", externalId: phone, text: "quero cancelar", clientPhone: phone }, fake);
    expect(r.needsHuman).toBe(true);
    const [c] = await db.select().from(aiConversations).where(eq(aiConversations.externalId, phone)).limit(1);
    expect(c.status).toBe("HUMAN");
    expect(c.humanReason).toBe("quer cancelar");
    const again = await receptionistReply({ tenantId: u.tenantId, channel: "WHATSAPP", externalId: phone, text: "oi?", clientPhone: phone }, fake);
    expect(again.reply).toBeNull();
    expect(n).toBe(2); // não chamou o modelo de novo
  }, 60_000);
});
