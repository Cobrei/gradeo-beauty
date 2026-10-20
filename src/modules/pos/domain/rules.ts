import type { Cents } from "@/lib/money";

export function pct(amount: Cents, percent: number): Cents {
  return Math.round((amount * Math.round(percent * 100)) / 10000);
}

/** Desconto de voucher sobre o subtotal elegível. */
export function voucherDiscount(kind: "PERCENT" | "AMOUNT", value: number, eligibleSubtotal: Cents): Cents {
  if (eligibleSubtotal <= 0) return 0;
  const d = kind === "PERCENT" ? pct(eligibleSubtotal, value) : Math.round(value);
  return Math.min(d, eligibleSubtotal);
}

export interface Totals { subtotal: Cents; discount: Cents; voucher: Cents; total: Cents }

export function totals(items: { total: Cents }[], discount: Cents, voucher: Cents): Totals {
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const d = Math.min(Math.max(discount, 0), subtotal);
  const v = Math.min(Math.max(voucher, 0), subtotal - d);
  return { subtotal, discount: d, voucher: v, total: subtotal - d - v };
}

export const PAYMENT_METHODS: Record<string, string> = { PIX: "Pix", CASH: "Dinheiro", CREDIT: "Crédito", DEBIT: "Débito", TRANSFER: "Transferência", OTHER: "Outro" };
