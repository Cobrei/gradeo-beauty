import { date, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { baseCols } from "./_common";

/** A cliente. Métricas (visitas, gasto, última visita) são atualizadas ao fechar comanda. */
export const clients = pgTable(
  "crm_clients",
  {
    ...baseCols,
    fullName: varchar("full_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }), // só dígitos, com DDD
    email: varchar("email", { length: 160 }),
    birthDate: date("birth_date"),
    gender: varchar("gender", { length: 1 }).notNull().default("N"), // F, M, N
    cpf: varchar("cpf", { length: 11 }),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    source: varchar("source", { length: 24 }).notNull().default("MANUAL"), // MANUAL, IMPORT, ONLINE, WALKIN, INDICACAO
    referredByClientId: uuid("referred_by_client_id"),
    preferredProfessionalId: uuid("preferred_professional_id"),
    /** Consentimento de marketing (LGPD): null = nunca perguntou; opt-out registra data. */
    marketingOptIn: timestamp("marketing_opt_in", { withTimezone: true }),
    marketingOptOut: timestamp("marketing_opt_out", { withTimezone: true }),
    firstVisitAt: date("first_visit_at"),
    lastVisitAt: date("last_visit_at"),
    visitsCount: integer("visits_count").notNull().default(0),
    totalSpent: numeric("total_spent", { precision: 19, scale: 4 }).notNull().default("0"),
    /** Intervalo médio entre visitas (dias), recalculado ao fechar comanda. */
    avgIntervalDays: integer("avg_interval_days"),
  },
  (t) => [index("ix_clients_tenant_name").on(t.tenantId, t.fullName), index("ix_clients_tenant_phone").on(t.tenantId, t.phone), index("ix_clients_last_visit").on(t.tenantId, t.lastVisitAt)],
);

/** Ficha técnica e observações: fórmula de coloração, alergia, preferência, nota livre. Imutável (corrige-se com nova nota). */
export const clientNotes = pgTable(
  "crm_client_notes",
  {
    ...baseCols,
    clientId: uuid("client_id").notNull().references(() => clients.id),
    kind: varchar("kind", { length: 16 }).notNull().default("NOTE"), // FORMULA, ALLERGY, PREFERENCE, NOTE
    serviceId: uuid("service_id"),
    professionalId: uuid("professional_id"),
    text: text("text").notNull(),
    photoUrl: text("photo_url"),
    noteDate: date("note_date").notNull(),
  },
  (t) => [index("ix_client_notes_client").on(t.tenantId, t.clientId, t.noteDate)],
);

/** Créditos de pacote da cliente (um registro por serviço do pacote comprado). */
export const clientCredits = pgTable(
  "crm_client_credits",
  {
    ...baseCols,
    clientId: uuid("client_id").notNull().references(() => clients.id),
    packageId: uuid("package_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    orderId: uuid("order_id"),
    total: integer("total").notNull(),
    remaining: integer("remaining").notNull(),
    expiresAt: date("expires_at").notNull(),
  },
  (t) => [index("ix_client_credits_client").on(t.tenantId, t.clientId, t.serviceId)],
);
