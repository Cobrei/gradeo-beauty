import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, clients, orderItems, orders, payments, professionals, services } from "@/db/schema";
import { getPublicSalonById } from "./settings";

const isToken = (t: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);

/**
 * Links públicos por token (sem login). Consultas de sistema que filtram pelo token,
 * que é aleatório e só o salão e a cliente conhecem. Só devolvem o mínimo necessário.
 */
export async function receiptByToken(token: string) {
  if (!isToken(token)) return null;
  const [o] = await db
    .select({ id: orders.id, tenantId: orders.tenantId, number: orders.number, serviceDate: orders.serviceDate, status: orders.status, subtotal: orders.subtotal, discount: orders.discount, voucherDiscount: orders.voucherDiscount, total: orders.total, clientName: clients.fullName, walkInName: orders.walkInName })
    .from(orders)
    .leftJoin(clients, eq(clients.id, orders.clientId))
    .where(eq(orders.publicToken, token))
    .limit(1);
  if (!o || o.status !== "PAID") return null;
  const items = await db
    .select({ description: orderItems.description, qty: orderItems.qty, total: orderItems.total, professional: professionals.nickname, professionalName: professionals.name })
    .from(orderItems)
    .leftJoin(professionals, eq(professionals.id, orderItems.professionalId))
    .where(and(eq(orderItems.orderId, o.id), isNull(orderItems.deletedAt)))
    .orderBy(asc(orderItems.createdAt));
  const pays = await db.select({ method: payments.method, amount: payments.amount, installments: payments.installments }).from(payments).where(eq(payments.orderId, o.id));
  const salon = await getPublicSalonById(o.tenantId);
  return salon ? { order: o, items, payments: pays, salon } : null;
}

export async function appointmentByToken(token: string) {
  if (!isToken(token)) return null;
  const [a] = await db
    .select({ id: appointments.id, tenantId: appointments.tenantId, startsAt: appointments.startsAt, endsAt: appointments.endsAt, status: appointments.status, price: appointments.price, serviceName: services.name, professionalName: professionals.name, professionalNick: professionals.nickname, clientName: clients.fullName, walkInName: appointments.walkInName })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
    .leftJoin(clients, eq(clients.id, appointments.clientId))
    .where(and(eq(appointments.publicToken, token), isNull(appointments.deletedAt)))
    .limit(1);
  if (!a) return null;
  const salon = await getPublicSalonById(a.tenantId);
  return salon ? { appt: a, salon } : null;
}

/** A cliente confirma presença pelo link. Só vale para horário marcado e futuro. */
export async function confirmByToken(token: string): Promise<"ok" | "already" | "invalid"> {
  if (!isToken(token)) return "invalid";
  const [a] = await db.select({ id: appointments.id, status: appointments.status, startsAt: appointments.startsAt }).from(appointments).where(eq(appointments.publicToken, token)).limit(1);
  if (!a) return "invalid";
  if (a.status === "CONFIRMED") return "already";
  if (a.status !== "SCHEDULED" || a.startsAt.getTime() < Date.now()) return "invalid";
  await db.update(appointments).set({ status: "CONFIRMED", confirmedAt: new Date(), updatedAt: new Date() }).where(and(eq(appointments.id, a.id), eq(appointments.status, "SCHEDULED")));
  return "ok";
}
