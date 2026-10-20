/**
 * Dinheiro como inteiro em centavos no domínio; numeric(19,4) no banco.
 * Nunca float (regra do Esquadrão).
 */
export type Cents = number;

export function toCents(value: string | number): Cents {
  if (typeof value === "number") value = value.toFixed(4);
  // aceita "R$ 1.234,56", "1.234,56", "120", "120,5" (digitado) e "90.0000" (banco)
  let s = String(value).replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!s || s === "-" || s === ".") return 0;
  const [int, frac = ""] = s.split(".");
  const f = (frac + "00").slice(0, 2);
  const sign = int.startsWith("-") ? -1 : 1;
  return sign * (Math.abs(parseInt(int || "0", 10) || 0) * 100 + parseInt(f, 10));
}

/** Valor em reais (número) a partir do que a pessoa digitou. Para campos que guardam reais, não centavos. */
export function parseReais(value: unknown): number {
  return toCents(String(value ?? "0")) / 100;
}

/** "R$ 1.234,56" para preencher campos de valor. */
export function moneyField(c: Cents): string {
  return formatBRL(c).replace(/\u00a0/g, " ");
}

export function fromCents(c: Cents): string {
  const sign = c < 0 ? "-" : "";
  const a = Math.abs(c);
  return `${sign}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`;
}

export function formatBRL(c: Cents): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
}

/**
 * Divide um total em N parcelas inteiras em centavos; a diferença de arredondamento
 * vai para a primeira parcela (regra documentada; soma sempre bate).
 */
export function splitInstallments(totalCents: Cents, n: number): Cents[] {
  if (n < 1) throw new Error("n >= 1");
  const base = Math.floor(totalCents / n);
  const rest = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + rest : base));
}

export function applyPercentDiscount(totalCents: Cents, percent: number): Cents {
  // percent 0..100 com até 6 casas; arredondamento meio-para-cima
  const factor = Math.round((100 - percent) * 1_000_000);
  return Math.round((totalCents * factor) / 100_000_000);
}
