import { describe, expect, it } from "vitest";
import { isValidCnpj, normalizeCnpj } from "./cnpj";

describe("CNPJ validation", () => {
  it("accepts formatted and unformatted valid CNPJ values", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("27865757000102")).toBe(true);
  });

  it("rejects invalid, repeated, and incomplete CNPJ values", () => {
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCnpj("123")).toBe(false);
  });

  it("normalizes CNPJ to digits only", () => {
    expect(normalizeCnpj("11.222.333/0001-81")).toBe("11222333000181");
  });
});
