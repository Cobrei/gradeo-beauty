import { and, eq, gte, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { clients, type SegmentRule } from "@/db/schema";
import { addDays } from "@/lib/time";

export const SEGMENT_PRESETS: { key: NonNullable<SegmentRule["preset"]>; label: string; hint: string }[] = [
  { key: "INACTIVE", label: "Sumidas", hint: "Não vêm há mais de 45 dias" },
  { key: "OVERDUE_CYCLE", label: "Atrasadas no ciclo", hint: "Passaram do intervalo habitual delas" },
  { key: "BIRTHDAY_MONTH", label: "Aniversariantes do mês", hint: "Fazem aniversário este mês" },
  { key: "VIP", label: "VIP", hint: "Mais de 5 visitas ou R$ 1.000 gastos" },
  { key: "ONE_VISIT", label: "Vieram só uma vez", hint: "1 visita, há mais de 20 dias" },
  { key: "NEW_30D", label: "Novas (30 dias)", hint: "Primeira visita nos últimos 30 dias" },
  { key: "ALL", label: "Toda a base", hint: "Todas com telefone" },
];

/** Traduz a regra do segmento em WHERE. `today` em YYYY-MM-DD no fuso do salão. */
export function segmentWhere(rule: SegmentRule, today: string): SQL | undefined {
  const parts: (SQL | undefined)[] = [isNull(clients.deletedAt)];
  const preset = rule.preset ?? "ALL";
  const inactiveDays = rule.inactiveDays ?? 45;
  switch (preset) {
    case "INACTIVE":
      parts.push(lte(clients.lastVisitAt, addDays(today, -inactiveDays)));
      break;
    case "OVERDUE_CYCLE":
      // última visita + intervalo médio (mín. 14 dias) já passou, e não passou tanto a ponto de ser "sumida"
      parts.push(sql`${clients.lastVisitAt} is not null and ${clients.avgIntervalDays} is not null and ${clients.lastVisitAt} + greatest(${clients.avgIntervalDays}, 14) * interval '1 day' <= ${today}::date and ${clients.lastVisitAt} > ${addDays(today, -inactiveDays)}::date`);
      break;
    case "BIRTHDAY_MONTH":
      parts.push(sql`${clients.birthDate} is not null and extract(month from ${clients.birthDate}) = extract(month from ${today}::date)`);
      break;
    case "VIP":
      parts.push(or(gte(clients.visitsCount, rule.minVisits ?? 6), gte(clients.totalSpent, String(((rule.minSpent ?? 100000) / 100).toFixed(2)))));
      break;
    case "ONE_VISIT":
      parts.push(eq(clients.visitsCount, 1), lte(clients.lastVisitAt, addDays(today, -20)));
      break;
    case "NEW_30D":
      parts.push(gte(clients.firstVisitAt, addDays(today, -30)));
      break;
    case "CUSTOM":
      if (rule.inactiveDays) parts.push(lte(clients.lastVisitAt, addDays(today, -rule.inactiveDays)));
      if (rule.minVisits) parts.push(gte(clients.visitsCount, rule.minVisits));
      if (rule.minSpent) parts.push(gte(clients.totalSpent, String((rule.minSpent / 100).toFixed(2))));
      if (rule.lastVisitAfter) parts.push(gte(clients.lastVisitAt, rule.lastVisitAfter));
      if (rule.lastVisitBefore) parts.push(lte(clients.lastVisitAt, rule.lastVisitBefore));
      break;
    default:
      break;
  }
  if (rule.gender) parts.push(eq(clients.gender, rule.gender));
  if (rule.tags?.length) parts.push(sql`${clients.tags} ?| ${sql.raw(`array[${rule.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]`)}`);
  if (rule.professionalId) parts.push(eq(clients.preferredProfessionalId, rule.professionalId));
  if (rule.serviceId)
    parts.push(sql`exists (select 1 from pos_order_items oi join pos_orders o on o.id = oi.order_id where o.client_id = ${sql.raw(`"crm_clients"."id"`)} and oi.kind = 'SERVICE' and oi.ref_id = ${rule.serviceId}::uuid and o.status = 'PAID')`);
  return and(...parts.filter(Boolean) as SQL[]);
}

/** Interpretação da regra em texto, para a tela. */
export function describeSegment(rule: SegmentRule): string {
  const p = SEGMENT_PRESETS.find((x) => x.key === (rule.preset ?? "ALL"));
  const extra: string[] = [];
  if (rule.preset === "INACTIVE" && rule.inactiveDays) extra.push(`${rule.inactiveDays}+ dias sem vir`);
  if (rule.gender) extra.push(rule.gender === "F" ? "mulheres" : "homens");
  if (rule.tags?.length) extra.push(`tags: ${rule.tags.join(", ")}`);
  return [p?.label ?? "Personalizado", ...extra].join(" · ");
}
