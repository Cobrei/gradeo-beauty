import { describe, expect, it } from "vitest";
import { parseCsv, toISO } from "./csv";

describe("importação de clientes", () => {
  it("datas", () => {
    expect(toISO("05/03/1990")).toBe("1990-03-05");
    expect(toISO("31/02/1990")).toBeUndefined();
    expect(toISO("05/03/85")).toBe("1985-03-05");
    expect(toISO("05/03/12")).toBe("2012-03-05");
    expect(toISO("1990-03-05")).toBe("1990-03-05");
  });
  it("Google Contatos: pega o valor do telefone, não o rótulo", () => {
    const csv = "Name,Given Name,Phone 1 - Label,Phone 1 - Value,E-mail 1 - Label,E-mail 1 - Value\nAna Souza,Ana,Mobile,+55 51 99999-1234,Home,ana@x.com";
    const [r] = parseCsv(csv);
    expect(r.phone).toBe("+55 51 99999-1234");
    expect(r.email).toBe("ana@x.com");
  });
});
