import { sql } from "drizzle-orm";
import { db, type Tx } from "@/db/client";
import { auditLog, outbox } from "@/db/schema";
import { ForbiddenError } from "./errors";

/** Quem está agindo. Construído a partir da sessão (core/auth). */
export interface Actor {
  tenantId: string;
  userId: string;
  name: string;
  permissions: Set<string>;
  /** unidades em que o usuário tem papel; vazio = todas as unidades do tenant */
  branchIds: string[];
  correlationId: string;
}

export function can(actor: Actor, action: string): boolean {
  return actor.permissions.has("*") || actor.permissions.has(action);
}

export function assertCan(actor: Actor, action: string): void {
  if (!can(actor, action)) throw new ForbiddenError(action);
}

/**
 * Toda escrita roda aqui: transação + `SET LOCAL app.tenant_id` (RLS, ADR-002).
 * O callback recebe a transação e um utilitário de auditoria/eventos.
 */
export async function withTenantTx<T>(actor: Actor, fn: (tx: Tx, ctx: TxContext) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${actor.tenantId}, true)`);
    const ctx = new TxContext(tx, actor);
    return fn(tx, ctx);
  });
}

/** Leitura simples com contexto de tenant (também em transação, para o RLS valer). */
export async function withTenantRead<T>(actor: Actor, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${actor.tenantId}, true)`);
    return fn(tx);
  });
}

export class TxContext {
  constructor(
    private readonly tx: Tx,
    readonly actor: Actor,
  ) {}

  /** Colunas de auditoria para INSERT. */
  stampCreate() {
    return { tenantId: this.actor.tenantId, createdBy: this.actor.userId, updatedBy: this.actor.userId };
  }
  /** Colunas de auditoria para UPDATE. */
  stampUpdate() {
    return { updatedBy: this.actor.userId, updatedAt: new Date() };
  }

  async audit(entity: string, entityId: string, action: "create" | "update" | "delete" | "transition", before: unknown, after: unknown) {
    await this.tx.insert(auditLog).values({
      tenantId: this.actor.tenantId,
      entity,
      entityId,
      action,
      before: before ?? null,
      after: after ?? null,
      userId: this.actor.userId,
      correlationId: this.actor.correlationId,
    });
  }

  /** Evento de domínio na mesma transação (outbox, ADR-005). */
  async emit(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>) {
    await this.tx.insert(outbox).values({ tenantId: this.actor.tenantId, eventType, aggregateType, aggregateId, payload });
  }
}
