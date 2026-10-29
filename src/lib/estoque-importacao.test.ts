import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { numeroSap } from "./estoque-sap-numeros";
import { diaUTC, diasEntre, validarDataRc } from "./datas-puras";
import { preservarDataRcImportada } from "./estoque-datas-rc";
import type { Compra } from "./estoque-types";

describe("valores SAP", () => {
  it("interpreta 2.949,00 como 2949", () => expect(numeroSap("2.949,00")).toBe(2949));
  it("preserva valor numérico e formatação brasileira em XLSX", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["Valor"], [2949]]);
    sheet.A2.z = "#.##0,00";
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "SAP");
    const read = XLSX.read(XLSX.write(wb, { type: "array", bookType: "xlsx" }), { raw: true });
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(read.Sheets.SAP, { header: 1, raw: true });
    expect(numeroSap(matrix[1][0])).toBe(2949);
  });
  it("preserva texto brasileiro em CSV antes da conversão", () => {
    const wb = XLSX.read("Valor;Quantidade\n2.949,00;1\n", { type: "string", raw: true });
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
      header: 1,
      raw: true,
    });
    expect(numeroSap(matrix[1][0])).toBe(2949);
  });
  it("lê milhares sem centavos e casas decimais", () => {
    expect(numeroSap("2.949")).toBe(2949);
    expect(numeroSap("2,9")).toBe(2.9);
    expect(numeroSap(2.949)).toBe(2.949);
    expect(numeroSap("1.234.567,89")).toBe(1234567.89);
  });
});
describe("datas da RC", () => {
  it("calcula tempo até chegada sem fuso", () =>
    expect(diasEntre("2026-08-05", "2026-08-19")).toBe(14));
  it("rejeita datas inexistentes", () => expect(diaUTC("2026-02-30")).toBeNull());
  it("rejeita criação futura", () => expect(validarDataRc("2999-01-01")).not.toBeNull());
  it("rejeita criação posterior à chegada", () =>
    expect(validarDataRc("2026-08-19", "2026-08-05")).not.toBeNull());
  it("preserva data manual na importação", () => {
    const row = { dt_criacao_rc: "2026-08-06" };
    expect(
      preservarDataRcImportada(row, {
        data_criacao_origem: "manual",
        dt_criacao_rc: "2026-08-05",
      } as Compra),
    ).toBe(true);
    expect(row).not.toHaveProperty("dt_criacao_rc");
  });
  it("permite próxima importação após remoção da data", () => {
    const row = { dt_criacao_rc: "2026-08-06" };
    expect(
      preservarDataRcImportada(row, { data_criacao_origem: null, dt_criacao_rc: null } as Compra),
    ).toBe(false);
    expect(row.dt_criacao_rc).toBe("2026-08-06");
  });
});
