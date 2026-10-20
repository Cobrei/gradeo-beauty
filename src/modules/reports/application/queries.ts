import "server-only";
import { and, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { appointments, clients, messages, orderItems, orders, payments, products, professionals } from "@/db/schema";
import { assertCan, can, withTenantRead, type Actor } from "@/lib/context";
import { toCents, type Cents } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { dayRange } from "@/lib/time";

const c = (v: unknown) => toCents(String(v ?? "0"));

export async function dashboard(actor: Actor) {
  const today = todayISO();
  const { start, end } = dayRange(today);
  return withTenantRead(actor, async (tx) => {
    const [appts] = await tx
      .select({ total: sql<number>`count(*)::int`, done: sql<number>`count(*) filter (where status = 'DONE')::int`, requested: sql<number>`count(*) filter (where status = 'REQUESTED')::int`, noShow: sql<number>`count(*) filter (where status = 'NO_SHOW')::int` })
      .from(appointments)
      .where(and(isNull(appointments.deletedAt), gte(appointments.startsAt, start), lt(appointments.startsAt, end), sql`status <> 'CANCELLED'`));
    const [rev] = await tx.select({ total: sql<string>`coalesce(sum(total),0)`, n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, "PAID"), eq(orders.serviceDate, today)));
    const [month] = await tx.select({ total: sql<string>`coalesce(sum(total),0)` }).from(orders).where(and(eq(orders.status, "PAID"), gte(orders.serviceDate, today.slice(0, 7) + "-01"), lte(orders.serviceDate, today)));
    const [openOrders] = await tx.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "OPEN"));
    const [inactive] = await tx
      .select({ n: sql<number>`count(*)::int`, v: sql<string>`coalesce(sum(case when visits_count > 0 then total_spent / visits_count else 0 end),0)` })
      .from(clients)
      .where(and(isNull(clients.deletedAt), lte(clients.lastVisitAt, sql`${today}::date - 45`)));
    const [pendingMsgs] = await tx.select({ n: sql<number>`count(*)::int` }).from(messages).where(eq(messages.status, "QUEUED"));
    const lowStock = can(actor, "catalog.product.read") ? await tx.select({ id: products.id, name: products.name, stockQty: products.stockQty, minStock: products.minStock }).from(products).where(and(isNull(products.deletedAt), eq(products.isActive, true), sql`${products.stockQty} <= ${products.minStock}`, sql`${products.minStock} > 0`)).limit(5) : [];
    const [newClients] = await tx.select({ n: sql<number>`count(*)::int` }).from(clients).where(and(isNull(clients.deletedAt), gte(clients.createdAt, new Date(Date.now() - 30 * 86400000))));
    return {
      appts,
      revenueToday: c(rev.total),
      ordersToday: rev.n,
      revenueMonth: c(month.total),
      openOrders: openOrders.n,
      inactiveCount: inactive.n,
      inactiveValue: c(inactive.v),
      pendingMessages: pendingMsgs.n,
      lowStock,
      newClients30d: newClients.n,
    };
  });
}

export interface PeriodReport {
  revenue: Cents;
  orders: number;
  ticket: Cents;
  byDay: { day: string; total: Cents; orders: number }[];
  byProfessional: { name: string; color: string; total: Cents; items: number; commission: Cents }[];
  byService: { name: string; total: Cents; qty: number }[];
  byMethod: { method: string; total: Cents }[];
  products: Cents;
  services: Cents;
  newClients: number;
  returningClients: number;
  uniqueClients: number;
  noShows: number;
  appointmentsDone: number;
  discounts: Cents;
  vouchers: Cents;
}

export async function periodReport(actor: Actor, from: string, to: string): Promise<PeriodReport> {
  assertCan(actor, "report.read");
  return withTenantRead(actor, async (tx) => {
    const paid = and(eq(orders.status, "PAID"), gte(orders.serviceDate, from), lte(orders.serviceDate, to));
    const [tot] = await tx.select({ revenue: sql<string>`coalesce(sum(total),0)`, n: sql<number>`count(*)::int`, discounts: sql<string>`coalesce(sum(discount),0)`, vouchers: sql<string>`coalesce(sum(voucher_discount),0)` }).from(orders).where(paid);
    const byDay = await tx.select({ day: orders.serviceDate, total: sql<string>`sum(total)`, n: sql<number>`count(*)::int` }).from(orders).where(paid).groupBy(orders.serviceDate).orderBy(orders.serviceDate);
    const byPro = await tx
      .select({ name: professionals.name, color: professionals.color, total: sql<string>`coalesce(sum(${orderItems.total}),0)`, items: sql<number>`count(*)::int`, commission: sql<string>`coalesce(sum(${orderItems.commissionAmount}),0)` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(professionals, eq(professionals.id, orderItems.professionalId))
      .where(and(paid, isNull(orderItems.deletedAt)))
      .groupBy(professionals.name, professionals.color)
      .orderBy(sql`sum(${orderItems.total}) desc`);
    const bySvc = await tx
      .select({ name: orderItems.description, total: sql<string>`coalesce(sum(${orderItems.total}),0)`, qty: sql<number>`sum(${orderItems.qty})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(paid, isNull(orderItems.deletedAt), eq(orderItems.kind, "SERVICE")))
      .groupBy(orderItems.description)
      .orderBy(sql`sum(${orderItems.total}) desc`)
      .limit(12);
    const [kinds] = await tx
      .select({ products: sql<string>`coalesce(sum(case when ${orderItems.kind}='PRODUCT' then ${orderItems.total} else 0 end),0)`, services: sql<string>`coalesce(sum(case when ${orderItems.kind}<>'PRODUCT' then ${orderItems.total} else 0 end),0)` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(paid, isNull(orderItems.deletedAt)));
    const byMethod = await tx.select({ method: payments.method, total: sql<string>`sum(${payments.amount})` }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(paid).groupBy(payments.method);
    const [cl] = await tx
      .select({
        unique: sql<number>`count(distinct client_id)::int`,
        newc: sql<number>`count(distinct client_id) filter (where (select first_visit_at from crm_clients x where x.id = pos_orders.client_id) between ${from} and ${to})::int`,
      })
      .from(orders)
      .where(and(paid, sql`client_id is not null`));
    const { start } = dayRange(from);
    const { end } = dayRange(to);
    const [ap] = await tx
      .select({ noShows: sql<number>`count(*) filter (where status = 'NO_SHOW')::int`, done: sql<number>`count(*) filter (where status = 'DONE')::int` })
      .from(appointments)
      .where(and(isNull(appointments.deletedAt), gte(appointments.startsAt, start), lt(appointments.startsAt, end)));
    return {
      revenue: c(tot.revenue),
      orders: tot.n,
      ticket: tot.n ? Math.round(c(tot.revenue) / tot.n) : 0,
      discounts: c(tot.discounts),
      vouchers: c(tot.vouchers),
      byDay: byDay.map((d) => ({ day: d.day, total: c(d.total), orders: d.n })),
      byProfessional: byPro.map((p) => ({ name: p.name, color: p.color, total: c(p.total), items: p.items, commission: c(p.commission) })),
      byService: bySvc.map((s) => ({ name: s.name, total: c(s.total), qty: s.qty })),
      byMethod: byMethod.map((m) => ({ method: m.method, total: c(m.total) })),
      products: c(kinds.products),
      services: c(kinds.services),
      uniqueClients: cl.unique,
      newClients: cl.newc,
      returningClients: cl.unique - cl.newc,
      noShows: ap.noShows,
      appointmentsDone: ap.done,
    };
  });
}

/** Retenção: de quem veio no mês M, quantos voltaram em até 60 dias. Últimos 6 meses. */
export async function retentionCohorts(actor: Actor) {
  assertCan(actor, "report.read");
  return withTenantRead(actor, (tx) =>
    tx.execute<{ month: string; clients: number; returned: number }>(sql`
      with first_in_month as (
        select client_id, date_trunc('month', service_date)::date as m, min(service_date) as d
        from pos_orders where status = 'PAID' and client_id is not null and service_date >= (current_date - interval '7 months')
        group by client_id, date_trunc('month', service_date))
      select to_char(m, 'YYYY-MM') as month, count(*)::int as clients,
        count(*) filter (where exists (select 1 from pos_orders o2 where o2.client_id = f.client_id and o2.status = 'PAID' and o2.service_date > f.d and o2.service_date <= f.d + 60))::int as returned
      from first_in_month f group by m order by m`),
  );
}

