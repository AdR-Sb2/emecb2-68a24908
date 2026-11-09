import { describe, expect, it } from "vitest";
import { isOrdemServico } from "./produtividade-os";

describe("O.S. em field_atividades", () => {
  it("conta número inteiro positivo como O.S.", () => {
    expect(isOrdemServico(1042789)).toBe(true);
  });
  it("ignora atividade sem O.S.", () => {
    expect(isOrdemServico(0)).toBe(false);
    expect(isOrdemServico(null)).toBe(false);
    expect(isOrdemServico(undefined)).toBe(false);
    expect(isOrdemServico("")).toBe(false);
    expect(isOrdemServico("abc")).toBe(false);
    expect(isOrdemServico(1.5)).toBe(false);
  });
});
