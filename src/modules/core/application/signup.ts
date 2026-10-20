import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { automations, professionals, roles, salonSettings, services, tenants, userRoles, users } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { SYSTEM_ROLES } from "@/lib/permissions";
import { normalizePhone, slugify } from "@/lib/phone";
import { DEFAULT_AUTOMATIONS, DEFAULT_HOURS, SEGMENTS } from "@/modules/catalog/domain/presets";
import { hashPassword, login } from "./auth";

export const signupSchema = z.object({
  salonName: z.string().trim().min(2, "Informe o nome do salão.").max(120),
  segment: z.string().refine((s) => s in SEGMENTS, "Escolha o tipo de negócio."),
  ownerName: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  phone: z.string().trim().min(10, "Informe o WhatsApp com DDD."),
  password: z.string().min(6, "Senha com pelo menos 6 caracteres."),
  serviceNames: z.array(z.string()).default([]),
  professionals: z.array(z.string().trim().min(1)).max(30).default([]),
});
export type SignupInput = z.infer<typeof signupSchema>;

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "salao";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [hit] = await db.select({ id: salonSettings.id }).from(salonSettings).where(eq(salonSettings.slug, candidate)).limit(1);
    if (!hit) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Cria salão + dona + papéis + serviços escolhidos + profissionais + automações padrão. Já faz login. */
export async function signup(raw: unknown, userAgent?: string): Promise<{ tenantId: string; slug: string }> {
  const input = signupSchema.parse(raw);
  const phone = normalizePhone(input.phone);
  if (!phone) throw new DomainError("VALIDATION", "WhatsApp inválido. Use DDD + número.");

  const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, input.email), isNull(users.deletedAt))).limit(1);
  if (taken) throw new DomainError("EMAIL_TAKEN", "Já existe uma conta com este e-mail. Entre com sua senha.");

  const slug = await uniqueSlug(input.salonName);
  const passwordHash = await hashPassword(input.password);
  const preset = SEGMENTS[input.segment];
  const chosen = preset.services.filter((s) => input.serviceNames.includes(s.name));

  const tenantId = await db.transaction(async (tx) => {
    const [t] = await tx.insert(tenants).values({ name: input.salonName }).returning();
    await tx.execute(sql`select set_config('app.tenant_id', ${t.id}, true)`);
    const stamp = { tenantId: t.id };

    const roleIds: Record<string, string> = {};
    for (const [code, r] of Object.entries(SYSTEM_ROLES)) {
      const [row] = await tx.insert(roles).values({ ...stamp, code, name: r.name, permissions: r.permissions as string[], isSystem: true }).returning();
      roleIds[code] = row.id;
    }
    const [owner] = await tx.insert(users).values({ ...stamp, name: input.ownerName, email: input.email, passwordHash }).returning();
    await tx.insert(userRoles).values({ ...stamp, userId: owner.id, roleId: roleIds.OWNER });

    await tx.insert(salonSettings).values({ ...stamp, slug, segment: input.segment, whatsapp: phone, phone, openingHours: DEFAULT_HOURS, messageSenderName: input.salonName, onboardingDone: true });

    if (chosen.length) {
      await tx.insert(services).values(
        chosen.map((s, i) => ({ ...stamp, name: s.name, category: s.category, durationMin: s.durationMin, price: s.price.toFixed(4), returnIntervalDays: s.returnIntervalDays ?? null, sortOrder: i })),
      );
    }
    const pros = input.professionals.length ? input.professionals : [input.ownerName];
    const colors = ["#b8475f", "#5b6fb5", "#2f9a78", "#d4a24c", "#e08a2e", "#7a4f8a", "#3b8ea5", "#c0392b"];
    await tx.insert(professionals).values(
      pros.map((name, i) => ({ ...stamp, name, color: colors[i % colors.length], sortOrder: i, userId: i === 0 && name === input.ownerName ? owner.id : null })),
    );
    await tx.insert(automations).values(DEFAULT_AUTOMATIONS.map((a) => ({ ...stamp, kind: a.kind, enabled: a.enabled, template: a.template, settings: a.settings })));
    return t.id;
  });

  await login(input.email, input.password, userAgent);
  return { tenantId, slug };
}
