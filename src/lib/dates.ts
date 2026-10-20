/** Datas puras (YYYY-MM-DD) para competência e vencimento — sem timezone. */
export type ISODate = string;

export function todayISO(tz = "America/Sao_Paulo"): ISODate {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts; // en-CA → YYYY-MM-DD
}

export function addMonths(d: ISODate, months: number): ISODate {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  const dd = Math.min(day, lastDay);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function firstOfMonth(d: ISODate): ISODate {
  return d.slice(0, 7) + "-01";
}

export function withDay(d: ISODate, day: number): ISODate {
  return d.slice(0, 7) + "-" + String(day).padStart(2, "0");
}

/** Dias inteiros de `from` até `to` (negativo se `to` for antes). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

/** Último dia do mês da data (para fechamento de competência). */
export function lastOfMonth(d: ISODate): ISODate {
  const [y, m] = d.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${d.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export function monthLabel(d: ISODate): string {
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [y, m] = d.split("-").map(Number);
  return `${names[m - 1]}/${y}`;
}

export function formatBR(d: ISODate | null | undefined): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function ageLabel(birth: ISODate, ref: ISODate = todayISO()): string {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ry, rm, rd] = ref.split("-").map(Number);
  let months = (ry - by) * 12 + (rm - bm);
  if (rd < bd) months -= 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} ${rest === 1 ? "mês" : "meses"}`;
  return `${years}a ${rest}m`;
}
