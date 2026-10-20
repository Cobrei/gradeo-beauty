import { firstName } from "@/lib/phone";

export interface TemplateVars { nome?: string; salao?: string; voucher?: string; validade?: string; link?: string; hora?: string; data?: string; servico?: string; profissional?: string; confirmar?: string }

/** Substitui {variavel} no texto; variáveis desconhecidas ficam vazias. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{nome\}/gi, vars.nome ? firstName(vars.nome) : "")
    .replace(/\{salao\}/gi, vars.salao ?? "")
    .replace(/\{voucher\}/gi, vars.voucher ?? "")
    .replace(/\{validade\}/gi, vars.validade ?? "")
    .replace(/\{link\}/gi, vars.link ?? "")
    .replace(/\{hora\}/gi, vars.hora ?? "")
    .replace(/\{data\}/gi, vars.data ?? "")
    .replace(/\{servico\}/gi, vars.servico ?? "")
    .replace(/\{profissional\}/gi, vars.profissional ?? "")
    .replace(/\{confirmar\}/gi, vars.confirmar ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function voucherLabel(kind: "PERCENT" | "AMOUNT", value: number): string {
  return kind === "PERCENT" ? `${value}% de desconto` : `R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de desconto`;
}

export function formatBRDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Código curto, legível, sem caracteres ambíguos. */
export function voucherCode(prefix = "GB"): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${s}`;
}

export const CAMPAIGN_TEMPLATES: { key: string; name: string; preset: string; message: string; voucher?: { kind: "PERCENT" | "AMOUNT"; value: number; days: number } }[] = [
  { key: "winback", name: "Sentimos sua falta", preset: "INACTIVE", message: "Oi {nome}! Faz tempo que você não aparece no {salao} e a gente sentiu sua falta 💕 Preparamos {voucher} pra você voltar, válido até {validade}. Quer que eu reserve um horário? Responde aqui!", voucher: { kind: "PERCENT", value: 15, days: 15 } },
  { key: "cycle", name: "Hora de renovar", preset: "OVERDUE_CYCLE", message: "Oi {nome}! Pelo seu ritmo, já está na hora de renovar o visual 😉 Tenho horários essa semana no {salao}. Quer que eu encaixe você?" },
  { key: "birthday", name: "Mês de aniversário", preset: "BIRTHDAY_MONTH", message: "{nome}, é o seu mês! 🎉 O {salao} preparou um presente: {voucher}, válido até {validade}. Vem comemorar com a gente!", voucher: { kind: "PERCENT", value: 20, days: 30 } },
  { key: "vip", name: "Agradecimento VIP", preset: "VIP", message: "{nome}, você é uma das clientes mais especiais do {salao} e a gente queria agradecer: {voucher} no seu próximo atendimento, até {validade}. Obrigada por estar sempre com a gente 💖", voucher: { kind: "PERCENT", value: 10, days: 30 } },
  { key: "second", name: "Segunda visita", preset: "ONE_VISIT", message: "Oi {nome}! Adoramos te receber no {salao}. Pra sua segunda visita, {voucher} até {validade}. Quando você quer vir?", voucher: { kind: "PERCENT", value: 10, days: 20 } },
  { key: "slow", name: "Horário vazio (terça/quarta)", preset: "ALL", message: "Oi {nome}! Essa semana temos horários livres na terça e quarta de manhã no {salao}, com {voucher} pra quem agendar nesses dias. Quer um? Responde aqui 😊", voucher: { kind: "PERCENT", value: 15, days: 7 } },
  { key: "new", name: "Novidade / serviço novo", preset: "ALL", message: "{nome}, chegou novidade no {salao}! ✨ [descreva o serviço]. Quer experimentar? Me chama aqui que eu reservo seu horário." },
  { key: "referral", name: "Traga uma amiga", preset: "VIP", message: "{nome}, traz uma amiga pro {salao}! Ela ganha desconto na primeira visita e você ganha {voucher} no seu próximo atendimento, até {validade} 💕", voucher: { kind: "PERCENT", value: 15, days: 30 } },
];
