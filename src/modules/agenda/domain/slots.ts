import type { OpeningHours } from "@/db/schema";
import { hhmm, minutesOf } from "@/lib/time";

export interface Busy { start: number; end: number } // minutos do dia (local)

/** Janela de trabalho do profissional no dia: a dele, senão a do salão. */
export function workWindow(weekday: number, salon: OpeningHours, pro: OpeningHours): { open: number; close: number } | null {
  const own = Object.keys(pro).length ? pro[String(weekday)] : undefined;
  const w = own !== undefined ? own : salon[String(weekday)];
  if (!w) return null;
  return { open: minutesOf(w.open), close: minutesOf(w.close) };
}

/** Horários livres para um serviço de `duration` minutos, em passos de `step`. */
export function freeSlots(window: { open: number; close: number } | null, busy: Busy[], duration: number, step: number, notBefore = 0): string[] {
  if (!window) return [];
  const out: string[] = [];
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  for (let t = Math.max(window.open, Math.ceil(notBefore / step) * step); t + duration <= window.close; t += step) {
    const end = t + duration;
    const clash = sorted.some((b) => t < b.end && end > b.start);
    if (!clash) out.push(hhmm(t));
  }
  return out;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export const APPT_STATUS: Record<string, { label: string; tone: "brand" | "gold" | "ok" | "warn" | "bad" | "info" | "mist"; next: string[] }> = {
  REQUESTED: { label: "Pedido online", tone: "gold", next: ["SCHEDULED", "CANCELLED"] },
  SCHEDULED: { label: "Marcado", tone: "info", next: ["CONFIRMED", "IN_SERVICE", "NO_SHOW", "CANCELLED"] },
  CONFIRMED: { label: "Confirmado", tone: "ok", next: ["IN_SERVICE", "NO_SHOW", "CANCELLED"] },
  IN_SERVICE: { label: "Em atendimento", tone: "brand", next: ["DONE", "CANCELLED"] },
  DONE: { label: "Finalizado", tone: "mist", next: [] },
  NO_SHOW: { label: "Faltou", tone: "bad", next: ["SCHEDULED"] },
  CANCELLED: { label: "Cancelado", tone: "mist", next: ["SCHEDULED"] },
};

export function canTransition(from: string, to: string): boolean {
  return APPT_STATUS[from]?.next.includes(to) ?? false;
}
