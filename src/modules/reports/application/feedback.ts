import "server-only";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { appointments, clients, feedback, professionals, services } from "@/db/schema";
import { assertCan, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { dayRange } from "@/lib/time";

/** Média e distribuição das notas no período, no geral e por profissional. */
export async function feedbackSummary(actor: Actor, from: string, to: string) {
  assertCan(actor, "report.read");
  const start = dayRange(from).start;
  const end = dayRange(to).end;
  return withTenantRead(actor, async (tx) => {
    const where = and(isNull(feedback.deletedAt), gte(feedback.createdAt, start), lte(feedback.createdAt, end));
    const [all] = await tx.select({ n: sql<number>`count(*)::int`, avg: sql<string>`coalesce(avg(${feedback.score}),0)`, promoters: sql<number>`count(*) filter (where ${feedback.score} >= 4)::int`, detractors: sql<number>`count(*) filter (where ${feedback.score} <= 3)::int` }).from(feedback).where(where);
    const byPro = await tx
      .select({ name: professionals.name, color: professionals.color, n: sql<number>`count(*)::int`, avg: sql<string>`avg(${feedback.score})` })
      .from(feedback)
      .innerJoin(professionals, eq(professionals.id, feedback.professionalId))
      .where(where)
      .groupBy(professionals.name, professionals.color)
      .orderBy(desc(sql`avg(${feedback.score})`));
    const comments = await tx
      .select({ score: feedback.score, comment: feedback.comment, at: feedback.createdAt, client: clients.fullName, clientId: feedback.clientId })
      .from(feedback)
      .leftJoin(clients, eq(clients.id, feedback.clientId))
      .where(and(where, sql`${feedback.comment} is not null`))
      .orderBy(desc(feedback.createdAt))
      .limit(10);
    return { total: all.n, avg: Number(all.avg), promoters: all.promoters, detractors: all.detractors, byPro: byPro.map((p) => ({ ...p, avg: Number(p.avg) })), comments };
  });
}

/** Notas baixas (1 a 3) ainda não tratadas pela dona, para o painel. */
export async function pendingLowFeedback(actor: Actor) {
  assertCan(actor, "crm.client.read");
  return withTenantRead(actor, (tx) =>
    tx
      .select({ id: feedback.id, score: feedback.score, comment: feedback.comment, at: feedback.createdAt, clientId: feedback.clientId, client: clients.fullName, phone: clients.phone, service: services.name, pro: professionals.name })
      .from(feedback)
      .innerJoin(appointments, eq(appointments.id, feedback.appointmentId))
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .leftJoin(clients, eq(clients.id, feedback.clientId))
      .leftJoin(professionals, eq(professionals.id, feedback.professionalId))
      .where(and(isNull(feedback.deletedAt), isNull(feedback.handledAt), lte(feedback.score, 3), gte(feedback.createdAt, new Date(Date.now() - 30 * 86400000))))
      .orderBy(desc(feedback.createdAt))
      .limit(10),
  );
}

export async function markFeedbackHandled(actor: Actor, id: string) {
  assertCan(actor, "crm.client.read");
  await withTenantTx(actor, (tx, ctx) => tx.update(feedback).set({ handledAt: new Date(), ...ctx.stampUpdate() }).where(eq(feedback.id, id)));
}
