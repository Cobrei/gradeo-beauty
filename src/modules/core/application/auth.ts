import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db/client";
import { roles, sessions, tenants, userRoles, users } from "@/db/schema";
import type { Actor } from "@/lib/context";
import { DomainError } from "@/lib/errors";

const COOKIE = "gradeo_beauty_session";
const SESSION_DAYS = 14;

export async function hashPassword(plain: string) {
  return hash(plain, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

function sessionId(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function login(email: string, password: string, userAgent?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const [user] = await db.select().from(users).where(and(eq(users.email, email.toLowerCase().trim()), isNull(users.deletedAt))).limit(1);
  // Mesmo custo de tempo com e sem usuário (evita enumeração).
  const valid = user ? await verify(user.passwordHash, password) : (await verify(await hashPassword("x"), "y"), false);
  if (!user || !valid || !user.isActive) return { ok: false, message: "E-mail ou senha incorretos." };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ id: sessionId(token), tenantId: user.tenantId, userId: user.id, expiresAt, userAgent: userAgent?.slice(0, 255) });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sessionId(token)));
  jar.delete(COOKIE);
}

/** Ator da requisição atual; cacheado por request (React cache). */
export const getActor = cache(async (): Promise<Actor | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const now = new Date();
  const rows = await db
    .select({ userId: users.id, tenantId: users.tenantId, name: users.name, isActive: users.isActive, tenantActive: tenants.isActive })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(tenants, eq(tenants.id, users.tenantId))
    .where(and(eq(sessions.id, sessionId(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  const u = rows[0];
  if (!u || !u.isActive || !u.tenantActive) return null;

  const grants = await db
    .select({ permissions: roles.permissions, branchId: userRoles.branchId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, u.userId), isNull(userRoles.deletedAt)));

  const permissions = new Set<string>();
  const branchIds: string[] = [];
  for (const g of grants) {
    for (const p of g.permissions) permissions.add(p);
    if (g.branchId) branchIds.push(g.branchId);
  }
  const h = await headers();
  return {
    tenantId: u.tenantId,
    userId: u.userId,
    name: u.name,
    permissions,
    branchIds: [...new Set(branchIds)],
    correlationId: h.get("x-request-id") ?? randomBytes(8).toString("hex"),
  };
});

export async function requireActor(): Promise<Actor> {
  const a = await getActor();
  if (!a) throw new DomainError("AUTH_REQUIRED", "Faça login para continuar.");
  return a;
}
