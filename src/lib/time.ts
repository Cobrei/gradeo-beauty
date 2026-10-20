/**
 * Horários da agenda: guardados como timestamptz (UTC) e sempre exibidos/criados
 * no fuso do salão (padrão America/Sao_Paulo). Sem bibliotecas: Intl resolve.
 */
export const TZ = "America/Sao_Paulo";

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    partsFmt.set(tz, f);
  }
  return f;
}

/** Deslocamento (minutos) do fuso em relação ao UTC numa data. */
function offsetMinutes(at: Date, tz = TZ): number {
  const p = Object.fromEntries(fmt(tz).formatToParts(at).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** "2026-10-20" + "14:30" no fuso do salão → Date (UTC). */
export function localToDate(dateISO: string, timeHHMM: string, tz = TZ): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = offsetMinutes(new Date(guess), tz);
  const utc = guess - off * 60000;
  // Segunda passada cobre virada de horário de verão.
  const off2 = offsetMinutes(new Date(utc), tz);
  return new Date(off2 === off ? utc : guess - off2 * 60000);
}

export function dateToLocal(at: Date, tz = TZ): { date: string; time: string; weekday: number } {
  const p = Object.fromEntries(fmt(tz).formatToParts(at).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const weekday = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  return { date, time: `${p.hour}:${p.minute}`, weekday };
}

export function localTime(at: Date, tz = TZ): string {
  return dateToLocal(at, tz).time;
}

export function localDate(at: Date, tz = TZ): string {
  return dateToLocal(at, tz).date;
}

/** Início e fim (exclusivo) de um dia local. */
export function dayRange(dateISO: string, tz = TZ): { start: Date; end: Date } {
  return { start: localToDate(dateISO, "00:00", tz), end: localToDate(addDays(dateISO, 1), "00:00", tz) };
}

export function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function addMinutes(at: Date, min: number): Date {
  return new Date(at.getTime() + min * 60000);
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function weekdayOf(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function formatLongDate(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDateTime(at: Date, tz = TZ): string {
  const { date, time } = dateToLocal(at, tz);
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y} ${time}`;
}
