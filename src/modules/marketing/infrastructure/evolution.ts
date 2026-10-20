import "server-only";

/**
 * Cliente do servidor de WhatsApp por QR code (Evolution API, hospedado pela gradeo).
 * Um servidor para todos os salões; cada salão é uma "instância" com o próprio número.
 * Canal NÃO oficial: o salão aceita o termo de risco antes de conectar.
 */
const BASE = (process.env.EVOLUTION_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.EVOLUTION_API_KEY ?? "";

export const evolutionConfigured = () => Boolean(BASE && KEY);

async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (!evolutionConfigured()) return { ok: false, status: 0, data: null, error: "Servidor de WhatsApp não configurado" };
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: T | null = null;
    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      data = null;
    }
    const err = !res.ok ? ((data as { response?: { message?: unknown }; message?: unknown } | null)?.response?.message ?? (data as { message?: unknown } | null)?.message ?? `HTTP ${res.status}`) : undefined;
    return { ok: res.ok, status: res.status, data, error: err ? String(Array.isArray(err) ? err.join("; ") : err).slice(0, 240) : undefined };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: String(e).slice(0, 240) };
  }
}

type QrPayload = { base64?: string; code?: string; pairingCode?: string; qrcode?: { base64?: string; code?: string } };

/** Cria a instância do salão (se ainda não existir) e devolve o QR code, quando vier junto. */
export async function createInstance(name: string): Promise<{ ok: boolean; qr?: string; error?: string }> {
  const r = await call<QrPayload>("POST", "/instance/create", { instanceName: name, qrcode: true, integration: "WHATSAPP-BAILEYS" });
  if (!r.ok && !/already|exist|em uso|in use/i.test(r.error ?? "")) return { ok: false, error: r.error };
  return { ok: true, qr: r.data?.qrcode?.base64 ?? r.data?.base64 };
}

/** QR code atual (muda a cada ~40 s até alguém escanear). */
export async function getQr(name: string): Promise<{ qr?: string; pairingCode?: string; error?: string }> {
  const r = await call<QrPayload>("GET", `/instance/connect/${encodeURIComponent(name)}`);
  if (!r.ok) return { error: r.error };
  const qr = r.data?.base64 ?? r.data?.qrcode?.base64;
  return { qr: qr && !qr.startsWith("data:") ? `data:image/png;base64,${qr}` : qr, pairingCode: r.data?.pairingCode };
}

export type QrState = "open" | "connecting" | "close" | "unknown";

export async function getState(name: string): Promise<QrState> {
  const r = await call<{ instance?: { state?: string }; state?: string }>("GET", `/instance/connectionState/${encodeURIComponent(name)}`);
  const s = r.data?.instance?.state ?? r.data?.state;
  return s === "open" || s === "connecting" || s === "close" ? s : "unknown";
}

/** Número conectado (para mostrar na tela). */
export async function getOwnerPhone(name: string): Promise<string | null> {
  const r = await call<{ ownerJid?: string; owner?: string; instance?: { owner?: string } }[]>("GET", `/instance/fetchInstances?instanceName=${encodeURIComponent(name)}`);
  const it = Array.isArray(r.data) ? r.data[0] : null;
  const jid = it?.ownerJid ?? it?.owner ?? it?.instance?.owner ?? "";
  const digits = jid.split("@")[0]?.replace(/\D/g, "") ?? "";
  return digits ? digits.replace(/^55/, "") : null;
}

export async function sendText(name: string, number: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const r = await call<{ key?: { id?: string } }>("POST", `/message/sendText/${encodeURIComponent(name)}`, { number, text, linkPreview: false });
  return r.ok ? { ok: true, id: r.data?.key?.id } : { ok: false, error: r.error };
}

export async function logoutInstance(name: string) {
  await call("DELETE", `/instance/logout/${encodeURIComponent(name)}`);
  await call("DELETE", `/instance/delete/${encodeURIComponent(name)}`);
}
