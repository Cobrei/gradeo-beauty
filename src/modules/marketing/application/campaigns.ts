import { appUrl } from "@/lib/app-url";
import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { campaigns, clients, messages, vouchers, type SegmentRule } from "@/db/schema";
import { assertCan, can, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError, NotFoundError } from "@/lib/errors";
import { fromCents, toCents, type Cents, parseReais } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { addDays } from "@/lib/time";
import { getSettings } from "@/modules/core/application/settings";
import { segmentWhere } from "@/modules/crm/domain/segments";
import { formatBRDate, renderTemplate, voucherCode, voucherLabel } from "../domain/templates";
import { humanPause, providerFor, QR_BATCH, waLink } from "../infrastructure/provider";

const c = (v: unknown) => toCents(String(v ?? "0"));

export const campaignSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome à campanha.").max(120),
  channel: z.enum(["WHATSAPP", "EMAIL"]).default("WHATSAPP"),
  segment: z.object({
    preset: z.enum(["ALL", "INACTIVE", "BIRTHDAY_MONTH", "VIP", "ONE_VISIT", "OVERDUE_CYCLE", "NEW_30D", "CUSTOM"]).default("ALL"),
    inactiveDays: z.coerce.number().int().min(7).max(730).optional(),
    gender: z.enum(["F", "M"]).optional(),
    tags: z.array(z.string()).optional(),
    serviceId: z.string().uuid().optional(),
    professionalId: z.string().uuid().optional(),
  }),
  message: z.string().trim().min(10, "Escreva a mensagem.").max(1000),
  voucherKind: z.enum(["PERCENT", "AMOUNT"]).optional(),
  voucherValue: z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : parseReais(v)), z.number().positive().optional()),
  voucherDays: z.coerce.number().int().min(1).max(365).optional(),
  voucherServiceId: z.string().uuid().optional(),
});

export async function listCampaigns(actor: Actor) {
  assertCan(actor, "mkt.campaign.manage");
  return withTenantRead(actor, (tx) => tx.select().from(campaigns).where(isNull(campaigns.deletedAt)).orderBy(desc(campaigns.createdAt)).limit(100));
}

/** Quem receberia: só com telefone (ou e-mail), sem opt-out. */
export async function audience(actor: Actor, segment: SegmentRule, channel: "WHATSAPP" | "EMAIL") {
  assertCan(actor, "mkt.campaign.manage");
  const today = todayISO();
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: clients.id, fullName: clients.fullName, phone: clients.phone, email: clients.email, lastVisitAt: clients.lastVisitAt, visitsCount: clients.visitsCount, totalSpent: clients.totalSpent })
      .from(clients)
      .where(and(segmentWhere(segment, today), isNull(clients.marketingOptOut), channel === "WHATSAPP" ? isNotNull(clients.phone) : isNotNull(clients.email)))
      .orderBy(asc(clients.fullName)),
  );
}

export async function saveCampaign(actor: Actor, id: string | null, raw: unknown) {
  assertCan(actor, "mkt.campaign.manage");
  const i = campaignSchema.parse(raw);
  if (i.voucherKind && !i.voucherValue) throw new DomainError("VALIDATION", "Informe o valor do voucher.", { voucherValue: "Obrigatório" });
  const aud = await audience(actor, i.segment, i.channel);
  const values = {
    name: i.name,
    channel: i.channel,
    segment: i.segment,
    message: i.message,
    voucherKind: i.voucherKind ?? null,
    voucherValue: i.voucherKind ? (i.voucherKind === "PERCENT" ? String(i.voucherValue) : fromCents(Math.round((i.voucherValue ?? 0) * 100))) : null,
    voucherDays: i.voucherKind ? (i.voucherDays ?? 15) : null,
    voucherServiceId: i.voucherServiceId ?? null,
    audienceCount: aud.length,
  };
  return withTenantTx(actor, async (tx, ctx) => {
    if (id) {
      const [b] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
      if (!b) throw new NotFoundError("campaign", id);
      if (b.status !== "DRAFT") throw new DomainError("LOCKED", "Campanha já preparada não pode ser editada.");
      await tx.update(campaigns).set({ ...values, ...ctx.stampUpdate() }).where(eq(campaigns.id, id));
      return id;
    }
    const [row] = await tx.insert(campaigns).values({ ...values, ...ctx.stampCreate() }).returning({ id: campaigns.id });
    return row.id;
  });
}

export async function getCampaign(actor: Actor, id: string) {
  assertCan(actor, "mkt.campaign.manage");
  return withTenantRead(actor, async (tx) => {
    const [cp] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!cp) throw new NotFoundError("campaign", id);
    const msgs = await tx
      .select({ id: messages.id, clientId: messages.clientId, clientName: clients.fullName, to: messages.to, body: messages.body, status: messages.status, sentAt: messages.sentAt, openedAt: messages.openedAt, error: messages.error, voucherId: messages.voucherId })
      .from(messages)
      .innerJoin(clients, eq(clients.id, messages.clientId))
      .where(eq(messages.campaignId, id))
      .orderBy(asc(clients.fullName));
    const [stats] = await tx.execute<{ redeemed: number; revenue: string; discount: string }>(sql`
      select count(distinct r.id)::int as redeemed, coalesce(sum(r.order_total),0) as revenue, coalesce(sum(r.discount),0) as discount
      from mkt_voucher_redemptions r join mkt_vouchers v on v.id = r.voucher_id where v.campaign_id = ${id}`);
    // Receita de quem recebeu a mensagem e voltou (com ou sem voucher), a partir do disparo.
    const [returned] = cp.startedAt
      ? await tx.execute<{ n: number; revenue: string }>(sql`
          select count(distinct o.client_id)::int as n, coalesce(sum(o.total),0) as revenue from pos_orders o
          where o.status = 'PAID' and o.paid_at >= ${cp.startedAt}
            and o.client_id in (select m.client_id from mkt_messages m where m.campaign_id = ${id} and m.status = 'SENT')`)
      : [{ n: 0, revenue: "0" }];
    return { campaign: cp, messages: msgs, stats: { redeemed: stats.redeemed, revenue: c(stats.revenue), discount: c(stats.discount), returnedClients: returned.n, returnedRevenue: c(returned.revenue) } };
  });
}

/** Gera uma mensagem (e um voucher pessoal, se houver) por cliente do público. Idempotente. */
export async function prepareCampaign(actor: Actor, id: string) {
  assertCan(actor, "mkt.campaign.manage");
  const settings = await getSettings(actor);
  return withTenantTx(actor, async (tx, ctx) => {
    const [cp] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!cp) throw new NotFoundError("campaign", id);
    if (cp.status !== "DRAFT") return cp;
    const today = todayISO();
    const aud = await tx
      .select({ id: clients.id, fullName: clients.fullName, phone: clients.phone, email: clients.email })
      .from(clients)
      .where(and(segmentWhere(cp.segment, today), isNull(clients.marketingOptOut), cp.channel === "WHATSAPP" ? isNotNull(clients.phone) : isNotNull(clients.email)));
    const link = appUrl(`/agendar/${settings.slug}`);
    const validUntil = cp.voucherKind ? addDays(today, cp.voucherDays ?? 15) : null;
    for (const cl of aud) {
      let voucherId: string | null = null;
      let voucherText = "";
      if (cp.voucherKind && cp.voucherValue) {
        const code = voucherCode();
        const [v] = await tx
          .insert(vouchers)
          .values({ ...ctx.stampCreate(), code, name: cp.name, campaignId: cp.id, clientId: cl.id, kind: cp.voucherKind, value: cp.voucherValue, serviceId: cp.voucherServiceId, validFrom: today, validUntil: validUntil!, maxUses: 1 })
          .returning({ id: vouchers.id });
        voucherId = v.id;
        voucherText = `${voucherLabel(cp.voucherKind as "PERCENT" | "AMOUNT", cp.voucherKind === "PERCENT" ? Number(cp.voucherValue) : c(cp.voucherValue))} (código ${code})`;
      }
      const body = renderTemplate(cp.message, { nome: cl.fullName, salao: settings.salonName, voucher: voucherText, validade: validUntil ? formatBRDate(validUntil) : "", link });
      await tx.insert(messages).values({ ...ctx.stampCreate(), campaignId: cp.id, clientId: cl.id, channel: cp.channel, to: (cp.channel === "WHATSAPP" ? cl.phone : cl.email)!, body, voucherId });
    }
    await tx.update(campaigns).set({ status: "READY", audienceCount: aud.length, ...ctx.stampUpdate() }).where(eq(campaigns.id, id));
    return { ...cp, status: "READY", audienceCount: aud.length };
  });
}

/** Dispara um lote (provedor automático) ou libera os links (manual). Chamado repetidas vezes até esgotar a fila. */
export async function dispatchCampaign(actor: Actor, id: string, batch = 40): Promise<{ sent: number; failed: number; remaining: number; manual: boolean }> {
  assertCan(actor, "mkt.campaign.manage");
  const settings = await getSettings(actor);
  const provider = providerFor(settings.messageProvider, settings);
  if (provider.kind === "WA_QR") batch = Math.min(batch, QR_BATCH);
  const queued = await withTenantRead(actor, (tx) => tx.select().from(messages).where(and(eq(messages.campaignId, id), eq(messages.status, "QUEUED"))).orderBy(asc(messages.createdAt)).limit(batch));
  let sent = 0;
  let failed = 0;
  await withTenantTx(actor, async (tx, ctx) => {
    await tx.update(campaigns).set({ status: "SENDING", startedAt: sql`coalesce(${campaigns.startedAt}, now())`, ...ctx.stampUpdate() }).where(eq(campaigns.id, id));
  });
  if (provider.kind === "MANUAL") {
    // No modo manual a mensagem só é marcada como enviada quando a dona clica no link (markManualSent).
    const remaining = queued.length;
    return { sent: 0, failed: 0, remaining, manual: true };
  }
  for (const [i, m] of queued.entries()) {
    if (provider.kind === "WA_QR" && i > 0) await humanPause();
    const r = await provider.send(m.to, m.body);
    await withTenantTx(actor, async (tx, ctx) => {
      await tx.update(messages).set(r.ok ? { status: "SENT", sentAt: new Date(), providerId: r.providerId ?? null, ...ctx.stampUpdate() } : { status: "FAILED", error: r.error?.slice(0, 255) ?? "erro", ...ctx.stampUpdate() }).where(eq(messages.id, m.id));
    });
    if (r.ok) sent++;
    else failed++;
  }
  const remaining = await withTenantRead(actor, async (tx) => {
    const [r] = await tx.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.campaignId, id), eq(messages.status, "QUEUED")));
    return r.n;
  });
  await withTenantTx(actor, async (tx, ctx) => {
    await tx
      .update(campaigns)
      .set({ sentCount: sql`${campaigns.sentCount} + ${sent}`, failedCount: sql`${campaigns.failedCount} + ${failed}`, ...(remaining === 0 ? { status: "SENT", finishedAt: new Date() } : {}), ...ctx.stampUpdate() })
      .where(eq(campaigns.id, id));
  });
  return { sent, failed, remaining, manual: false };
}

/** Modo manual: a dona clicou no link do WhatsApp → marca como enviada. */
export async function markManualSent(actor: Actor, messageId: string) {
  if (!can(actor, "mkt.message.send")) assertCan(actor, "mkt.campaign.manage");
  return withTenantTx(actor, async (tx, ctx) => {
    const [m] = await tx.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!m || m.status !== "QUEUED") return;
    await tx.update(messages).set({ status: "SENT", sentAt: new Date(), openedAt: new Date(), ...ctx.stampUpdate() }).where(eq(messages.id, messageId));
    if (m.campaignId) {
      const [r] = await tx.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.campaignId, m.campaignId), eq(messages.status, "QUEUED")));
      await tx.update(campaigns).set({ sentCount: sql`${campaigns.sentCount} + 1`, ...(r.n === 0 ? { status: "SENT", finishedAt: new Date() } : {}), ...ctx.stampUpdate() }).where(eq(campaigns.id, m.campaignId));
    }
  });
}

export async function pauseCampaign(actor: Actor, id: string, paused: boolean) {
  assertCan(actor, "mkt.campaign.manage");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(campaigns).set({ status: paused ? "PAUSED" : "SENDING", ...ctx.stampUpdate() }).where(and(eq(campaigns.id, id), inArray(campaigns.status, paused ? ["SENDING", "READY"] : ["PAUSED"])));
  });
}

export async function deleteDraft(actor: Actor, id: string) {
  assertCan(actor, "mkt.campaign.manage");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(campaigns).set({ deletedAt: new Date(), ...ctx.stampUpdate() }).where(and(eq(campaigns.id, id), eq(campaigns.status, "DRAFT")));
  });
}

export { waLink };

// ---------- Vouchers avulsos ----------

export const voucherSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "Só letras, números e hífen.").optional().or(z.literal("")),
  kind: z.enum(["PERCENT", "AMOUNT"]),
  value: z.preprocess((v) => parseReais(v), z.number().positive("Valor maior que zero.")),
  minOrder: z.preprocess((v) => parseReais(v), z.number().min(0)).default(0),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxUses: z.coerce.number().int().min(1).max(100000).default(100),
  clientId: z.string().uuid().optional().or(z.literal("")),
});

export async function createVoucher(actor: Actor, raw: unknown) {
  assertCan(actor, "mkt.voucher.manage");
  const i = voucherSchema.parse(raw);
  return withTenantTx(actor, async (tx, ctx) => {
    const code = i.code || voucherCode("VIP");
    const [dup] = await tx.select({ id: vouchers.id }).from(vouchers).where(eq(vouchers.code, code)).limit(1);
    if (dup) throw new DomainError("DUP", "Já existe um voucher com este código.", { code: "Código em uso" });
    const [row] = await tx
      .insert(vouchers)
      .values({ ...ctx.stampCreate(), code, name: i.name, kind: i.kind, value: i.kind === "PERCENT" ? String(i.value) : fromCents(Math.round(i.value * 100)), minOrder: fromCents(Math.round(i.minOrder * 100)), serviceId: i.serviceId || null, validFrom: i.validFrom, validUntil: i.validUntil, maxUses: i.maxUses, clientId: i.clientId || null })
      .returning({ id: vouchers.id, code: vouchers.code });
    return row;
  });
}

export async function listVouchers(actor: Actor) {
  assertCan(actor, "mkt.voucher.manage");
  return withTenantRead(actor, (tx) =>
    tx
      .select({ v: vouchers, campaignName: campaigns.name, clientName: clients.fullName, redeemedTotal: sql<string>`(select coalesce(sum(r.order_total),0) from mkt_voucher_redemptions r where r.voucher_id = ${sql.raw(`"mkt_vouchers"."id"`)})` })
      .from(vouchers)
      .leftJoin(campaigns, eq(campaigns.id, vouchers.campaignId))
      .leftJoin(clients, eq(clients.id, vouchers.clientId))
      .where(isNull(vouchers.deletedAt))
      .orderBy(desc(vouchers.createdAt))
      .limit(300),
  );
}

export async function setVoucherStatus(actor: Actor, id: string, status: "ACTIVE" | "PAUSED" | "EXPIRED") {
  assertCan(actor, "mkt.voucher.manage");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(vouchers).set({ status, ...ctx.stampUpdate() }).where(eq(vouchers.id, id));
  });
}

export type Audience = Awaited<ReturnType<typeof audience>>;
export type CampaignCents = Cents;
