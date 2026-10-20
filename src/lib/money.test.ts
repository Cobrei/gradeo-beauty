import { describe, expect, it } from "vitest";
import { formatBRL, fromCents, moneyField, parseReais, toCents } from "./money";

describe("toCents aceita o que a pessoa digita e o que vem do banco", () => {
  it.each([
    ["R$ 120,00", 12000],
    ["R$ 1.234,56", 123456],
    ["1.234,5", 123450],
    ["120", 12000],
    ["120,5", 12050],
    ["90.0000", 9000],
    ["90.5", 9050],
    ["", 0],
    ["R$ 0,00", 0],
  ])("%s → %d", (input, cents) => expect(toCents(input)).toBe(cents));
  it("número", () => expect(toCents(12.5)).toBe(1250));
  it("ida e volta com o banco", () => expect(toCents(fromCents(98765))).toBe(98765));
  it("reais", () => expect(parseReais("R$ 49,90")).toBe(49.9));
  it("campo formatado", () => expect(moneyField(12000)).toBe("R$ 120,00"));
  it("exibição", () => expect(formatBRL(123456).replace(/ /g, " ")).toBe("R$ 1.234,56"));
});
