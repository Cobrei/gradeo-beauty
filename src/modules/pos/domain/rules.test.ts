import { describe, expect, it } from "vitest";
import { pct, totals, voucherDiscount } from "./rules";

describe("regras da comanda", () => {
  it("comissão arredonda em centavos", () => {
    expect(pct(9000, 40)).toBe(3600);
    expect(pct(3333, 33.33)).toBe(1111);
  });
  it("voucher percentual nunca passa do subtotal", () => {
    expect(voucherDiscount("PERCENT", 15, 10000)).toBe(1500);
    expect(voucherDiscount("AMOUNT", 5000, 3000)).toBe(3000);
    expect(voucherDiscount("AMOUNT", 5000, 0)).toBe(0);
  });
  it("totais: desconto manual antes do voucher, total nunca negativo", () => {
    const t = totals([{ total: 8000 }, { total: 2000 }], 1500, 10000);
    expect(t).toEqual({ subtotal: 10000, discount: 1500, voucher: 8500, total: 0 });
  });
});
