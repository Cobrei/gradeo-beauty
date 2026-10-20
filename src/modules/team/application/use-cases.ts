import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { professionals, roles, userRoles, users, type OpeningHours } from "@/db/schema";
import { assertCan, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError, NotFoundError } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { hashPassword } from "@/modules/core/application/auth";

export const professionalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nickname: z.string().trim().max(40).optional(),
  phone: z.string().trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#b8475f"),
  commissionPct: z.coerce.number().min(0).max(100).default(40),
  productCommissionPct: z.coerce.number().min(0).max(100).default(10),
  acceptsOnline: z.boolean().default(true),
  isActive: z.boolean().default(true),
  serviceIds: z.array(z.string().uuid()).default([]),
  workingHours: z.record(z.string(), z.object({ open: z.string(), close: z.string() }).nullable()).default({}),
  // acesso ao sistema (opcional)
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").optional().or(z.literal("")),
  roleCode: z.enum(["PROFESSIONAL", "RECEPTION", "MANAGER", "FINANCE"]).default("PROFESSIONAL"),
});

export async function listProfessionals(actor: Actor, opts: { includeInactive?: boolean } = {}) {
  return withTenantRead(actor, (tx) =>
    tx
      .select()
      .from(professionals)
      .where(and(isNull(professionals.deletedAt), opts.includeInactive ? undefined : eq(professionals.isActive, true)))
      .orderBy(asc(professionals.sortOrder), asc(professionals.name)),
  );
}

export async function getProfessional(actor: Actor, id: string) {
  return withTenantRead(actor, async (tx) => {
    const [p] = await tx.select().from(professionals).where(eq(professionals.id, id)).limit(1);
    if (!p) throw new NotFoundError("professional", id);
    const user = p.userId ? (await tx.select({ email: users.email, isActive: users.isActive }).from(users).where(eq(users.id, p.userId)).limit(1))[0] : null;
    const role = p.userId
      ? (await tx.select({ code: roles.code }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(and(eq(userRoles.userId, p.userId), isNull(userRoles.deletedAt))).limit(1))[0]
      : null;
    return { ...p, userEmail: user?.email ?? null, userRoleCode: role?.code ?? null };
  });
}

/** Profissional do usuário logado (para a visão "minha agenda"). */
export async function myProfessionalId(actor: Actor): Promise<string | null> {
  return withTenantRead(actor, async (tx) => {
    const [p] = await tx.select({ id: professionals.id }).from(professionals).where(and(eq(professionals.userId, actor.userId), isNull(professionals.deletedAt))).limit(1);
    return p?.id ?? null;
  });
}

export async function saveProfessional(actor: Actor, id: string | null, raw: unknown) {
  assertCan(actor, "team.professional.manage");
  const i = professionalSchema.parse(raw);
  const values = {
    name: i.name,
    nickname: i.nickname || null,
    phone: normalizePhone(i.phone),
    color: i.color,
    commissionPct: i.commissionPct.toFixed(2),
    productCommissionPct: i.productCommissionPct.toFixed(2),
    acceptsOnline: i.acceptsOnline,
    isActive: i.isActive,
    serviceIds: i.serviceIds,
    workingHours: i.workingHours as OpeningHours,
  };
  return withTenantTx(actor, async (tx, ctx) => {
    let profId = id;
    let userId: string | null = null;
    if (profId) {
      const [before] = await tx.select().from(professionals).where(eq(professionals.id, profId)).limit(1);
      if (!before) throw new NotFoundError("professional", profId);
      userId = before.userId;
      await tx.update(professionals).set({ ...values, ...ctx.stampUpdate() }).where(eq(professionals.id, profId));
    } else {
      const [row] = await tx.insert(professionals).values({ ...values, ...ctx.stampCreate() }).returning({ id: professionals.id });
      profId = row.id;
    }

    // Acesso ao sistema
    if (i.email) {
      assertCan(actor, "core.user.manage");
      // e-mail é o login: único em todo o sistema (consulta de sistema, fora do salão)
      const [dup] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, i.email), isNull(users.deletedAt))).limit(1);
      if (dup && dup.id !== userId) throw new DomainError("EMAIL_TAKEN", "Este e-mail já é usado para entrar em outra conta. Use outro e-mail.");
      const [role] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.code, i.roleCode)).limit(1);
      if (!role) throw new DomainError("NO_ROLE", "Papel não encontrado.");
      if (userId) {
        const [current] = await tx.select({ code: roles.code }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(and(eq(userRoles.userId, userId), isNull(userRoles.deletedAt))).limit(1);
        const isOwner = current?.code === "OWNER";
        if (isOwner && !i.isActive) throw new DomainError("OWNER_LOCKED", "A dona do salão não pode ser desativada.");
        await tx.update(users).set({ email: i.email, name: i.name, isActive: isOwner ? true : i.isActive, ...(i.password ? { passwordHash: await hashPassword(i.password) } : {}), ...ctx.stampUpdate() }).where(eq(users.id, userId));
        // o perfil da dona nunca muda por esta tela; os demais só mudam quando o campo muda
        if (!isOwner && current?.code !== i.roleCode) await tx.update(userRoles).set({ roleId: role.id, ...ctx.stampUpdate() }).where(eq(userRoles.userId, userId));
      } else {
        if (!i.password) throw new DomainError("VALIDATION", "Defina uma senha inicial para criar o acesso.");
        const [u] = await tx.insert(users).values({ ...ctx.stampCreate(), name: i.name, email: i.email, passwordHash: await hashPassword(i.password), isActive: i.isActive }).returning({ id: users.id });
        await tx.insert(userRoles).values({ ...ctx.stampCreate(), userId: u.id, roleId: role.id });
        await tx.update(professionals).set({ userId: u.id }).where(eq(professionals.id, profId));
      }
    } else if (userId && !i.isActive) {
      const [current] = await tx.select({ code: roles.code }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(and(eq(userRoles.userId, userId), isNull(userRoles.deletedAt))).limit(1);
      if (current?.code === "OWNER") throw new DomainError("OWNER_LOCKED", "A dona do salão não pode ser desativada.");
      await tx.update(users).set({ isActive: false, ...ctx.stampUpdate() }).where(eq(users.id, userId));
    }
    return profId;
  });
}
