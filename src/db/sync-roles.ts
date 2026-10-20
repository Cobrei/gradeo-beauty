/**
 * Sincroniza as permissões dos papéis do sistema com o código.
 *
 * Os papéis ficam gravados por escola (uma linha por tenant), então criar uma
 * permissão nova no código não chega sozinha a quem já está usando o sistema.
 * Isto roda em todo deploy, depois das migrações: papéis do sistema passam a
 * valer o que o código diz; papéis criados pela própria escola não são tocados.
 */
import { and, eq } from "drizzle-orm";
import { db, rawSql } from "./client";
import { roles } from "./schema";
import { SYSTEM_ROLES } from "../lib/permissions";

async function main() {
  let updated = 0;
  for (const [code, def] of Object.entries(SYSTEM_ROLES)) {
    const rows = await db
      .select({ id: roles.id, tenantId: roles.tenantId, permissions: roles.permissions })
      .from(roles)
      .where(and(eq(roles.code, code), eq(roles.isSystem, true)));
    for (const r of rows) {
      const current = JSON.stringify([...((r.permissions as string[]) ?? [])].sort());
      const wanted = JSON.stringify([...(def.permissions as string[])].sort());
      if (current === wanted) continue;
      await db.update(roles).set({ name: def.name, permissions: def.permissions as string[], updatedAt: new Date() }).where(eq(roles.id, r.id));
      updated++;
    }
  }
  console.log(updated ? `papéis sincronizados: ${updated}` : "papéis já estavam em dia");
  await rawSql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
