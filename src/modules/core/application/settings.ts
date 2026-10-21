import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/db/client";
import { automations, salonSettings, tenants, type OpeningHours } from "@/db/schema";
import { assertCan, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError } from "@/lib/errors";
import { normalizePhone, slugify } from "@/lib/phone";

export type SalonSettings = typeof salonSettings.$inferSelect & { salonName: string };

/** Configuração do salão do ator (cacheada por request). */
export const getSettings = cache(async (actor: Actor): Promise<SalonSettings> => {
  return withTenantRead(actor, async (tx) => {
    const [row] = await tx.select().from(salonSettings).where(eq(salonSettings.tenantId, actor.tenantId)).limit(1);
    if (!row) throw new DomainError("NO_SETTINGS", "Salão sem configuração.");
    const [t] = await tx.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, actor.tenantId)).limit(1);
    return { ...row, salonName: t?.name ?? "" };
  });
});

/** Para a página pública de agendamento (sem ator): busca por slug, fora do RLS (usa a sessão de app). */
/** Colunas que podem aparecer em páginas públicas (nunca tokens ou dados internos). */
const publicCols = {
  tenantId: salonSettings.tenantId,
  slug: salonSettings.slug,
  whatsapp: salonSettings.whatsapp,
  phone: salonSettings.phone,
  instagram: salonSettings.instagram,
  addressJson: salonSettings.addressJson,
  openingHours: salonSettings.openingHours,
  onlineBooking: salonSettings.onlineBooking,
  onlineBookingLeadMin: salonSettings.onlineBookingLeadMin,
  reviewUrl: salonSettings.reviewUrl,
  logoData: salonSettings.logoData,
  brandColor: salonSettings.brandColor,
  aiReceptionist: salonSettings.aiReceptionist,
  aiName: salonSettings.aiName,
  aiInstructions: salonSettings.aiInstructions,
};

export async function getPublicSalon(slug: string) {
  const [row] = await db.select(publicCols).from(salonSettings).where(eq(salonSettings.slug, slug)).limit(1);
  if (!row) return null;
  const [t] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, row.tenantId)).limit(1);
  return { ...row, salonName: t?.name ?? "" };
}

/** Marca do salão por id (páginas públicas de recibo/horário). */
export async function getPublicSalonById(tenantId: string) {
  const [row] = await db.select(publicCols).from(salonSettings).where(eq(salonSettings.tenantId, tenantId)).limit(1);
  if (!row) return null;
  const [t] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return { ...row, salonName: t?.name ?? "" };
}

const hoursSchema = z.record(z.string(), z.object({ open: z.string(), close: z.string() }).nullable());

export const settingsSchema = z.object({
  salonName: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(48).transform(slugify),
  whatsapp: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  instagram: z.string().trim().max(60).optional(),
  address: z.string().trim().max(200).optional(),
  slotMinutes: z.coerce.number().int().min(5).max(60),
  onlineBooking: z.boolean(),
  partnerMode: z.boolean().default(false),
  onlineBookingLeadMin: z.coerce.number().int().min(0).max(1440),
  reviewUrl: z.string().trim().url().optional().or(z.literal("")),
  messageProvider: z.enum(["MANUAL", "WA_CLOUD", "WA_QR"]),
  logoData: z
    .string()
    .max(300_000, "Logo grande demais.")
    .refine((v) => v === "" || /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(v), "Formato de logo inválido.")
    .optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  openingHours: hoursSchema,
});

export async function updateSettings(actor: Actor, raw: unknown) {
  assertCan(actor, "core.settings.manage");
  const input = settingsSchema.parse(raw);
  // endereço do link é único no sistema todo: consulta de sistema, fora do salão
  const [other] = await db.select({ tenantId: salonSettings.tenantId }).from(salonSettings).where(eq(salonSettings.slug, input.slug)).limit(1);
  if (other && other.tenantId !== actor.tenantId) throw new DomainError("SLUG_TAKEN", "Este endereço já está em uso.");
  return withTenantTx(actor, async (tx, ctx) => {
    if (input.messageProvider === "WA_QR") {
      const [cur] = await tx.select({ c: salonSettings.waQrConnectedAt }).from(salonSettings).where(eq(salonSettings.tenantId, actor.tenantId)).limit(1);
      if (!cur?.c) throw new DomainError("WA_NOT_CONNECTED", "Conecte o WhatsApp do salão pelo QR code antes de ligar o envio automático.");
    }
    if (input.messageProvider === "WA_CLOUD") {
      const [cur] = await tx.select({ c: salonSettings.waConnectedAt }).from(salonSettings).where(eq(salonSettings.tenantId, actor.tenantId)).limit(1);
      if (!cur?.c) throw new DomainError("WA_NOT_CONNECTED", "Conecte o WhatsApp do salão antes de ligar o envio automático.");
    }
    await tx.update(tenants).set({ name: input.salonName, updatedAt: new Date() }).where(eq(tenants.id, actor.tenantId));
    try {
      await tx
        .update(salonSettings)
        .set({
          slug: input.slug,
          whatsapp: normalizePhone(input.whatsapp),
          phone: normalizePhone(input.phone),
          instagram: input.instagram?.replace(/^@/, "") || null,
          addressJson: input.address ? { text: input.address } : null,
          slotMinutes: input.slotMinutes,
          onlineBooking: input.onlineBooking,
          partnerMode: input.partnerMode,
          onlineBookingLeadMin: input.onlineBookingLeadMin,
          reviewUrl: input.reviewUrl || null,
          messageProvider: input.messageProvider,
          ...(input.logoData !== undefined ? { logoData: input.logoData || null } : {}),
          ...(input.brandColor !== undefined ? { brandColor: input.brandColor || null } : {}),
          messageSenderName: input.salonName,
          openingHours: input.openingHours as OpeningHours,
          ...ctx.stampUpdate(),
        })
        .where(eq(salonSettings.tenantId, actor.tenantId));
    } catch (e) {
      if (String(e).includes("uq_settings_slug")) throw new DomainError("SLUG_TAKEN", "Este endereço já está em uso.");
      throw e;
    }
  });
}

export async function listAutomations(actor: Actor) {
  assertCan(actor, "core.settings.manage");
  return withTenantRead(actor, (tx) => tx.select().from(automations).where(eq(automations.tenantId, actor.tenantId)));
}

export async function updateAutomation(actor: Actor, kind: string, patch: { enabled: boolean; template: string; settings?: Record<string, unknown> }) {
  assertCan(actor, "core.settings.manage");
  if (patch.template.trim().length < 10) throw new DomainError("VALIDATION", "A mensagem está curta demais.");
  return withTenantTx(actor, async (tx, ctx) => {
    const [row] = await tx.select().from(automations).where(eq(automations.kind, kind)).limit(1);
    if (!row) throw new DomainError("NOT_FOUND", "Automação não encontrada.");
    const settings = { ...(row.settings ?? {}), ...(patch.settings ?? {}) };
    await tx.update(automations).set({ enabled: patch.enabled, template: patch.template.trim(), settings, ...ctx.stampUpdate() }).where(eq(automations.id, row.id));
  });
}

/** Regra de fidelidade ligada (a cada N visitas) ou null. Leitura simples para a ficha da cliente. */
export async function loyaltyEvery(actor: Actor): Promise<number | null> {
  return withTenantRead(actor, async (tx) => {
    const [r] = await tx.select({ enabled: automations.enabled, settings: automations.settings }).from(automations).where(eq(automations.kind, "LOYALTY")).limit(1);
    return r?.enabled ? Math.max(2, Number(r.settings.everyVisits ?? 10)) : null;
  });
}
