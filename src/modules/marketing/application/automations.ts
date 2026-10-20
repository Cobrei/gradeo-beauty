import { appUrl } from "@/lib/app-url";
import "server-only";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, automations, clients, messages, professionals, salonSettings, services, tenants, vouchers } from "@/db/schema";
import { withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { todayISO } from "@/lib/dates";
import { systemActor } from "@/lib/system-actor";
import { addDays, dateToLocal, dayRange } from "@/lib/time";
import { formatBRDate, renderTemplate, voucherCode, voucherLabel } from "../domain/templates";
import { humanPause, pastDeadline, providerFor, QR_BATCH, setSendDeadline, type SalonWa } from "../infrastructure/provider";

interface Ctx { actor: Actor; salonName: string; slug: string; reviewUrl: string | null; providerKind: string; wa: SalonWa; sent: number }

async function enqueue(ctx: Ctx, kind: string, clientId: string, to: string, body: string, extra: { appointmentId?: string; voucherId?: string | null } = {}) {
  const provider = providerFor(ctx.providerKind, ctx.wa);
  const id = await withTenantTx(ctx.actor, async (tx, t) => {
    const [m] = await tx.insert(messages).values({ ...t.stampCreate(), automationKind: kind, clientId, appointmentId: extra.appointmentId ?? null, channel: "WHATSAPP", to, body, voucherId: extra.voucherId ?? null }).returning({ id: messages.id });
    return m.id;
  });
  if (provider.kind === "MANUAL") return;
  // QR code: envia aos poucos, com pausa; o que passar do lote fica na fila para a próxima rodada
  if (provider.kind === "WA_QR") {
    if (ctx.sent >= QR_BATCH || pastDeadline()) return;
    if (ctx.sent > 0) await humanPause();
  }
  ctx.sent++;
  const r = await provider.send(to, body);
  await withTenantTx(ctx.actor, (tx) => tx.update(messages).set(r.ok ? { status: "SENT", sentAt: new Date(), providerId: r.providerId ?? null } : { status: "FAILED", error: r.error?.slice(0, 255) ?? "erro" }).where(eq(messages.id, id)));
}

/**
 * Envia automaticamente o que ficou na fila (automações, sem campanha) quando o salão tem WhatsApp
 * conectado. No QR code vai em lotes pequenos com pausa entre mensagens.
 */
export async function flushAutomationQueue(actor: Actor, already = 0): Promise<{ sent: number; failed: number; remaining: number }> {
  const [s] = await db.select().from(salonSettings).where(eq(salonSettings.tenantId, actor.tenantId)).limit(1);
  if (!s) return { sent: 0, failed: 0, remaining: 0 };
  const provider = providerFor(s.messageProvider, s);
  if (provider.kind === "MANUAL") return { sent: 0, failed: 0, remaining: 0 };
  const cap = Math.max(0, (provider.kind === "WA_QR" ? QR_BATCH : 40) - already);
  const queued = cap ? await withTenantRead(actor, (tx) => tx.select().from(messages).where(and(eq(messages.status, "QUEUED"), isNull(messages.campaignId))).orderBy(asc(messages.createdAt)).limit(cap)) : [];
  let sent = 0;
  let failed = 0;
  for (const [i, m] of queued.entries()) {
    if (pastDeadline()) break;
    if (provider.kind === "WA_QR" && (i > 0 || already > 0)) await humanPause();
    const r = await provider.send(m.to, m.body);
    await withTenantTx(actor, (tx) => tx.update(messages).set(r.ok ? { status: "SENT", sentAt: new Date(), providerId: r.providerId ?? null } : { status: "FAILED", error: r.error?.slice(0, 255) ?? "erro" }).where(eq(messages.id, m.id)));
    if (r.ok) sent++;
    else failed++;
  }
  const remaining = await withTenantRead(actor, async (tx) => {
    const [r] = await tx.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.status, "QUEUED"), isNull(messages.campaignId)));
    return r.n;
  });
  return { sent, failed, remaining };
}

/** Roda todas as automações ativas de um salão. Idempotente: marca o que já mandou. */
export async function runAutomationsForTenant(tenantId: string): Promise<Record<string, number>> {
  const actor = systemActor(tenantId, "automações");
  const out: Record<string, number> = {};
  const [s] = await db.select().from(salonSettings).where(eq(salonSettings.tenantId, tenantId)).limit(1);
  const [t] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!s || !t) return out;
  const ctx: Ctx = { actor, salonName: t.name, slug: s.slug, reviewUrl: s.reviewUrl, providerKind: s.messageProvider, wa: s, sent: 0 };
  const rules = await withTenantRead(actor, (tx) => tx.select().from(automations).where(eq(automations.enabled, true)));
  // A pesquisa de satisfação substitui o agradecimento simples (as duas usam o mesmo marcador e não duplicam)
  const surveyOn = rules.some((r) => r.kind === "SURVEY");
  rules.sort((a, b) => Number(b.kind === "SURVEY") - Number(a.kind === "SURVEY"));
  const now = new Date();
  const today = todayISO();
  const link = appUrl(`/agendar/${s.slug}`);

  for (const rule of rules) {
    let n = 0;
    if (rule.kind === "REMINDER_24H") {
      // A rotina roda uma vez por dia (8h): avisa todos os horários de agora até o fim de amanhã
      // que ainda não receberam lembrete. Rodar mais vezes não duplica (reminderSentAt).
      const from = new Date(now.getTime() + 60 * 60000);
      const to = dayRange(addDays(today, 1)).end;
      const rows = await withTenantRead(actor, (tx) =>
        tx
          .select({ id: appointments.id, token: appointments.publicToken, startsAt: appointments.startsAt, clientId: appointments.clientId, phone: clients.phone, name: clients.fullName, service: services.name, pro: professionals.name })
          .from(appointments)
          .innerJoin(clients, eq(clients.id, appointments.clientId))
          .innerJoin(services, eq(services.id, appointments.serviceId))
          .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
          .where(and(isNull(appointments.deletedAt), inArray(appointments.status, ["SCHEDULED", "CONFIRMED"]), gte(appointments.startsAt, from), lte(appointments.startsAt, to), isNull(appointments.reminderSentAt), isNotNull(clients.phone))),
      );
      for (const r of rows) {
        const l = dateToLocal(r.startsAt);
        await enqueue(ctx, rule.kind, r.clientId!, r.phone!, renderTemplate(rule.template, { nome: r.name, salao: ctx.salonName, hora: l.time, data: formatBRDate(l.date), servico: r.service, profissional: r.pro, link, confirmar: appUrl(`/h/${r.token}`) }), { appointmentId: r.id });
        await withTenantTx(actor, (tx) => tx.update(appointments).set({ reminderSentAt: now }).where(eq(appointments.id, r.id)));
        n++;
      }
    }
    if (rule.kind === "THANKS" || rule.kind === "SURVEY") {
      if (rule.kind === "THANKS" && surveyOn) {
        out[rule.kind] = 0;
        continue;
      }
      const hours = Number(rule.settings.hoursAfter ?? 2);
      const before = new Date(now.getTime() - hours * 3600000);
      const floor = new Date(now.getTime() - 48 * 3600000);
      const rows = await withTenantRead(actor, (tx) =>
        tx
          .select({ id: appointments.id, token: appointments.publicToken, clientId: appointments.clientId, phone: clients.phone, name: clients.fullName, service: services.name })
          .from(appointments)
          .innerJoin(clients, eq(clients.id, appointments.clientId))
          .innerJoin(services, eq(services.id, appointments.serviceId))
          .where(and(eq(appointments.status, "DONE"), lte(appointments.endsAt, before), gte(appointments.endsAt, floor), isNull(appointments.thanksSentAt), isNotNull(clients.phone))),
      );
      for (const r of rows) {
        await enqueue(ctx, rule.kind, r.clientId!, r.phone!, renderTemplate(rule.template, { nome: r.name, salao: ctx.salonName, servico: r.service, link: ctx.reviewUrl ?? link, avaliar: appUrl(`/avaliar/${r.token}`) }), { appointmentId: r.id });
        await withTenantTx(actor, (tx) => tx.update(appointments).set({ thanksSentAt: now }).where(eq(appointments.id, r.id)));
        n++;
      }
    }
    if (rule.kind === "RETURN_INVITE") {
      // Último serviço com intervalo de retorno cujo prazo venceu hoje (±3 dias), sem agendamento futuro e sem convite nos últimos 20 dias.
      const rows = await withTenantRead(actor, (tx) =>
        tx.execute<{ client_id: string; phone: string; name: string; service: string }>(sql`
          with last as (
            select distinct on (a.client_id) a.client_id, a.ends_at, s.name as service, s.return_interval_days
            from agd_appointments a join sal_services s on s.id = a.service_id
            where a.status = 'DONE' and a.client_id is not null and s.return_interval_days is not null and a.deleted_at is null
            order by a.client_id, a.ends_at desc)
          select l.client_id, c.phone, c.full_name as name, l.service
          from last l join crm_clients c on c.id = l.client_id
          where c.phone is not null and c.marketing_opt_out is null and c.deleted_at is null
            and (l.ends_at::date + l.return_interval_days) between (${today}::date - 3) and ${today}::date
            and not exists (select 1 from agd_appointments f where f.client_id = l.client_id and f.starts_at > now() and f.status in ('SCHEDULED','CONFIRMED','REQUESTED'))
            and not exists (select 1 from mkt_messages m where m.client_id = l.client_id and m.automation_kind = 'RETURN_INVITE' and m.created_at > now() - interval '20 days')
          limit 100`),
      );
      for (const r of rows) {
        await enqueue(ctx, rule.kind, r.client_id, r.phone, renderTemplate(rule.template, { nome: r.name, salao: ctx.salonName, servico: r.service, link }));
        n++;
      }
    }
    if (rule.kind === "LOYALTY") {
      // Presente a cada N visitas: quem fechou a N-ésima (2N-ésima…) visita nos últimos 30 dias e ainda não ganhou por ela.
      const every = Math.max(2, Number(rule.settings.everyVisits ?? 10));
      const rows = await withTenantRead(actor, (tx) =>
        tx.execute<{ id: string; name: string; phone: string; visits: number }>(sql`
          select c.id, c.full_name as name, c.phone, c.visits_count as visits
          from crm_clients c
          where c.deleted_at is null and c.phone is not null and c.marketing_opt_out is null
            and c.visits_count >= ${every} and c.visits_count % ${every} = 0
            and c.last_visit_at >= (${today}::date - 30)
            and not exists (select 1 from mkt_messages m where m.client_id = c.id and m.automation_kind = 'LOYALTY' and m.created_at::date >= c.last_visit_at)
          limit 200`),
      );
      const vk = (rule.settings.voucherKind as "PERCENT" | "AMOUNT" | undefined) ?? "PERCENT";
      const vv = Number(rule.settings.voucherValue ?? 20);
      const vd = Number(rule.settings.voucherDays ?? 60);
      for (const r of rows) {
        const validUntil = addDays(today, vd);
        const code = voucherCode("FIEL");
        const voucherId = await withTenantTx(actor, async (tx, t) => {
          const [v] = await tx.insert(vouchers).values({ ...t.stampCreate(), code, name: `Fidelidade (${r.visits} visitas)`, clientId: r.id, kind: vk, value: vk === "PERCENT" ? String(vv) : vv.toFixed(4), validFrom: today, validUntil, maxUses: 1 }).returning({ id: vouchers.id });
          return v.id;
        });
        const voucherText = `${voucherLabel(vk, vk === "PERCENT" ? vv : Math.round(vv * 100))} (código ${code})`;
        await enqueue(ctx, rule.kind, r.id, r.phone, renderTemplate(rule.template, { nome: r.name, salao: ctx.salonName, visitas: String(r.visits), voucher: voucherText, validade: formatBRDate(validUntil), link }), { voucherId });
        n++;
      }
    }
    if (rule.kind === "BIRTHDAY" || rule.kind === "WIN_BACK") {
      const isBday = rule.kind === "BIRTHDAY";
      const inactiveDays = Number(rule.settings.inactiveDays ?? 60);
      const rows = await withTenantRead(actor, (tx) =>
        tx
          .select({ id: clients.id, name: clients.fullName, phone: clients.phone })
          .from(clients)
          .where(
            and(
              isNull(clients.deletedAt),
              isNull(clients.marketingOptOut),
              isNotNull(clients.phone),
              isBday
                ? sql`${clients.birthDate} is not null and to_char(${clients.birthDate}, 'MMDD') = to_char(${today}::date, 'MMDD')`
                : sql`${clients.lastVisitAt} between (${today}::date - ${inactiveDays}::int - 7) and (${today}::date - ${inactiveDays}::int)`,
              sql`not exists (select 1 from mkt_messages m where m.client_id = ${sql.raw(`"crm_clients"."id"`)} and m.automation_kind = ${rule.kind} and m.created_at > now() - interval '300 days')`,
            ),
          )
          .limit(200),
      );
      const vk = (rule.settings.voucherKind as "PERCENT" | "AMOUNT" | undefined) ?? "PERCENT";
      const vv = Number(rule.settings.voucherValue ?? 15);
      const vd = Number(rule.settings.voucherDays ?? 30);
      for (const r of rows) {
        const validUntil = addDays(today, vd);
        const code = voucherCode(isBday ? "NIVER" : "VOLTA");
        const voucherId = await withTenantTx(actor, async (tx, t) => {
          const [v] = await tx.insert(vouchers).values({ ...t.stampCreate(), code, name: isBday ? "Aniversário" : "Resgate", clientId: r.id, kind: vk, value: vk === "PERCENT" ? String(vv) : (vv).toFixed(4), validFrom: today, validUntil, maxUses: 1 }).returning({ id: vouchers.id });
          return v.id;
        });
        const voucherText = `${voucherLabel(vk, vk === "PERCENT" ? vv : Math.round(vv * 100))} (código ${code})`;
        await enqueue(ctx, rule.kind, r.id, r.phone!, renderTemplate(rule.template, { nome: r.name, salao: ctx.salonName, voucher: voucherText, validade: formatBRDate(validUntil), link }), { voucherId });
        n++;
      }
    }
    out[rule.kind] = n;
    await withTenantTx(actor, (tx) => tx.update(automations).set({ lastRunAt: now }).where(eq(automations.id, rule.id)));
  }
  // o que sobrou na fila (lotes anteriores) sai agora, se houver WhatsApp conectado
  try {
    await flushAutomationQueue(actor, ctx.sent);
  } catch (e) {
    console.error("flush", e);
  }
  // vouchers vencidos
  await withTenantTx(actor, (tx) => tx.update(vouchers).set({ status: "EXPIRED" }).where(and(eq(vouchers.status, "ACTIVE"), lt(vouchers.validUntil, today))));
  return out;
}

/** Job global (cron): todos os salões ativos. */
export async function runAutomationsForAll(): Promise<Record<string, Record<string, number>>> {
  setSendDeadline(45_000);
  const all = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.isActive, true));
  const out: Record<string, Record<string, number>> = {};
  for (const t of all) {
    try {
      out[t.id] = await runAutomationsForTenant(t.id);
    } catch (e) {
      out[t.id] = { erro: 1 };
      console.error("automations", t.id, e);
    }
  }
  return out;
}

/** Mensagens automáticas pendentes de envio manual (modo MANUAL): a dona dispara pelos links. */
export async function pendingManualMessages(actor: Actor) {
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: messages.id, clientName: clients.fullName, to: messages.to, body: messages.body, kind: messages.automationKind, campaignId: messages.campaignId, createdAt: messages.createdAt })
      .from(messages)
      .innerJoin(clients, eq(clients.id, messages.clientId))
      .where(and(eq(messages.status, "QUEUED"), isNull(messages.campaignId)))
      .orderBy(messages.createdAt)
      .limit(100),
  );
}
