import { date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { baseCols } from "./_common";

/**
 * Atendimento agendado. Status:
 * REQUESTED (pedido online, aguardando) → SCHEDULED → CONFIRMED → IN_SERVICE → DONE
 * ou NO_SHOW / CANCELLED. Preço é fotografado no agendamento.
 */
export const appointments = pgTable(
  "agd_appointments",
  {
    ...baseCols,
    /** link público do horário (/h/<token>): a cliente vê e confirma presença */
    publicToken: uuid("public_token").notNull().defaultRandom(),
    clientId: uuid("client_id"),
    walkInName: varchar("walk_in_name", { length: 120 }),
    professionalId: uuid("professional_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 12 }).notNull().default("SCHEDULED"),
    source: varchar("source", { length: 12 }).notNull().default("APP"), // APP, ONLINE, WALKIN, CAMPAIGN
    price: numeric("price", { precision: 19, scale: 4 }).notNull().default("0"),
    notes: text("notes"),
    voucherCode: varchar("voucher_code", { length: 24 }),
    orderId: uuid("order_id"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    thanksSentAt: timestamp("thanks_sent_at", { withTimezone: true }),
    cancelReason: varchar("cancel_reason", { length: 160 }),
  },
  (t) => [
    index("ix_appt_day").on(t.tenantId, t.startsAt),
    index("ix_appt_prof_day").on(t.tenantId, t.professionalId, t.startsAt),
    index("ix_appt_client").on(t.tenantId, t.clientId, t.startsAt),
  ],
);

/** Bloqueio de agenda (almoço, folga, curso). professional_id null = salão inteiro. */
export const agendaBlocks = pgTable(
  "agd_blocks",
  {
    ...baseCols,
    professionalId: uuid("professional_id"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: varchar("reason", { length: 120 }),
  },
  (t) => [index("ix_blocks_day").on(t.tenantId, t.startsAt)],
);

/** Lista de espera: preenche cancelamentos sozinha. */
export const waitlist = pgTable(
  "agd_waitlist",
  {
    ...baseCols,
    clientId: uuid("client_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    professionalId: uuid("professional_id"),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    periodPref: varchar("period_pref", { length: 8 }).notNull().default("ANY"), // ANY, MORNING, AFTERNOON, EVENING
    note: varchar("note", { length: 160 }),
    status: varchar("status", { length: 10 }).notNull().default("WAITING"), // WAITING, NOTIFIED, BOOKED, EXPIRED
    priority: integer("priority").notNull().default(0),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (t) => [index("ix_waitlist_tenant").on(t.tenantId, t.status)],
);

/** Pesquisa de satisfação: uma nota (1 a 5) por atendimento, dada pela cliente no link público. */
export const feedback = pgTable(
  "agd_feedback",
  {
    ...baseCols,
    appointmentId: uuid("appointment_id").notNull(),
    clientId: uuid("client_id"),
    professionalId: uuid("professional_id"),
    score: integer("score").notNull(),
    comment: text("comment"),
    handledAt: timestamp("handled_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("uq_feedback_appt").on(t.tenantId, t.appointmentId), index("ix_feedback_tenant").on(t.tenantId, t.createdAt)],
);
