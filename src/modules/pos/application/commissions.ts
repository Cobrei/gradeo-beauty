import "server-only";
import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { commissionClosings, orderItems, orders, professionals } from "@/db/schema";
import { assertCan, can, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError } from "@/lib/errors";
import { fromCents, toCents, type Cents } from "@/lib/money";
import { myProfessionalId } from "@/modules/team/application/use-cases";

const c = (v: unknown) => toCents(String(v ?? "0"));

export interface CommissionLine { professionalId: string; professionalName: string; color: string; services: Cents; products: Cents; commission: Cents; items: number; closed: boolean }

/** Comissões por profissional num período (comandas pagas). Profissional vê só a própria. */
export async function commissionReport(actor: Actor, from: string, to: string): Promise<CommissionLine[]> {
  const all = can(actor, "commission.read_all");
  if (!all) assertCan(actor, "commission.read_own");
  const mine = all ? null : await myProfessionalId(actor);
  if (!all && !mine) return [];
  return withTenantRead(actor, async (tx) => {
    const rows = await tx
      .select({
        professionalId: orderItems.professionalId,
        professionalName: professionals.name,
        color: professionals.color,
        services: sql<string>`coalesce(sum(case when ${orderItems.kind} <> 'PRODUCT' then ${orderItems.unitPrice} * ${orderItems.qty} else 0 end),0)`,
        products: sql<string>`coalesce(sum(case when ${orderItems.kind} = 'PRODUCT' then ${orderItems.total} else 0 end),0)`,
        commission: sql<string>`coalesce(sum(${orderItems.commissionAmount}),0)`,
        items: sql<number>`count(*)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(professionals, eq(professionals.id, orderItems.professionalId))
      .where(and(isNull(orderItems.deletedAt), eq(orders.status, "PAID"), gte(orders.serviceDate, from), lte(orders.serviceDate, to), mine ? eq(orderItems.professionalId, mine) : undefined))
      .groupBy(orderItems.professionalId, professionals.name, professionals.color)
      .orderBy(asc(professionals.name));
    const closings = await tx.select({ professionalId: commissionClosings.professionalId }).from(commissionClosings).where(and(eq(commissionClosings.fromDate, from), eq(commissionClosings.toDate, to)));
    const closedSet = new Set(closings.map((x) => x.professionalId));
    return rows.map((r) => ({ professionalId: r.professionalId!, professionalName: r.professionalName, color: r.color, services: c(r.services), products: c(r.products), commission: c(r.commission), items: r.items, closed: closedSet.has(r.professionalId!) }));
  });
}

export async function commissionDetail(actor: Actor, professionalId: string, from: string, to: string) {
  const all = can(actor, "commission.read_all");
  if (!all) {
    assertCan(actor, "commission.read_own");
    if ((await myProfessionalId(actor)) !== professionalId) throw new DomainError("AUTH_FORBIDDEN", "Você só pode ver as próprias comissões.");
  }
  return withTenantRead(actor, (tx) =>
    tx
      .select({ date: orders.serviceDate, number: orders.number, description: orderItems.description, kind: orderItems.kind, base: sql<string>`${orderItems.unitPrice} * ${orderItems.qty}`, total: orderItems.total, pct: orderItems.commissionPct, commission: orderItems.commissionAmount })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(isNull(orderItems.deletedAt), eq(orders.status, "PAID"), eq(orderItems.professionalId, professionalId), gte(orders.serviceDate, from), lte(orders.serviceDate, to)))
      .orderBy(asc(orders.serviceDate), asc(orders.number)),
  );
}

export async function closeCommission(actor: Actor, professionalId: string, from: string, to: string, adjustments: Cents = 0) {
  assertCan(actor, "commission.close");
  const [line] = (await commissionReport(actor, from, to)).filter((l) => l.professionalId === professionalId);
  if (!line) throw new DomainError("EMPTY", "Nada a fechar neste período.");
  if (line.closed) throw new DomainError("CLOSED", "Período já fechado para esta profissional.");
  const items = await commissionDetail(actor, professionalId, from, to);
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.insert(commissionClosings).values({ ...ctx.stampCreate(), professionalId, fromDate: from, toDate: to, servicesTotal: fromCents(line.services), productsTotal: fromCents(line.products), commissionTotal: fromCents(line.commission + adjustments), adjustments: fromCents(adjustments), itemsJson: items });
  });
}

export async function listClosings(actor: Actor) {
  assertCan(actor, "commission.read_all");
  return withTenantRead(actor, (tx) =>
    tx
      .select({ closing: commissionClosings, professionalName: professionals.name })
      .from(commissionClosings)
      .innerJoin(professionals, eq(professionals.id, commissionClosings.professionalId))
      .orderBy(desc(commissionClosings.createdAt))
      .limit(50),
  );
}

export async function markClosingPaid(actor: Actor, id: string) {
  assertCan(actor, "commission.close");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(commissionClosings).set({ status: "PAID", paidAt: new Date(), ...ctx.stampUpdate() }).where(eq(commissionClosings.id, id));
  });
}
