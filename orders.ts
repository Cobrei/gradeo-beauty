import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { appointments, cashMoves, cashSessions, clientCredits, clients, orderItems, orders, packages, payments, products, professionals, sequences, services, stockMoves, voucherRedemptions, vouchers } from "@/db/schema";
import { assertCan, can, withTenantRead, withTenantTx, type Actor, type TxContext } from "@/lib/context";
import type { Tx } from "@/db/client";
import { DomainError, NotFoundError } from "@/lib/errors";
import { fromCents, toCents, type Cents } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { pct, totals, voucherDiscount } from "../domain/rules";

const c = (v: unknown) => toCents(String(v ?? "0"));

async function nextNumber(tx: Tx, tenantId: string, kind: string): Promise<number> {
  const [upd] = await tx
    .update(sequences)
    .set({ lastNumber: sql`${sequences.lastNumber} + 1` })
    .where(and(eq(sequences.tenantId, tenantId), eq(sequences.kind, kind), isNull(sequences.branchId)))
    .returning({ n: sequences.lastNumber });
  if (upd) return upd.n;
  // primeira comanda do salão: parte do maior número já existente (migrações/seed)
  const [mx] = await tx.select({ m: sql<number>`coalesce(max(${orders.number}), 0)::int` }).from(orders);
  const [row] = await tx.insert(sequences).values({ tenantId, kind, lastNumber: mx.m + 1 }).returning({ n: sequences.lastNumber });
  return row.n;
}

async function recalc(tx: Tx, ctx: TxContext, orderId: string) {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) throw new NotFoundError("order", orderId);
  if (o.status !== "OPEN") throw new DomainError("ORDER_CLOSED", "Comanda já fechada.");
  const items = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, orderId), isNull(orderItems.deletedAt)));
  let voucher: Cents = 0;
  if (o.voucherId) {
    const [v] = await tx.select().from(vouchers).where(eq(vouchers.id, o.voucherId)).limit(1);
    if (v) {
      const eligible = items.filter((i) => !v.serviceId || (i.kind === "SERVICE" && i.refId === v.serviceId)).reduce((a, i) => a + c(i.total), 0);
      voucher = voucherDiscount(v.kind as "PERCENT" | "AMOUNT", v.kind === "PERCENT" ? Number(v.value) : c(v.value), eligible);
    }
  }
  const t = totals(items.map((i) => ({ total: c(i.total) })), c(o.discount), voucher);
  await tx.update(orders).set({ subtotal: fromCents(t.subtotal), discount: fromCents(t.discount), voucherDiscount: fromCents(t.voucher), total: fromCents(t.total), ...ctx.stampUpdate() }).where(eq(orders.id, orderId));
  return t;
}

/** Abre comanda (opcionalmente já a partir de atendimentos da agenda). Reaproveita comanda aberta da mesma cliente no dia. */
export async function openOrder(actor: Actor, input: { clientId?: string | null; walkInName?: string | null; appointmentIds?: string[] }): Promise<string> {
  assertCan(actor, "pos.order.write");
  return withTenantTx(actor, async (tx, ctx) => {
    const today = todayISO();
    let clientId = input.clientId ?? null;
    let walkInName = input.walkInName ?? null;
    const appts = input.appointmentIds?.length ? await tx.select().from(appointments).where(inArray(appointments.id, input.appointmentIds)) : [];
    if (appts.length) {
      const already = appts.find((a) => a.orderId);
      if (already) return already.orderId!;
      clientId = clientId ?? appts[0].clientId;
      walkInName = walkInName ?? appts[0].walkInName;
    }
    if (!clientId && !walkInName) throw new DomainError("VALIDATION", "Informe a cliente.");
    let orderId: string;
    const [open] = clientId ? await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.clientId, clientId), eq(orders.status, "OPEN"), eq(orders.serviceDate, today))).limit(1) : [];
    if (open) orderId = open.id;
    else {
      const [session] = await tx.select({ id: cashSessions.id }).from(cashSessions).where(isNull(cashSessions.closedAt)).orderBy(desc(cashSessions.openedAt)).limit(1);
      const [o] = await tx
        .insert(orders)
        .values({ ...ctx.stampCreate(), number: await nextNumber(tx, actor.tenantId, "order"), clientId, walkInName: clientId ? null : walkInName, serviceDate: today, cashSessionId: session?.id ?? null })
        .returning({ id: orders.id });
      orderId = o.id;
    }
    for (const a of appts) {
      await addItem(actor, orderId, { kind: "SERVICE", refId: a.serviceId, professionalId: a.professionalId, qty: 1, unitPrice: c(a.price), appointmentId: a.id }, tx, ctx);
      await tx.update(appointments).set({ orderId, ...ctx.stampUpdate() }).where(eq(appointments.id, a.id));
    }
    return orderId;
  });
}

export interface AddItemInput { kind: "SERVICE" | "PRODUCT" | "PACKAGE"; refId: string; professionalId?: string | null; qty?: number; unitPrice?: Cents; discount?: Cents; appointmentId?: string; useCredit?: boolean }

export async function addItem(actor: Actor, orderId: string, input: AddItemInput, tx0?: Tx, ctx0?: TxContext) {
  assertCan(actor, "pos.order.write");
  const run = async (tx: Tx, ctx: TxContext) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!o || o.status !== "OPEN") throw new DomainError("ORDER_CLOSED", "Comanda não está aberta.");
    const qty = input.qty ?? 1;
    let description = "";
    let unitPrice: Cents = input.unitPrice ?? 0;
    let commissionPct = 0;
    let paidWithCreditId: string | null = null;
    let discount = input.discount ?? 0;
    const pro = input.professionalId ? (await tx.select().from(professionals).where(eq(professionals.id, input.professionalId)).limit(1))[0] : null;

    if (input.kind === "SERVICE") {
      const [s] = await tx.select().from(services).where(eq(services.id, input.refId)).limit(1);
      if (!s) throw new NotFoundError("service");
      description = s.name;
      if (input.unitPrice === undefined) unitPrice = c(s.price);
      commissionPct = s.commissionPct != null ? Number(s.commissionPct) : Number(pro?.commissionPct ?? 0);
      if (input.useCredit && o.clientId) {
        const [credit] = await tx
          .select()
          .from(clientCredits)
          .where(and(eq(clientCredits.clientId, o.clientId), eq(clientCredits.serviceId, s.id), sql`${clientCredits.remaining} > 0`, gte(clientCredits.expiresAt, todayISO())))
          .orderBy(asc(clientCredits.expiresAt))
          .limit(1);
        if (!credit) throw new DomainError("NO_CREDIT", "A cliente não tem crédito de pacote para este serviço.");
        await tx.update(clientCredits).set({ remaining: sql`${clientCredits.remaining} - 1`, ...ctx.stampUpdate() }).where(eq(clientCredits.id, credit.id));
        paidWithCreditId = credit.id;
        discount = unitPrice * qty; // não cobra; comissão continua sobre o preço cheio
      }
    } else if (input.kind === "PRODUCT") {
      const [p] = await tx.select().from(products).where(eq(products.id, input.refId)).limit(1);
      if (!p) throw new NotFoundError("product");
      description = p.name;
      if (input.unitPrice === undefined) unitPrice = c(p.salePrice);
      commissionPct = Number(pro?.productCommissionPct ?? 0);
    } else {
      const [pk] = await tx.select().from(packages).where(eq(packages.id, input.refId)).limit(1);
      if (!pk) throw new NotFoundError("package");
      description = `Pacote: ${pk.name}`;
      if (input.unitPrice === undefined) unitPrice = c(pk.price);
      commissionPct = Number(pro?.commissionPct ?? 0);
    }
    const total = Math.max(unitPrice * qty - discount, 0);
    const commissionAmount = pct(paidWithCreditId ? unitPrice * qty : total, commissionPct);
    await tx.insert(orderItems).values({
      ...ctx.stampCreate(),
      orderId,
      kind: input.kind,
      refId: input.refId,
      description,
      professionalId: input.professionalId ?? null,
      appointmentId: input.appointmentId ?? null,
      qty: String(qty),
      unitPrice: fromCents(unitPrice),
      discount: fromCents(discount),
      total: fromCents(total),
      commissionPct: commissionPct.toFixed(2),
      commissionAmount: fromCents(commissionAmount),
      paidWithCreditId,
    });
    await recalc(tx, ctx, orderId);
  };
  if (tx0 && ctx0) return run(tx0, ctx0);
  return withTenantTx(actor, run);
}

export async function removeItem(actor: Actor, orderId: string, itemId: string) {
  assertCan(actor, "pos.order.write");
  return withTenantTx(actor, async (tx, ctx) => {
    const [it] = await tx.select().from(orderItems).where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId))).limit(1);
    if (!it) throw new NotFoundError("item");
    if (it.paidWithCreditId) await tx.update(clientCredits).set({ remaining: sql`${clientCredits.remaining} + 1` }).where(eq(clientCredits.id, it.paidWithCreditId));
    if (it.appointmentId) await tx.update(appointments).set({ orderId: null }).where(eq(appointments.id, it.appointmentId));
    await tx.update(orderItems).set({ deletedAt: new Date(), ...ctx.stampUpdate() }).where(eq(orderItems.id, itemId));
    await recalc(tx, ctx, orderId);
  });
}

export async function setDiscount(actor: Actor, orderId: string, amount: Cents, reason?: string) {
  assertCan(actor, "pos.order.discount");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(orders).set({ discount: fromCents(Math.max(amount, 0)), discountReason: reason || null, ...ctx.stampUpdate() }).where(and(eq(orders.id, orderId), eq(orders.status, "OPEN")));
    await recalc(tx, ctx, orderId);
  });
}

export async function applyVoucher(actor: Actor, orderId: string, code: string) {
  assertCan(actor, "mkt.voucher.redeem");
  return withTenantTx(actor, async (tx, ctx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!o || o.status !== "OPEN") throw new DomainError("ORDER_CLOSED", "Comanda não está aberta.");
    const [v] = await tx.select().from(vouchers).where(eq(vouchers.code, code.trim().toUpperCase())).limit(1);
    if (!v) throw new DomainError("VOUCHER_INVALID", "Voucher não encontrado.");
    const today = todayISO();
    if (v.status !== "ACTIVE") throw new DomainError("VOUCHER_INVALID", "Voucher pausado ou expirado.");
    if (today < v.validFrom || today > v.validUntil) throw new DomainError("VOUCHER_INVALID", `Voucher válido de ${v.validFrom} a ${v.validUntil}.`);
    if (v.uses >= v.maxUses) throw new DomainError("VOUCHER_INVALID", "Este voucher já foi usado.");
    if (v.clientId && v.clientId !== o.clientId) throw new DomainError("VOUCHER_INVALID", "Este voucher é pessoal de outra cliente.");
    if (c(o.subtotal) < c(v.minOrder)) throw new DomainError("VOUCHER_INVALID", `Pedido mínimo de R$ ${fromCents(c(v.minOrder))}.`);
    await tx.update(orders).set({ voucherId: v.id, ...ctx.stampUpdate() }).where(eq(orders.id, orderId));
    const t = await recalc(tx, ctx, orderId);
    if (t.voucher <= 0) {
      await tx.update(orders).set({ voucherId: null }).where(eq(orders.id, orderId));
      await recalc(tx, ctx, orderId);
      throw new DomainError("VOUCHER_INVALID", "Este voucher não se aplica aos itens da comanda.");
    }
    return v;
  });
}

export async function removeVoucher(actor: Actor, orderId: string) {
  assertCan(actor, "pos.order.write");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.update(orders).set({ voucherId: null, voucherDiscount: "0", ...ctx.stampUpdate() }).where(and(eq(orders.id, orderId), eq(orders.status, "OPEN")));
    await recalc(tx, ctx, orderId);
  });
}

/** Fecha a comanda: pagamentos, estoque, créditos de pacote, agenda, voucher e métricas da cliente. */
export async function payOrder(actor: Actor, orderId: string, pays: { method: string; amount: Cents; installments?: number }[]) {
  assertCan(actor, "pos.order.write");
  return withTenantTx(actor, async (tx, ctx) => {
    const t = await recalc(tx, ctx, orderId);
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const items = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, orderId), isNull(orderItems.deletedAt)));
    if (!items.length) throw new DomainError("EMPTY", "A comanda está vazia.");
    const paid = pays.reduce((a, p) => a + p.amount, 0);
    if (paid !== t.total) throw new DomainError("PAYMENT_MISMATCH", `Pagamentos somam R$ ${fromCents(paid)} e a comanda é R$ ${fromCents(t.total)}.`);
    const [session] = await tx.select({ id: cashSessions.id }).from(cashSessions).where(isNull(cashSessions.closedAt)).orderBy(desc(cashSessions.openedAt)).limit(1);
    if (pays.some((p) => p.method === "CASH") && !session) throw new DomainError("NO_CASH", "Abra o caixa antes de receber em dinheiro.");
    const now = new Date();
    for (const p of pays.filter((p) => p.amount > 0)) {
      await tx.insert(payments).values({ ...ctx.stampCreate(), orderId, method: p.method, amount: fromCents(p.amount), installments: p.installments ?? 1, paidAt: now, cashSessionId: session?.id ?? null });
    }
    // estoque e pacotes
    for (const it of items) {
      if (it.kind === "PRODUCT") {
        await tx.insert(stockMoves).values({ ...ctx.stampCreate(), productId: it.refId, kind: "SALE", qty: it.qty, orderId, reason: `Comanda #${o.number}` });
        await tx.update(products).set({ stockQty: sql`${products.stockQty} - ${it.qty}` }).where(eq(products.id, it.refId));
      }
      if (it.kind === "PACKAGE" && o.clientId) {
        const [pk] = await tx.select().from(packages).where(eq(packages.id, it.refId)).limit(1);
        if (pk) {
          const expiresAt = new Date(now.getTime() + pk.validityDays * 86400000).toISOString().slice(0, 10);
          for (const pi of pk.items) {
            const n = pi.qty * Number(it.qty);
            await tx.insert(clientCredits).values({ ...ctx.stampCreate(), clientId: o.clientId, packageId: pk.id, serviceId: pi.serviceId, orderId, total: n, remaining: n, expiresAt });
          }
        }
      }
    }
    // agenda
    const apptIds = items.map((i) => i.appointmentId).filter(Boolean) as string[];
    if (apptIds.length) await tx.update(appointments).set({ status: "DONE", orderId, ...ctx.stampUpdate() }).where(inArray(appointments.id, apptIds));
    // voucher
    if (o.voucherId && t.voucher > 0) {
      await tx.update(vouchers).set({ uses: sql`${vouchers.uses} + 1` }).where(eq(vouchers.id, o.voucherId));
      await tx.insert(voucherRedemptions).values({ ...ctx.stampCreate(), voucherId: o.voucherId, orderId, clientId: o.clientId, discount: fromCents(t.voucher), orderTotal: fromCents(t.total) });
    }
    await tx.update(orders).set({ status: "PAID", paidAt: now, cashSessionId: session?.id ?? o.cashSessionId, ...ctx.stampUpdate() }).where(eq(orders.id, orderId));
    // métricas da cliente
    if (o.clientId) {
      const hasService = items.some((i) => i.kind === "SERVICE");
      await tx.execute(sql`
        update crm_clients cl set
          total_spent = total_spent + ${fromCents(t.total)}::numeric,
          visits_count = visits_count + ${hasService ? 1 : 0},
          first_visit_at = coalesce(first_visit_at, ${o.serviceDate}::date),
          last_visit_at = greatest(coalesce(last_visit_at, ${o.serviceDate}::date), ${o.serviceDate}::date),
          avg_interval_days = (
            select case when count(*) > 1 then ((max(d) - min(d)) / (count(*) - 1))::int else null end
            from (select distinct service_date d from pos_orders where client_id = cl.id and status = 'PAID') x
          ),
          updated_at = now()
        where cl.id = ${o.clientId}`);
    }
    await ctx.emit("order.paid", "order", orderId, { total: t.total, clientId: o.clientId });
    return t;
  });
}

export async function cancelOrder(actor: Actor, orderId: string, reason: string) {
  assertCan(actor, "pos.order.cancel");
  return withTenantTx(actor, async (tx, ctx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!o) throw new NotFoundError("order");
    if (o.status === "PAID") throw new DomainError("PAID", "Comanda paga não pode ser cancelada; faça um estorno manual no caixa.");
    const items = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, orderId), isNull(orderItems.deletedAt)));
    for (const it of items) {
      if (it.paidWithCreditId) await tx.update(clientCredits).set({ remaining: sql`${clientCredits.remaining} + 1` }).where(eq(clientCredits.id, it.paidWithCreditId));
      if (it.appointmentId) await tx.update(appointments).set({ orderId: null }).where(eq(appointments.id, it.appointmentId));
    }
    await tx.update(orders).set({ status: "CANCELLED", notes: reason, ...ctx.stampUpdate() }).where(eq(orders.id, orderId));
  });
}

export async function getOrder(actor: Actor, orderId: string) {
  assertCan(actor, "pos.order.read");
  return withTenantRead(actor, async (tx) => {
    const [o] = await tx.select({ order: orders, clientName: clients.fullName, clientPhone: clients.phone, clientVisits: clients.visitsCount }).from(orders).leftJoin(clients, eq(clients.id, orders.clientId)).where(eq(orders.id, orderId)).limit(1);
    if (!o) throw new NotFoundError("order", orderId);
    const items = await tx
      .select({ item: orderItems, professionalName: professionals.name })
      .from(orderItems)
      .leftJoin(professionals, eq(professionals.id, orderItems.professionalId))
      .where(and(eq(orderItems.orderId, orderId), isNull(orderItems.deletedAt)))
      .orderBy(asc(orderItems.createdAt));
    const pays = await tx.select().from(payments).where(eq(payments.orderId, orderId));
    const voucher = o.order.voucherId ? (await tx.select().from(vouchers).where(eq(vouchers.id, o.order.voucherId)).limit(1))[0] : null;
    const credits = o.order.clientId
      ? await tx
          .select({ serviceId: clientCredits.serviceId, remaining: clientCredits.remaining, expiresAt: clientCredits.expiresAt })
          .from(clientCredits)
          .where(and(eq(clientCredits.clientId, o.order.clientId), sql`${clientCredits.remaining} > 0`, gte(clientCredits.expiresAt, todayISO())))
      : [];
    const activeVouchers = o.order.clientId ? await tx.select().from(vouchers).where(and(eq(vouchers.clientId, o.order.clientId), eq(vouchers.status, "ACTIVE"), gte(vouchers.validUntil, todayISO()), sql`${vouchers.uses} < ${vouchers.maxUses}`)) : [];
    return { ...o, items, payments: pays, voucher, credits, activeVouchers };
  });
}

export async function listOrders(actor: Actor, filter: { status?: "OPEN" | "PAID" | "CANCELLED"; from?: string; to?: string } = {}) {
  assertCan(actor, "pos.order.read");
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: orders.id, number: orders.number, clientName: sql<string>`coalesce(${clients.fullName}, ${orders.walkInName}, 'Cliente')`, status: orders.status, total: orders.total, serviceDate: orders.serviceDate, paidAt: orders.paidAt, items: sql<string>`(select string_agg(oi.description, ', ') from pos_order_items oi where oi.order_id = ${sql.raw(`"pos_orders"."id"`)} and oi.deleted_at is null)` })
      .from(orders)
      .leftJoin(clients, eq(clients.id, orders.clientId))
      .where(and(isNull(orders.deletedAt), filter.status ? eq(orders.status, filter.status) : undefined, filter.from ? gte(orders.serviceDate, filter.from) : undefined, filter.to ? lte(orders.serviceDate, filter.to) : undefined))
      .orderBy(desc(orders.serviceDate), desc(orders.number))
      .limit(300),
  );
}

// ---------- Caixa ----------

export async function currentCashSession(actor: Actor) {
  if (!can(actor, "pos.cash.read") && !can(actor, "pos.order.write")) return null;
  return withTenantRead(actor, async (tx) => {
    const [s] = await tx.select().from(cashSessions).where(isNull(cashSessions.closedAt)).orderBy(desc(cashSessions.openedAt)).limit(1);
    return s ?? null;
  });
}

export async function openCashSession(actor: Actor, openingAmount: Cents) {
  assertCan(actor, "pos.cash.manage");
  return withTenantTx(actor, async (tx, ctx) => {
    const [open] = await tx.select({ id: cashSessions.id }).from(cashSessions).where(isNull(cashSessions.closedAt)).limit(1);
    if (open) throw new DomainError("CASH_OPEN", "Já existe um caixa aberto.");
    const [s] = await tx.insert(cashSessions).values({ ...ctx.stampCreate(), openedBy: actor.userId, openingAmount: fromCents(openingAmount) }).returning({ id: cashSessions.id });
    return s.id;
  });
}

export async function cashSummary(actor: Actor, sessionId: string) {
  assertCan(actor, "pos.cash.read");
  return withTenantRead(actor, async (tx) => {
    const [s] = await tx.select().from(cashSessions).where(eq(cashSessions.id, sessionId)).limit(1);
    if (!s) throw new NotFoundError("cash_session");
    const byMethod = await tx.select({ method: payments.method, total: sql<string>`sum(${payments.amount})` }).from(payments).where(eq(payments.cashSessionId, sessionId)).groupBy(payments.method);
    const moves = await tx.select().from(cashMoves).where(eq(cashMoves.sessionId, sessionId)).orderBy(asc(cashMoves.createdAt));
    const cashIn = c(byMethod.find((m) => m.method === "CASH")?.total ?? 0);
    const movesIn = moves.filter((m) => m.kind === "IN").reduce((a, m) => a + c(m.amount), 0);
    const movesOut = moves.filter((m) => m.kind === "OUT").reduce((a, m) => a + c(m.amount), 0);
    const expectedCash = c(s.openingAmount) + cashIn + movesIn - movesOut;
    const ordersCount = await tx.select({ n: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${orders.total}),0)` }).from(orders).where(and(eq(orders.cashSessionId, sessionId), eq(orders.status, "PAID")));
    return { session: s, byMethod: byMethod.map((m) => ({ method: m.method, total: c(m.total) })), moves, expectedCash, ordersCount: ordersCount[0].n, revenue: c(ordersCount[0].total) };
  });
}

export async function addCashMove(actor: Actor, sessionId: string, kind: "IN" | "OUT", amount: Cents, description: string) {
  assertCan(actor, "pos.cash.manage");
  if (amount <= 0) throw new DomainError("VALIDATION", "Valor deve ser maior que zero.");
  if (!description.trim()) throw new DomainError("VALIDATION", "Descreva o lançamento.");
  return withTenantTx(actor, async (tx, ctx) => {
    await tx.insert(cashMoves).values({ ...ctx.stampCreate(), sessionId, kind, amount: fromCents(amount), description: description.trim() });
  });
}

export async function closeCashSession(actor: Actor, sessionId: string, closingAmount: Cents, notes?: string) {
  assertCan(actor, "pos.cash.manage");
  const summary = await cashSummary(actor, sessionId);
  return withTenantTx(actor, async (tx, ctx) => {
    const openOrders = await tx.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, "OPEN"), eq(orders.serviceDate, todayISO())));
    await tx
      .update(cashSessions)
      .set({ closedAt: new Date(), closedBy: actor.userId, closingAmount: fromCents(closingAmount), expectedCash: fromCents(summary.expectedCash), summaryJson: { byMethod: summary.byMethod, revenue: summary.revenue, ordersCount: summary.ordersCount, openOrders: openOrders[0].n }, notes: notes || null, ...ctx.stampUpdate() })
      .where(eq(cashSessions.id, sessionId));
  });
}

export async function listCashSessions(actor: Actor) {
  assertCan(actor, "pos.cash.read");
  return withTenantRead(actor, (tx) => tx.select().from(cashSessions).orderBy(desc(cashSessions.openedAt)).limit(60));
}

