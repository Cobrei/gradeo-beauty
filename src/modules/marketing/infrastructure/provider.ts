import "server-only";
import { waNumber } from "@/lib/phone";

export interface SendResult { ok: boolean; providerId?: string; error?: string; manual?: boolean }

export interface MessageProvider {
  readonly kind: "MANUAL" | "WA_CLOUD" | "LOG";
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

export interface SalonWa { waAccessToken?: string | null; waPhoneNumberId?: string | null; waConnectedAt?: Date | null }

export function providerFor(kind: string, salon?: SalonWa): MessageProvider {
  if (kind === "WA_CLOUD" && salon?.waConnectedAt && salon.waAccessToken && salon.waPhoneNumberId) return new WaCloudProvider(salon.waAccessToken, salon.waPhoneNumberId);
  if (process.env.MESSAGE_PROVIDER === "LOG") return new LogProvider();
  return new ManualProvider();
}

export function waLink(phone: string, body: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(body)}`;
}
