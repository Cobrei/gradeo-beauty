import { date, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { baseCols } from "./_common";

/** Caixa do dia. */
export const cashSessions = pgTable(
  "pos_cash_sessions",
  {
    ...baseCols,
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    openedBy: uuid("opened_by").notNull(),
    openingAmount: numeric("opening_amount", { precision: 19, scale: 4 }).notNull().default("0"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by"),
    closingAmount: numeric("closing_amount", { precision: 19, scale: 4 }),
    expectedCash: numeric("expected_cash", { precision: 19, scale: 4 }),
    summaryJson: jsonb("summary_json"),
    notes: text("notes"),
  },
  (t) => [index("ix_cash_sessions_tenant").on(t.tenantId, t.openedAt)],
);

/** Sangria / suprimento / despesa paga do caixa. */
export const cashMoves = pgTable(
  "pos_cash_moves",
  {
    ...baseCols,
    sessionId: uuid("session_id").notNull().references(() => cashSessions.id),
    kind: varchar("kind", { length: 8 }).notNull(), // IN, OUT
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    description: varchar("description", { length: 160 }).notNull(),
  },
  (t) => [index("ix_cash_moves_session").on(t.tenantId, t.sessionId)],
);

/** Comanda. */
export const orders = pgTable(
  "pos_orders",
  {
    ...baseCols,
    number: integer("number").notNull(),
    /** link público do recibo (/recibo/<token>) */
    publicToken: uuid("public_token").notNull().defaultRandom(),
    clientId: uuid("client_id"),
    walkInName: varchar("walk_in_name", { length: 120 }),
    status: varchar("status", { length: 10 }).notNull().default("OPEN"), // OPEN, PAID, CANCELLED
    subtotal: numeric("subtotal", { precision: 19, scale: 4 }).notNull().default("0"),
    discount: numeric("discount", { precision: 19, scale: 4 }).notNull().default("0"),
    discountReason: varchar("discount_reason", { length: 120 }),
    voucherId: uuid("voucher_id"),
    voucherDiscount: numeric("voucher_discount", { precision: 19, scale: 4 }).notNull().default("0"),
    total: numeric("total", { precision: 19, scale: 4 }).notNull().default("0"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    serviceDate: date("service_date").notNull(),
    cashSessionId: uuid("cash_session_id"),
    notes: text("notes"),
  },
  (t) => [index("ix_orders_tenant_date").on(t.tenantId, t.serviceDate), index("ix_orders_client").on(t.tenantId, t.clientId), index("ix_orders_status").on(t.tenantId, t.status)],
);

export const orderItems = pgTable(
  "pos_order_items",
  {
    ...baseCols,
    orderId: uuid("order_id").notNull().references(() => orders.id),
    kind: varchar("kind", { length: 8 }).notNull(), // SERVICE, PRODUCT, PACKAGE
    refId: uuid("ref_id").notNull(),
    description: varchar("description", { length: 160 }).notNull(),
    professionalId: uuid("professional_id"),
    appointmentId: uuid("appointment_id"),
    qty: numeric("qty", { precision: 12, scale: 3 }).notNull().default("1"),
    unitPrice: numeric("unit_price", { precision: 19, scale: 4 }).notNull(),
    discount: numeric("discount", { precision: 19, scale: 4 }).notNull().default("0"),
    total: numeric("total", { precision: 19, scale: 4 }).notNull(),
    commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    commissionAmount: numeric("commission_amount", { precision: 19, scale: 4 }).notNull().default("0"),
    /** Pago com crédito de pacote (não entra no caixa, mas gera comissão). */
    paidWithCreditId: uuid("paid_with_credit_id"),
  },
  (t) => [index("ix_order_items_order").on(t.tenantId, t.orderId), index("ix_order_items_prof").on(t.tenantId, t.professionalId)],
);

export const payments = pgTable(
  "pos_payments",
  {
    ...baseCols,
    orderId: uuid("order_id").notNull().references(() => orders.id),
    method: varchar("method", { length: 10 }).notNull(), // PIX, CASH, CREDIT, DEBIT, TRANSFER, OTHER
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    installments: integer("installments").notNull().default(1),
    feePct: numeric("fee_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    cashSessionId: uuid("cash_session_id"),
  },
  (t) => [index("ix_payments_order").on(t.tenantId, t.orderId), index("ix_payments_session").on(t.tenantId, t.cashSessionId)],
);

/** Fechamento de comissão por profissional e período (snapshot imutável). */
export const commissionClosings = pgTable(
  "pos_commission_closings",
  {
    ...baseCols,
    professionalId: uuid("professional_id").notNull(),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    servicesTotal: numeric("services_total", { precision: 19, scale: 4 }).notNull(),
    productsTotal: numeric("products_total", { precision: 19, scale: 4 }).notNull(),
    commissionTotal: numeric("commission_total", { precision: 19, scale: 4 }).notNull(),
    adjustments: numeric("adjustments", { precision: 19, scale: 4 }).notNull().default("0"),
    itemsJson: jsonb("items_json").notNull(),
    status: varchar("status", { length: 8 }).notNull().default("CLOSED"), // CLOSED, PAID
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** NF-e do repasse: número e quando foi marcada como enviada. */
    nfNumber: varchar("nf_number", { length: 40 }),
    nfAt: timestamp("nf_at", { withTimezone: true }),
  },
  (t) => [index("ix_comm_closings").on(t.tenantId, t.professionalId, t.fromDate)],
);
