import "server-only";
import { and, asc, eq, gte, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "@/db/client";
import { agendaBlocks, appointments, clients, professionals, salonSettings, services, waitlist } from "@/db/schema";
import { assertCan, can, withTenant, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError, NotFoundError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { todayISO } from "@/lib/dates";
import { addDays, addMinutes, dateToLocal, dayRange, localToDate, minutesOf, weekdayOf } from "@/lib/time";
import { getSettings } from "@/modules/core/application/settings";
import { myProfessionalId } from "@/modules/team/application/use-cases";
import { canTransition, freeSlots, overlaps, workWindow, type Busy } from "../domain/slots";

export interface DayAppointment {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  professionalId: string;
  serviceId: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  source: string;
  price: string;
  notes: string | null;
  orderId: string | null;
  visitsCount: number;
}

/** Agenda do dia: profissionais ativos + atendimentos + bloqueios. Profissional só vê a própria. */
export async function dayAgenda(actor: Actor, dateISO: string) {
  const r = await agendaRange(actor, dateISO, 1);
  const weekday = weekdayOf(dateISO);
  const salonWindow = r.settings.openingHours[String(weekday)] ?? null;
  return { ...r, salonWindow, weekday };
}

/** Agenda de vários dias (visão semanal). */
export async function agendaRange(actor: Actor, startISO: string, days: number) {
  const own = !can(actor, "agenda.appointment.read") && can(actor, "agenda.appointment.read_own");
  if (!own) assertCan(actor, "agenda.appointment.read");
  const mine = own ? await myProfessionalId(actor) : null;
  const start = dayRange(startISO).start;
  const end = dayRange(addDays(startISO, days - 1)).end;
  const settings = await getSettings(actor);
  return withTenantRead(actor, async (tx) => {
    const pros = await tx
      .select()
      .from(professionals)
      .where(and(isNull(professionals.deletedAt), eq(professionals.isActive, true), mine ? eq(professionals.id, mine) : undefined))
      .orderBy(asc(professionals.sortOrder), asc(professionals.name));
    const appts: DayAppointment[] = await tx
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        clientName: sql<string>`coalesce(${clients.fullName}, ${appointments.walkInName}, 'Cliente')`,
        clientPhone: clients.phone,
        professionalId: appointments.professionalId,
        serviceId: appointments.serviceId,
        serviceName: services.name,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        source: appointments.source,
        price: appointments.price,
        notes: appointments.notes,
        orderId: appointments.orderId,
        visitsCount: sql<number>`coalesce(${clients.visitsCount}, 0)`,
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(and(isNull(appointments.deletedAt), gte(appointments.startsAt, start), lt(appointments.startsAt, end), mine ? eq(appointments.professionalId, mine) : undefined, ne(appointments.status, "CANCELLED")))
      .orderBy(asc(appointments.startsAt));
    const blocks = await tx.select().from(agendaBlocks).where(and(isNull(agendaBlocks.deletedAt), lt(agendaBlocks.startsAt, end), gte(agendaBlocks.endsAt, start)));
    return { pros, appts, blocks, settings };
  });
}

/** Horários livres de um profissional para um serviço num dia (uso interno e público). */
export async function availableSlots(tenantId: string, dateISO: string, professionalId: string, serviceId: string, opts: { leadMinutes?: number; publicOnly?: boolean } = {}): Promise<string[]> {
  const { start, end } = dayRange(dateISO);
  return withTenant(tenantId, async (tx) => {
    const [s] = await tx.select().from(salonSettings).where(eq(salonSettings.tenantId, tenantId)).limit(1);
    const [p] = await tx.select().from(professionals).where(and(eq(professionals.id, professionalId), eq(professionals.isActive, true))).limit(1);
    const [sv] = await tx.select().from(services).where(and(eq(services.id, serviceId), eq(services.isActive, true))).limit(1);
    if (!s || !p || !sv) return [];
    if (opts.publicOnly && (!p.acceptsOnline || !sv.onlineBooking || (p.serviceIds.length && !p.serviceIds.includes(serviceId)))) return [];
    const window = workWindow(weekdayOf(dateISO), s.openingHours, p.workingHours);
    const appts = await tx
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(and(isNull(appointments.deletedAt), eq(appointments.professionalId, professionalId), lt(appointments.startsAt, end), gte(appointments.endsAt, start), inArray(appointments.status, ["REQUESTED", "SCHEDULED", "CONFIRMED", "IN_SERVICE"])));
    const blocks = await tx
      .select({ startsAt: agendaBlocks.startsAt, endsAt: agendaBlocks.endsAt })
      .from(agendaBlocks)
      .where(and(isNull(agendaBlocks.deletedAt), or(eq(agendaBlocks.professionalId, professionalId), isNull(agendaBlocks.professionalId)), lt(agendaBlocks.startsAt, end), gte(agendaBlocks.endsAt, start)));
    const toMin = (d: Date) => {
      const l = dateToLocal(d);
      return l.date < dateISO ? 0 : l.date > dateISO ? 24 * 60 : minutesOf(l.time);
    };
    const busy: Busy[] = [...appts, ...blocks].map((b) => ({ start: toMin(b.startsAt), end: toMin(b.endsAt) }));
    let notBefore = 0;
    const today = dateToLocal(new Date());
    if (today.date === dateISO) notBefore = minutesOf(today.time) + (opts.leadMinutes ?? 0);
    if (today.date > dateISO) return [];
    return freeSlots(window, busy, sv.durationMin, s.slotMinutes, notBefore);
  });
}

/**
 * Atendimentos e bloqueios que se sobrepõem ao intervalo. Trava o profissional até o fim da
 * transação para que dois pedidos simultâneos não peguem o mesmo horário.
 */
async function conflictsFor(tx: Tx, professionalId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${professionalId}))`);
  const appts = await tx
    .select({ id: appointments.id, startsAt: appointments.startsAt, endsAt: appointments.endsAt })
    .from(appointments)
    .where(and(isNull(appointments.deletedAt), eq(appointments.professionalId, professionalId), lt(appointments.startsAt, endsAt), gte(appointments.endsAt, startsAt), inArray(appointments.status, ["REQUESTED", "SCHEDULED", "CONFIRMED", "IN_SERVICE"]), excludeId ? ne(appointments.id, excludeId) : undefined));
  const blocks = await tx
    .select({ id: agendaBlocks.id, startsAt: agendaBlocks.startsAt, endsAt: agendaBlocks.endsAt })
    .from(agendaBlocks)
    .where(and(isNull(agendaBlocks.deletedAt), or(eq(agendaBlocks.professionalId, professionalId), isNull(agendaBlocks.professionalId)), lt(agendaBlocks.startsAt, endsAt), gte(agendaBlocks.endsAt, startsAt)));
  return [...appts, ...blocks].filter((c) => overlaps(startsAt, endsAt, c.startsAt, c.endsAt));
}

export const appointmentSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  walkInName: z.string().trim().max(120).optional(),
  newClientPhone: z.string().trim().optional(),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(5).max(600).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  notes: z.string().trim().max(500).optional(),
  source: z.enum(["APP", "ONLINE", "WALKIN", "CAMPAIGN"]).default("APP"),
  force: z.boolean().default(false),
  marketingOptIn: z.boolean().optional(),
});

export async function createAppointment(actor: Actor, raw: unknown): Promise<{ id: string; conflict?: string }> {
  assertCan(actor, "agenda.appointment.write");
  const i = appointmentSchema.parse(raw);
  return withTenantTx(actor, async (tx, ctx) => {
    const [sv] = await tx.select().from(services).where(eq(services.id, i.serviceId)).limit(1);
    if (!sv) throw new NotFoundError("service");
    const [pro] = await tx.select().from(professionals).where(eq(professionals.id, i.professionalId)).limit(1);
    if (!pro) throw new NotFoundError("professional");
    const startsAt = localToDate(i.date, i.time);
    const endsAt = addMinutes(startsAt, i.durationMin ?? sv.durationMin);

    let clientId = i.clientId || null;
    let walkInName = i.walkInName?.trim() || null;
    // Cadastro rápido: nome + telefone novos viram cliente na hora.
    if (!clientId && walkInName && i.newClientPhone) {
      const phone = normalizePhone(i.newClientPhone);
      if (phone) {
        const [dup] = await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.phone, phone), isNull(clients.deletedAt))).limit(1);
        if (dup) clientId = dup.id;
        else {
          const [c] = await tx.insert(clients).values({ ...ctx.stampCreate(), fullName: walkInName, phone, source: i.source === "ONLINE" ? "ONLINE" : "WALKIN", marketingOptIn: i.source === "ONLINE" && !i.marketingOptIn ? null : new Date() }).returning({ id: clients.id });
          clientId = c.id;
        }
        walkInName = null;
      }
    }
    if (!clientId && !walkInName) throw new DomainError("VALIDATION", "Escolha a cliente ou informe um nome.", { clientId: "Obrigatório" });

    const real = await conflictsFor(tx, i.professionalId, startsAt, endsAt);
    if (real.length && !i.force) throw new DomainError("CONFLICT", `${pro.name} já tem atendimento ou bloqueio nesse horário. Marque "encaixar mesmo assim" para forçar.`);

    const price = i.price !== undefined && i.price !== "" ? fromCents(toCents(String(i.price))) : sv.price;
    const [row] = await tx
      .insert(appointments)
      .values({ ...ctx.stampCreate(), clientId, walkInName, professionalId: i.professionalId, serviceId: i.serviceId, startsAt, endsAt, status: i.source === "ONLINE" ? "REQUESTED" : "SCHEDULED", source: i.source, price, notes: i.notes || null })
      .returning({ id: appointments.id });
    await ctx.emit("appointment.created", "appointment", row.id, { startsAt: startsAt.toISOString(), clientId });
    return { id: row.id, conflict: real.length ? "encaixe" : undefined };
  });
}

export async function rescheduleAppointment(actor: Actor, id: string, input: { date: string; time: string; professionalId?: string; force?: boolean }) {
  assertCan(actor, "agenda.appointment.write");
  return withTenantTx(actor, async (tx, ctx) => {
    const [a] = await tx.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!a) throw new NotFoundError("appointment", id);
    if (["DONE", "CANCELLED"].includes(a.status)) throw new DomainError("INVALID", "Atendimento finalizado ou cancelado não pode ser remarcado.");
    const dur = (a.endsAt.getTime() - a.startsAt.getTime()) / 60000;
    const startsAt = localToDate(input.date, input.time);
    const endsAt = addMinutes(startsAt, dur);
    const proId = input.professionalId ?? a.professionalId;
    const [pro] = await tx.select({ id: professionals.id, name: professionals.name }).from(professionals).where(eq(professionals.id, proId)).limit(1);
    if (!pro) throw new NotFoundError("professional", proId);
    const real = await conflictsFor(tx, proId, startsAt, endsAt, id);
    if (real.length && !input.force) throw new DomainError("CONFLICT", `${pro.name} já tem atendimento ou bloqueio nesse horário.`);
    await tx.update(appointments).set({ startsAt, endsAt, professionalId: input.professionalId ?? a.professionalId, reminderSentAt: null, ...ctx.stampUpdate() }).where(eq(appointments.id, id));
    await ctx.audit("appointment", id, "update", { startsAt: a.startsAt }, { startsAt });
  });
}

export async function transitionAppointment(actor: Actor, id: string, to: string, reason?: string) {
  assertCan(actor, "agenda.appointment.write");
  return withTenantTx(actor, async (tx, ctx) => {
    const [a] = await tx.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!a) throw new NotFoundError("appointment", id);
    if (!canTransition(a.status, to)) throw new DomainError("INVALID_TRANSITION", `Não dá para ir de "${a.status}" para "${to}".`);
    await tx
      .update(appointments)
      .set({ status: to, ...(to === "CONFIRMED" ? { confirmedAt: new Date() } : {}), ...(to === "CANCELLED" ? { cancelReason: reason ?? null } : {}), ...ctx.stampUpdate() })
      .where(eq(appointments.id, id));
    await ctx.audit("appointment", id, "transition", { status: a.status }, { status: to });
    if (to === "CANCELLED") await ctx.emit("appointment.cancelled", "appointment", id, { professionalId: a.professionalId, serviceId: a.serviceId, startsAt: a.startsAt.toISOString() });
    return a;
  });
}

export async function getAppointment(actor: Actor, id: string) {
  return withTenantRead(actor, async (tx) => {
    const [a] = await tx
      .select({ appt: appointments, serviceName: services.name, professionalName: professionals.name, clientName: clients.fullName, clientPhone: clients.phone })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .where(eq(appointments.id, id))
      .limit(1);
    if (!a) throw new NotFoundError("appointment", id);
    return a;
  });
}

export async function addBlock(actor: Actor, input: { professionalId?: string; date: string; from: string; to: string; reason?: string }) {
  assertCan(actor, "agenda.block.write");
  const startsAt = localToDate(input.date, input.from);
  const endsAt = localToDate(input.date, input.to);
  if (endsAt <= startsAt) throw new DomainError("VALIDATION", "Hora final deve ser depois da inicial.");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.insert(agendaBlocks).values({ ...ctx.stampCreate(), professionalId: input.professionalId || null, startsAt, endsAt, reason: input.reason || null });
  });
}

export async function removeBlock(actor: Actor, id: string) {
  assertCan(actor, "agenda.block.write");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(agendaBlocks).set({ deletedAt: new Date(), ...ctx.stampUpdate() }).where(eq(agendaBlocks.id, id));
  });
}

export async function addToWaitlist(actor: Actor, input: { clientId: string; serviceId: string; professionalId?: string; fromDate: string; toDate: string; periodPref?: string; note?: string }) {
  assertCan(actor, "agenda.appointment.write");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.insert(waitlist).values({ ...ctx.stampCreate(), clientId: input.clientId, serviceId: input.serviceId, professionalId: input.professionalId || null, fromDate: input.fromDate, toDate: input.toDate, periodPref: input.periodPref ?? "ANY", note: input.note || null });
  });
}

export async function listWaitlist(actor: Actor) {
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: waitlist.id, clientId: waitlist.clientId, clientName: clients.fullName, clientPhone: clients.phone, serviceName: services.name, serviceId: waitlist.serviceId, professionalId: waitlist.professionalId, professionalName: professionals.name, fromDate: waitlist.fromDate, toDate: waitlist.toDate, periodPref: waitlist.periodPref, note: waitlist.note, status: waitlist.status, createdAt: waitlist.createdAt })
      .from(waitlist)
      .innerJoin(clients, eq(clients.id, waitlist.clientId))
      .innerJoin(services, eq(services.id, waitlist.serviceId))
      .leftJoin(professionals, eq(professionals.id, waitlist.professionalId))
      .where(and(isNull(waitlist.deletedAt), eq(waitlist.status, "WAITING"), gte(waitlist.toDate, todayISO())))
      .orderBy(asc(waitlist.createdAt)),
  );
}

export async function setWaitlistStatus(actor: Actor, id: string, status: "NOTIFIED" | "BOOKED" | "EXPIRED") {
  assertCan(actor, "agenda.appointment.write");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(waitlist).set({ status, ...(status === "NOTIFIED" ? { notifiedAt: new Date() } : {}), ...ctx.stampUpdate() }).where(eq(waitlist.id, id));
  });
}

/** Quem da lista de espera encaixa num horário que vagou (mesmo serviço/profissional, janela de datas). */
export async function waitlistMatches(actor: Actor, serviceId: string, professionalId: string, dateISO: string) {
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: waitlist.id, clientName: clients.fullName, clientPhone: clients.phone, periodPref: waitlist.periodPref })
      .from(waitlist)
      .innerJoin(clients, eq(clients.id, waitlist.clientId))
      .where(and(eq(waitlist.status, "WAITING"), eq(waitlist.serviceId, serviceId), or(isNull(waitlist.professionalId), eq(waitlist.professionalId, professionalId)), lte(waitlist.fromDate, dateISO), gte(waitlist.toDate, dateISO)))
      .limit(5),
  );
}

/** Próximos atendimentos de uma cliente (ficha). */
export async function nextAppointments(actor: Actor, clientId: string) {
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: appointments.id, startsAt: appointments.startsAt, serviceName: services.name, professionalName: professionals.name, status: appointments.status })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
      .where(and(eq(appointments.clientId, clientId), gte(appointments.startsAt, new Date()), inArray(appointments.status, ["REQUESTED", "SCHEDULED", "CONFIRMED"])))
      .orderBy(asc(appointments.startsAt))
      .limit(5),
  );
}
