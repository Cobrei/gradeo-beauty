import { sql } from "drizzle-orm";
import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Colunas obrigatórias do Esquadrão (ADR-002, ADR-006):
 * tenant em tudo, auditoria em tudo, soft delete em tudo, optimistic lock.
 */
export const tenantCols = {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
};

export const auditCols = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
};

export const baseCols = { ...tenantCols, ...auditCols };
