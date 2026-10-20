import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { appointments, clientCredits, clientNotes, clients, messages, orderItems, orders, professionals, services, vouchers, type SegmentRule } from "@/db/schema";
import { assertCan, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError, NotFoundError } from "@/lib/errors";
import { toCents, type Cents } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { todayISO } from "@/lib/dates";
import { SEGMENT_PRESETS, segmentWhere } from "../domain/segments";

export const clientSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome.").max(120),
  phone: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").optional().or(z.literal("")),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  gender: z.enum(["F", "M", "N"]).default("N"),
  cpf: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).default([]),
  source: z.string().max(24).default("MANUAL"),
  preferredProfessionalId: z.string().uuid().optional().or(z.literal("")),
  marketingOptIn: z.boolean().default(true),
});

export type ClientRow = typeof clients.$inferSelect;

export async function listClients(actor: Actor, opts: { q?: string; segment?: SegmentRule; limit?: number; offset?: number } = {}) {
  assertCan(actor, "crm.client.read");
  const today = todayISO();
  return withTenantRead(actor, async (tx) => {
    const conds = [opts.segment ? segmentWhere(opts.segment, today) : isNull(clients.deletedAt)];
    if (opts.q) {
      const q = `%${opts.q.trim()}%`;
      const digits = opts.q.replace(/\D/g, "");
      conds.push(or(ilike(clients.fullName, q), digits ? ilike(clients.phone, `%${digits}%`) : undefined, ilike(clients.email, q)));
    }
    const rows = await tx
      .select({
        id: clients.id,
        fullName: clients.fullName,
        phone: clients.phone,
        email: clients.email,
        birthDate: clients.birthDate,
        tags: clients.tags,
        lastVisitAt: clients.lastVisitAt,
        visitsCount: clients.visitsCount,
        totalSpent: clients.totalSpent,
        avgIntervalDays: clients.avgIntervalDays,
        marketingOptOut: clients.marketingOptOut,
        preferredName: professionals.name,
      })
      .from(clients)
      .leftJoin(professionals, eq(professionals.id, clients.preferredProfessionalId))
      .where(and(...conds))
      .orderBy(desc(clients.lastVisitAt), asc(clients.fullName))
      .limit(opts.limit ?? 200)
      .offset(opts.offset ?? 0);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(clients).where(and(...conds));
    return { rows, total: n };
  });
}

/** Contagem e valor estimado de cada segmento (para o painel de retenção). */
export async function segmentSummary(actor: Actor) {
  assertCan(actor, "crm.client.read");
  const today = todayISO();
  return withTenantRead(actor, async (tx) => {
    const out: { key: string; label: string; hint: string; count: number; value: Cents }[] = [];
    for (const p of SEGMENT_PRESETS) {
      const [r] = await tx
        .select({ n: sql<number>`count(*)::int`, v: sql<string>`coalesce(sum(case when ${clients.visitsCount} > 0 then ${clients.totalSpent} / ${clients.visitsCount} else 0 end), 0)` })
        .from(clients)
        .where(segmentWhere({ preset: p.key }, today));
      out.push({ key: p.key, label: p.label, hint: p.hint, count: r.n, value: toCents(r.v) });
    }
    return out;
  });
}

export async function getClient(actor: Actor, id: string) {
  assertCan(actor, "crm.client.read");
  return withTenantRead(actor, async (tx) => {
    const [c] = await tx.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!c) throw new NotFoundError("client", id);
    const [notes, appts, ords, credits, vchs, msgs, pref] = await Promise.all([
      tx
        .select({ id: clientNotes.id, kind: clientNotes.kind, text: clientNotes.text, noteDate: clientNotes.noteDate, serviceName: services.name, professionalName: professionals.name, photoUrl: clientNotes.photoUrl })
        .from(clientNotes)
        .leftJoin(services, eq(services.id, clientNotes.serviceId))
        .leftJoin(professionals, eq(professionals.id, clientNotes.professionalId))
        .where(eq(clientNotes.clientId, id))
        .orderBy(desc(clientNotes.noteDate), desc(clientNotes.createdAt)),
      tx
        .select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status, price: appointments.price, serviceName: services.name, professionalName: professionals.name, professionalColor: professionals.color })
        .from(appointments)
        .innerJoin(services, eq(services.id, appointments.serviceId))
        .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
        .where(eq(appointments.clientId, id))
        .orderBy(desc(appointments.startsAt))
        .limit(100),
      tx
        .select({ id: orders.id, number: orders.number, serviceDate: orders.serviceDate, status: orders.status, total: orders.total, items: sql<string>`(select string_agg(oi.description, ', ' order by oi.created_at) from pos_order_items oi where oi.order_id = ${sql.raw(`"pos_orders"."id"`)} and oi.deleted_at is null)` })
        .from(orders)
        .where(eq(orders.clientId, id))
        .orderBy(desc(orders.serviceDate), desc(orders.number))
        .limit(100),
      tx
        .select({ id: clientCredits.id, serviceName: services.name, remaining: clientCredits.remaining, total: clientCredits.total, expiresAt: clientCredits.expiresAt })
        .from(clientCredits)
        .innerJoin(services, eq(services.id, clientCredits.serviceId))
        .where(and(eq(clientCredits.clientId, id), sql`${clientCredits.remaining} > 0`))
        .orderBy(asc(clientCredits.expiresAt)),
      tx.select().from(vouchers).where(and(eq(vouchers.clientId, id), eq(vouchers.status, "ACTIVE"))).orderBy(desc(vouchers.validUntil)),
      tx.select({ id: messages.id, body: messages.body, status: messages.status, createdAt: messages.createdAt, automationKind: messages.automationKind, campaignId: messages.campaignId }).from(messages).where(eq(messages.clientId, id)).orderBy(desc(messages.createdAt)).limit(20),
      c.preferredProfessionalId ? tx.select({ name: professionals.name }).from(professionals).where(eq(professionals.id, c.preferredProfessionalId)).limit(1) : Promise.resolve([] as { name: string }[]),
    ]);
    // serviços mais feitos
    const top = await tx
      .select({ description: orderItems.description, n: sql<number>`count(*)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.clientId, id), eq(orders.status, "PAID"), eq(orderItems.kind, "SERVICE")))
      .groupBy(orderItems.description)
      .orderBy(sql`count(*) desc`)
      .limit(5);
    return { client: c, notes, appointments: appts, orders: ords, credits, vouchers: vchs, messages: msgs, preferredName: pref[0]?.name ?? null, topServices: top };
  });
}

export async function saveClient(actor: Actor, id: string | null, raw: unknown) {
  assertCan(actor, "crm.client.write");
  const i = clientSchema.parse(raw);
  const phone = normalizePhone(i.phone);
  if (i.phone && !phone) throw new DomainError("VALIDATION", "Telefone inválido. Use DDD + número.", { phone: "Telefone inválido" });
  const values = {
    fullName: i.fullName,
    phone,
    email: i.email || null,
    birthDate: i.birthDate || null,
    gender: i.gender,
    cpf: i.cpf ? i.cpf.replace(/\D/g, "") || null : null,
    notes: i.notes || null,
    tags: i.tags,
    preferredProfessionalId: i.preferredProfessionalId || null,
  };
  return withTenantTx(actor, async (tx, ctx) => {
    if (phone) {
      const [dup] = await tx.select({ id: clients.id, name: clients.fullName }).from(clients).where(and(eq(clients.phone, phone), isNull(clients.deletedAt), id ? sql`${clients.id} <> ${id}` : undefined)).limit(1);
      if (dup) throw new DomainError("DUPLICATE_PHONE", `Já existe uma cliente com este telefone: ${dup.name}.`, { phone: "Telefone já cadastrado" });
    }
    if (id) {
      const [before] = await tx.select().from(clients).where(eq(clients.id, id)).limit(1);
      if (!before) throw new NotFoundError("client", id);
      await tx
        .update(clients)
        .set({ ...values, ...(i.marketingOptIn ? { marketingOptOut: null, marketingOptIn: before.marketingOptIn ?? new Date() } : { marketingOptOut: before.marketingOptOut ?? new Date() }), ...ctx.stampUpdate() })
        .where(eq(clients.id, id));
      await ctx.audit("client", id, "update", before, values);
      return id;
    }
    const [row] = await tx
      .insert(clients)
      .values({ ...values, source: i.source, marketingOptIn: i.marketingOptIn ? new Date() : null, marketingOptOut: i.marketingOptIn ? null : new Date(), ...ctx.stampCreate() })
      .returning({ id: clients.id });
    await ctx.audit("client", row.id, "create", null, values);
    return row.id;
  });
}

export const noteSchema = z.object({
  clientId: z.string().uuid(),
  kind: z.enum(["FORMULA", "ALLERGY", "PREFERENCE", "NOTE"]).default("NOTE"),
  text: z.string().trim().min(2, "Escreva a observação.").max(2000),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  professionalId: z.string().uuid().optional().or(z.literal("")),
  noteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export async function addNote(actor: Actor, raw: unknown) {
  assertCan(actor, "crm.note.write");
  const i = noteSchema.parse(raw);
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.insert(clientNotes).values({ ...ctx.stampCreate(), clientId: i.clientId, kind: i.kind, text: i.text, serviceId: i.serviceId || null, professionalId: i.professionalId || null, noteDate: i.noteDate || todayISO() });
  });
}

export async function setMarketingOptOut(actor: Actor, clientId: string, optOut: boolean) {
  assertCan(actor, "crm.client.write");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(clients).set(optOut ? { marketingOptOut: new Date(), ...ctx.stampUpdate() } : { marketingOptOut: null, marketingOptIn: new Date(), ...ctx.stampUpdate() }).where(eq(clients.id, clientId));
  });
}

/**
 * Importação em massa (CSV/contatos). Dedup por telefone; atualiza nome vazio.
 * Linhas: nome, telefone, e-mail?, nascimento?, última visita?, observações?
 */
export interface ImportRow { fullName: string; phone?: string; email?: string; birthDate?: string; lastVisitAt?: string; notes?: string; tags?: string[] }

export async function importClients(actor: Actor, rows: ImportRow[]): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  assertCan(actor, "crm.client.import");
  if (rows.length > 5000) throw new DomainError("TOO_MANY", "Importe até 5.000 linhas por vez.");
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
  return withTenantTx(actor, async (tx, ctx) => {
    const existing = await tx.select({ id: clients.id, phone: clients.phone, fullName: clients.fullName }).from(clients).where(isNull(clients.deletedAt));
    const byPhone = new Map(existing.filter((e) => e.phone).map((e) => [e.phone!, e]));
    const seen = new Set<string>();
    const batch: (typeof clients.$inferInsert)[] = [];
    for (const [idx, r] of rows.entries()) {
      const name = (r.fullName ?? "").trim();
      if (name.length < 2) {
        result.skipped++;
        result.errors.push(`Linha ${idx + 2}: sem nome.`);
        continue;
      }
      const phone = normalizePhone(r.phone);
      if (phone && seen.has(phone)) {
        result.skipped++;
        continue;
      }
      if (phone) seen.add(phone);
      const hit = phone ? byPhone.get(phone) : undefined;
      if (hit) {
        await tx.update(clients).set({ ...(hit.fullName.length < 3 ? { fullName: name } : {}), ...(r.email ? { email: r.email } : {}), ...(r.birthDate ? { birthDate: r.birthDate } : {}), ...ctx.stampUpdate() }).where(eq(clients.id, hit.id));
        result.updated++;
        continue;
      }
      batch.push({
        ...ctx.stampCreate(),
        fullName: name,
        phone,
        email: r.email || null,
        birthDate: r.birthDate || null,
        notes: r.notes || null,
        tags: r.tags ?? ["importada"],
        source: "IMPORT",
        lastVisitAt: r.lastVisitAt || null,
        visitsCount: r.lastVisitAt ? 1 : 0,
        marketingOptIn: new Date(),
      });
      result.created++;
    }
    for (let i = 0; i < batch.length; i += 500) await tx.insert(clients).values(batch.slice(i, i + 500));
    return result;
  });
}

/** Aniversariantes dos próximos N dias (painel). */
export async function upcomingBirthdays(actor: Actor, days = 7) {
  assertCan(actor, "crm.client.read");
  // "hoje" no fuso do salão (o banco roda em UTC: depois das 21h já seria amanhã)
  const today = todayISO();
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: clients.id, fullName: clients.fullName, phone: clients.phone, birthDate: clients.birthDate })
      .from(clients)
      .where(sql`${clients.deletedAt} is null and ${clients.birthDate} is not null and (to_char(${clients.birthDate}, 'MMDD') between to_char(${today}::date, 'MMDD') and to_char(${today}::date + ${days}::int, 'MMDD') or (to_char(${today}::date + ${days}::int, 'MMDD') < to_char(${today}::date, 'MMDD') and (to_char(${clients.birthDate}, 'MMDD') >= to_char(${today}::date, 'MMDD') or to_char(${clients.birthDate}, 'MMDD') <= to_char(${today}::date + ${days}::int, 'MMDD'))))`)
      .orderBy(sql`to_char(${clients.birthDate}, 'MMDD')`)
      .limit(20),
  );
}

/** Resumo de uma cliente (para agenda/comanda). */
export async function clientBrief(actor: Actor, id: string) {
  assertCan(actor, "crm.client.read");
  return withTenantRead(actor, async (tx) => {
    const [c] = await tx.select({ id: clients.id, fullName: clients.fullName, phone: clients.phone, visitsCount: clients.visitsCount, lastVisitAt: clients.lastVisitAt, totalSpent: clients.totalSpent }).from(clients).where(eq(clients.id, id)).limit(1);
    return c ?? undefined;
  });
}
