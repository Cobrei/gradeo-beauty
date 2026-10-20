import { randomBytes } from "node:crypto";
import type { Actor } from "./context";

export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

/** Ator do próprio sistema (agendamento público, automações, jobs). Tem todas as permissões dentro do tenant. */
export function systemActor(tenantId: string, name = "sistema"): Actor {
  return { tenantId, userId: SYSTEM_USER_ID, name, permissions: new Set(["*"]), branchIds: [], correlationId: randomBytes(8).toString("hex") };
}
