import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { baseCols } from "./_common";

/** Regras de público (segmento). Avaliado em SQL no momento do disparo. */
export interface SegmentRule {
  preset?: "ALL" | "INACTIVE" | "BIRTHDAY_MONTH" | "VIP" | "ONE_VISIT" | "OVERDUE_CYCLE" | "NEW_30D" | "CUSTOM";
  inactiveDays?: number;
  minVisits?: number;
  minSpent?: number; // centavos
  serviceId?: string;
  professionalId?: string;
  tags?: string[];
  gender?: "F" | "M";
  lastVisitBefore?: string;
  lastVisitAfter?: string;
}

export const vouchers = pgTable(
  "mkt_vouchers",
  {
    ...baseCols,
    code: varchar("code", { length: 24 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    campaignId: uuid("campaign_id"),
    clientId: uuid("client_id"), // pessoal (um por cliente) ou null (genérico)
    kind: varchar("kind", { length: 8 }).notNull(), // PERCENT, AMOUNT
    value: numeric("value", { precision: 19, scale: 4 }).notNull(),
    minOrder: numeric("min_order", { precision: 19, scale: 4 }).notNull().default("0"),
    serviceId: uuid("service_id"), // válido só para um serviço
    validFrom: date("valid_from").notNull(),
    validUntil: date("valid_until").notNull(),
    maxUses: integer("max_uses").notNull().default(1),
    uses: integer("uses").notNull().default(0),
    status: varchar("status", { length: 8 }).notNull().default("ACTIVE"), // ACTIVE, PAUSED, EXPIRED
  },
  (t) => [uniqueIndex("uq_voucher_code").on(t.tenantId, t.code), index("ix_voucher_campaign").on(t.tenantId, t.campaignId), index("ix_voucher_client").on(t.tenantId, t.clientId)],
);

export const voucherRedemptions = pgTable(
  "mkt_voucher_redemptions",
  {
    ...baseCols,
    voucherId: uuid("voucher_id").notNull().references(() => vouchers.id),
    orderId: uuid("order_id").notNull(),
    clientId: uuid("client_id"),
    discount: numeric("discount", { precision: 19, scale: 4 }).notNull(),
    orderTotal: numeric("order_total", { precision: 19, scale: 4 }).notNull(),
  },
  (t) => [index("ix_redemptions_voucher").on(t.tenantId, t.voucherId)],
);

export const campaigns = pgTable(
  "mkt_campaigns",
  {
    ...baseCols,
    name: varchar("name", { length: 120 }).notNull(),
    channel: varchar("channel", { length: 10 }).notNull().default("WHATSAPP"), // WHATSAPP, EMAIL
    segment: jsonb("segment").$type<SegmentRule>().notNull().default({ preset: "ALL" }),
    /** Mensagem com variáveis {nome}, {salao}, {voucher}, {validade}, {link}. */
    message: text("message").notNull(),
    voucherKind: varchar("voucher_kind", { length: 8 }), // null = sem voucher
    voucherValue: numeric("voucher_value", { precision: 19, scale: 4 }),
    voucherDays: integer("voucher_days"),
    voucherServiceId: uuid("voucher_service_id"),
    status: varchar("status", { length: 10 }).notNull().default("DRAFT"), // DRAFT, READY, SENDING, SENT, PAUSED
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    audienceCount: integer("audience_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
  },
  (t) => [index("ix_campaigns_tenant").on(t.tenantId, t.status)],
);

/** Uma mensagem por cliente por campanha/automação. */
export const messages = pgTable(
  "mkt_messages",
  {
    ...baseCols,
    campaignId: uuid("campaign_id"),
    automationKind: varchar("automation_kind", { length: 24 }),
    clientId: uuid("client_id").notNull(),
    appointmentId: uuid("appointment_id"),
    channel: varchar("channel", { length: 10 }).notNull(),
    to: varchar("to", { length: 160 }).notNull(),
    body: text("body").notNull(),
    voucherId: uuid("voucher_id"),
    status: varchar("status", { length: 10 }).notNull().default("QUEUED"), // QUEUED, SENT, FAILED, SKIPPED, OPTOUT
    providerId: varchar("provider_id", { length: 120 }),
    error: varchar("error", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** Para o modo MANUAL: a dona marca como enviada ao clicar no link. */
    openedAt: timestamp("opened_at", { withTimezone: true }),
  },
  (t) => [index("ix_messages_campaign").on(t.tenantId, t.campaignId, t.status), index("ix_messages_client").on(t.tenantId, t.clientId), index("ix_messages_queue").on(t.status, t.createdAt)],
);

/** Automações: lembrete 24h, pós-atendimento, convite de retorno, aniversário. */
export const automations = pgTable(
  "mkt_automations",
  {
    ...baseCols,
    kind: varchar("kind", { length: 24 }).notNull(), // REMINDER_24H, THANKS, RETURN_INVITE, BIRTHDAY, WIN_BACK
    enabled: boolean("enabled").notNull().default(false),
    template: text("template").notNull(),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("uq_automation_kind").on(t.tenantId, t.kind)],
);
