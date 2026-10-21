import "server-only";
import { eq } from "drizzle-orm";
import { salonSettings } from "@/db/schema";
import { assertCan, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError } from "@/lib/errors";
import { createInstance, evolutionConfigured, getOwnerPhone, getQr, getState, logoutInstance, setWebhook, type QrState } from "../infrastructure/evolution";

export const QR_TERMS_VERSION = "2026-10";

const instanceName = (tenantId: string) => `gb-${tenantId.replace(/-/g, "").slice(0, 20)}`;

async function current(actor: Actor) {
  return withTenantRead(actor, async (tx) => {
    const [s] = await tx
      .select({ inst: salonSettings.waQrInstance, connectedAt: salonSettings.waQrConnectedAt, phone: salonSettings.waQrPhone, termsAt: salonSettings.waQrTermsAcceptedAt, provider: salonSettings.messageProvider })
      .from(salonSettings)
      .where(eq(salonSettings.tenantId, actor.tenantId))
      .limit(1);
    return s;
  });
}

/** Situação da conexão; atualiza o banco quando o QR é escaneado ou quando cai. */
export async function qrStatus(actor: Actor): Promise<{ configured: boolean; termsAccepted: boolean; instance: string | null; state: QrState | "none"; phone: string | null; qr?: string; provider: string }> {
  assertCan(actor, "core.settings.manage");
  const s = await current(actor);
  const base = { configured: evolutionConfigured(), termsAccepted: !!s?.termsAt, instance: s?.inst ?? null, phone: s?.phone ?? null, provider: s?.provider ?? "MANUAL" };
  if (!s?.inst || !base.configured) return { ...base, state: "none" };
  const state = await getState(s.inst);
  if (state === "open" && !s.connectedAt) {
    const phone = await getOwnerPhone(s.inst);
    await setWebhook(s.inst); // mensagens das clientes chegam para a recepcionista
    await withTenantTx(actor, (tx, ctx) => tx.update(salonSettings).set({ waQrConnectedAt: new Date(), waQrPhone: phone, ...ctx.stampUpdate() }).where(eq(salonSettings.tenantId, actor.tenantId)));
    return { ...base, state, phone };
  }
  if (state !== "open" && s.connectedAt) {
    // caiu (celular desconectou): volta para o modo manual para nada ficar parado
    await withTenantTx(actor, (tx, ctx) => tx.update(salonSettings).set({ waQrConnectedAt: null, ...(s.provider === "WA_QR" ? { messageProvider: "MANUAL" } : {}), ...ctx.stampUpdate() }).where(eq(salonSettings.tenantId, actor.tenantId)));
  }
  if (state === "open") return { ...base, state };
  const { qr } = await getQr(s.inst);
  return { ...base, state, qr };
}

/** Aceita o termo e cria a conexão (mostra o QR code em seguida). */
export async function startQr(actor: Actor, acceptedTerms: boolean) {
  assertCan(actor, "core.settings.manage");
  if (!evolutionConfigured()) throw new DomainError("WA_QR_OFF", "O servidor de WhatsApp ainda não está ligado. Fale com o suporte.");
  if (!acceptedTerms) throw new DomainError("TERMS", "Para conectar, leia e aceite o termo de uso do WhatsApp por QR code.");
  const name = instanceName(actor.tenantId);
  const r = await createInstance(name);
  if (!r.ok) throw new DomainError("WA_QR_FAIL", `Não foi possível iniciar a conexão: ${r.error ?? "erro"}`);
  await withTenantTx(actor, (tx, ctx) =>
    tx.update(salonSettings).set({ waQrInstance: name, waQrTermsAcceptedAt: new Date(), waQrTermsAcceptedBy: actor.userId, ...ctx.stampUpdate() }).where(eq(salonSettings.tenantId, actor.tenantId)),
  );
  await withTenantTx(actor, (_tx, ctx) => ctx.audit("whatsapp_qr", actor.tenantId, "update", null, { termsVersion: QR_TERMS_VERSION, acceptedBy: actor.userId }));
}

/** Liga ou desliga o envio automático pelo QR conectado. */
export async function setQrSending(actor: Actor, on: boolean) {
  assertCan(actor, "core.settings.manage");
  const s = await current(actor);
  if (on && !s?.connectedAt) throw new DomainError("WA_NOT_CONNECTED", "Conecte o WhatsApp pelo QR code primeiro.");
  await withTenantTx(actor, (tx, ctx) => tx.update(salonSettings).set({ messageProvider: on ? "WA_QR" : "MANUAL", ...ctx.stampUpdate() }).where(eq(salonSettings.tenantId, actor.tenantId)));
}

export async function disconnectQr(actor: Actor) {
  assertCan(actor, "core.settings.manage");
  const s = await current(actor);
  if (s?.inst) await logoutInstance(s.inst);
  await withTenantTx(actor, (tx, ctx) =>
    tx.update(salonSettings).set({ waQrInstance: null, waQrConnectedAt: null, waQrPhone: null, messageProvider: s?.provider === "WA_QR" ? "MANUAL" : (s?.provider ?? "MANUAL"), ...ctx.stampUpdate() }).where(eq(salonSettings.tenantId, actor.tenantId)),
  );
}
