import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";
import { auditCols, baseCols } from "./_common";

/** Salão (ou rede). É o tenant. */
export const tenants = pgTable("core_tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 120 }).notNull(),
  legalName: varchar("legal_name", { length: 160 }),
  cnpj: varchar("cnpj", { length: 14 }),
  taxRegime: varchar("tax_regime", { length: 24 }).notNull().default("SIMPLES"),
  timezone: varchar("timezone", { length: 48 }).notNull().default("America/Sao_Paulo"),
  isActive: boolean("is_active").notNull().default(true),
  ...auditCols,
});

/** Unidade do salão. Multi-unidade desde o dia 1 (ADR-002). */
export const branches = pgTable(
  "core_branches",
  {
    ...baseCols,
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 16 }).notNull(),
    cnpj: varchar("cnpj", { length: 14 }),
    inepCode: varchar("inep_code", { length: 12 }),
    addressJson: jsonb("address_json"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [uniqueIndex("uq_branches_tenant_code").on(t.tenantId, t.code)],
);

export const users = pgTable(
  "core_users",
  {
    ...baseCols,
    personId: uuid("person_id"),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("uq_users_tenant_email").on(t.tenantId, t.email)],
);

/** Papel = conjunto de ações `modulo.recurso.acao` (ADR-006). */
export const roles = pgTable(
  "core_roles",
  {
    ...baseCols,
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    isSystem: boolean("is_system").notNull().default(false),
  },
  (t) => [uniqueIndex("uq_roles_tenant_code").on(t.tenantId, t.code)],
);

/** Usuário × papel, opcionalmente restrito a uma unidade. */
export const userRoles = pgTable(
  "core_user_roles",
  {
    ...baseCols,
    userId: uuid("user_id").notNull().references(() => users.id),
    roleId: uuid("role_id").notNull().references(() => roles.id),
    branchId: uuid("branch_id").references(() => branches.id),
  },
  (t) => [index("ix_user_roles_user").on(t.tenantId, t.userId)],
);

export const sessions = pgTable(
  "core_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: varchar("user_agent", { length: 255 }),
  },
  (t) => [index("ix_sessions_user").on(t.userId)],
);

/** Trilha de auditoria (ADR-006). Particionar por mês quando crescer. */
export const auditLog = pgTable(
  "core_audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tenantId: uuid("tenant_id").notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    userId: uuid("user_id"),
    correlationId: varchar("correlation_id", { length: 64 }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ix_audit_entity").on(t.tenantId, t.entity, t.entityId)],
);

/** Registro de consulta a dado sensível (LGPD art. 11/14). */
export const sensitiveAccessLog = pgTable(
  "core_sensitive_access_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull(),
    subjectType: varchar("subject_type", { length: 32 }).notNull(), // child, person
    subjectId: uuid("subject_id").notNull(),
    dataKind: varchar("data_kind", { length: 32 }).notNull(), // health_full, pickup_list, document
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ix_sensitive_subject").on(t.tenantId, t.subjectId)],
);

/** Consentimento por finalidade (ADR-006). */
export const consents = pgTable(
  "core_consents",
  {
    ...baseCols,
    subjectType: varchar("subject_type", { length: 32 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    purpose: varchar("purpose", { length: 48 }).notNull(), // photo_diary, photo_marketing, health_data, messaging
    grantedByPersonId: uuid("granted_by_person_id").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    evidenceJson: jsonb("evidence_json"),
  },
  (t) => [index("ix_consents_subject").on(t.tenantId, t.subjectId, t.purpose)],
);

/** Outbox de eventos (ADR-005). */
export const outbox = pgTable(
  "core_outbox",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tenantId: uuid("tenant_id").notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 48 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    attempts: bigint("attempts", { mode: "number" }).notNull().default(0),
  },
  (t) => [index("ix_outbox_unpublished").on(t.publishedAt, t.occurredAt)],
);

export const processedEvents = pgTable("core_processed_events", {
  eventId: bigint("event_id", { mode: "number" }).notNull(),
  consumer: varchar("consumer", { length: 64 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("uq_processed").on(t.eventId, t.consumer)]);

/** Numeração sequencial por tenant/unidade/tipo (ex.: contrato, recibo). */
export const sequences = pgTable(
  "core_sequences",
  {
    tenantId: uuid("tenant_id").notNull(),
    branchId: uuid("branch_id"),
    kind: varchar("kind", { length: 32 }).notNull(),
    lastNumber: bigint("last_number", { mode: "number" }).notNull().default(0),
  },
  (t) => [uniqueIndex("uq_sequences").on(t.tenantId, t.branchId, t.kind)],
);
