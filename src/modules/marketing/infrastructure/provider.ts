import "server-only";
import { waNumber } from "@/lib/phone";
import { evolutionConfigured, sendText } from "./evolution";

export interface SendResult { ok: boolean; providerId?: string; error?: string; manual?: boolean }

export interface MessageProvider {
  readonly kind: "MANUAL" | "WA_CLOUD" | "WA_QR" | "LOG";
  send(to: string, body: string): Promise<SendResult>;
}

/** Modo manual: a mensagem fica pronta e a dona envia pelo link wa.me (sem custo, funciona hoje). */
export class ManualProvider implements MessageProvider {
  readonly kind = "MANUAL" as const;
  async send(): Promise<SendResult> {
    return { ok: true, manual: true };
  }
}

/**
 * WhatsApp Cloud API (Meta) pelo número do PRÓPRIO salão. Não existe número global: sem a conexão
 * do salão, nada é enviado automaticamente. Texto livre só dentro da janela de 24h; fora dela a Meta
 * exige template aprovado (próxima etapa).
 */
export class WaCloudProvider implements MessageProvider {
  readonly kind = "WA_CLOUD" as const;
  constructor(private token: string, private phoneId: string) {}
  async send(to: string, body: string): Promise<SendResult> {
    if (!this.token || !this.phoneId) return { ok: false, error: "WhatsApp do salão não conectado" };
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: waNumber(to), type: "text", text: { body, preview_url: false } }),
      });
      const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
      if (!res.ok) return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
      return { ok: true, providerId: json.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, error: String(e).slice(0, 200) };
    }
  }
}

export class LogProvider implements MessageProvider {
  readonly kind = "LOG" as const;
  async send(to: string, body: string): Promise<SendResult> {
    console.log(`[msg → ${to}] ${body}`);
    return { ok: true, providerId: `log-${Date.now()}` };
  }
}

/**
 * WhatsApp por QR code (canal não oficial, pelo número do próprio salão, no servidor da gradeo).
 * Quem chama espaça os envios (pausa aleatória) e limita a quantidade por rodada.
 */
export class WaQrProvider implements MessageProvider {
  readonly kind = "WA_QR" as const;
  constructor(private instance: string) {}
  async send(to: string, body: string): Promise<SendResult> {
    const r = await sendText(this.instance, waNumber(to), body);
    return r.ok ? { ok: true, providerId: r.id } : { ok: false, error: r.error ?? "falha no envio" };
  }
}

/** Pausa entre mensagens no QR code (parecer envio humano e reduzir risco de bloqueio). */
export const humanPause = () => new Promise((r) => setTimeout(r, 1500 + Math.floor(Math.random() * 2000)));
/** Prazo da rodada (a função da Vercel tem limite de tempo): depois dele, nada mais é enviado e fica na fila. */
let deadline = 0;
export const setSendDeadline = (msFromNow: number) => { deadline = Date.now() + msFromNow; };
export const pastDeadline = () => deadline > 0 && Date.now() > deadline;

/** Máximo de envios automáticos por rodada no QR code (o resto fica na fila para a próxima). */
export const QR_BATCH = 12;

export interface SalonWa { waAccessToken?: string | null; waPhoneNumberId?: string | null; waConnectedAt?: Date | null; waQrInstance?: string | null; waQrConnectedAt?: Date | null }

export function providerFor(kind: string, salon?: SalonWa): MessageProvider {
  if (kind === "WA_QR" && salon?.waQrConnectedAt && salon.waQrInstance && evolutionConfigured()) return new WaQrProvider(salon.waQrInstance);
  if (kind === "WA_CLOUD" && salon?.waConnectedAt && salon.waAccessToken && salon.waPhoneNumberId) return new WaCloudProvider(salon.waAccessToken, salon.waPhoneNumberId);
  if (process.env.MESSAGE_PROVIDER === "LOG") return new LogProvider();
  return new ManualProvider();
}

export function waLink(phone: string, body: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(body)}`;
}
