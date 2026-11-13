import { describe, expect, it } from "vitest";
import {
  filtrarTestesPorPlanta,
  filtrarTestesPorTipo,
  mapearTesteDb,
  mesmaPlanta,
  testesDaFicha,
  testesDoDashboard,
  type TesteRow,
} from "./testes-data";
import { TIPO_TESTE_ADR, TIPO_TESTE_CEDAE } from "./testes-tipos";

// Fixtures fictícias — nenhum dado real de colaboradores ou plantas.
function row(overrides: Partial<TesteRow>): TesteRow {
  return {
    Id: 1,
    "Hora de início": null,
    "Hora de conclusão": null,
    Email: null,
    Nome: null,
    "Data do Teste": "2026-01-01",
    "Tipo de Serviço": "Preventiva",
    Elevatória: null,
    Grupo: null,
    "Tensão ( V )": null,
    "Corrente ( A )": null,
    Retaguarda: null,
    Recalque: null,
    "Corrente ShutOff": null,
    "Retaguarda ShutOff": null,
    "Recalque ShutOff": null,
    "Impossibilidade:": null,
    "Serviço Executado:": null,
    "Nome dos Colaboradores:": null,
    "Observação:": null,
    "Na Chegada": null,
    "Na saida": null,
    Status: null,
    tipo_teste: TIPO_TESTE_ADR,
    ...overrides,
  };
}

const PLANTA = "PL-RJB-EAT0746";

describe("mesmaPlanta (comparação por planta, não por nome)", () => {
  it("casa variações de espaço e caixa do mesmo código", () => {
    expect(mesmaPlanta("PL-RJB-EAT0746 - BOOSTER JK", PLANTA)).toBe(true);
    expect(mesmaPlanta("PL-RJB-EAT0746  - BOOSTER JK", PLANTA)).toBe(true);
    expect(mesmaPlanta("PL-RJB-EAT0746", PLANTA)).toBe(true);
    expect(mesmaPlanta("pl-rjb-eat0746 - booster jk", PLANTA)).toBe(true);
  });

  it("não mistura plantas diferentes com o mesmo número", () => {
    expect(mesmaPlanta("PL-RJB-EEAT0746 - X", PLANTA)).toBe(false);
    expect(mesmaPlanta(null, PLANTA)).toBe(false);
    expect(mesmaPlanta("MORRO DA TORRE", PLANTA)).toBe(false);
  });
});

describe("mapearTesteDb", () => {
  it("canonicaliza tipo_teste e mantém campos do modelo", () => {
    const r = mapearTesteDb({
      id: 42,
      data_teste: "2026-03-03",
      elevatoria: "PL-RJB-EAT0746 - BOOSTER JK",
      tipo_teste: "AdR",
      servico_executado: "Ajuste",
    });
    expect(r.Id).toBe(42);
    expect(r.tipo_teste).toBe(TIPO_TESTE_ADR);
    expect(r["Data do Teste"]).toBe("2026-03-03");
    expect(r.Elevatória).toBe("PL-RJB-EAT0746 - BOOSTER JK");
  });

  it("trata tipo ausente como ADR", () => {
    expect(mapearTesteDb({ id: 1 }).tipo_teste).toBe(TIPO_TESTE_ADR);
  });
});

describe("paridade Ficha x dashboard (mesma consulta, filtro por planta)", () => {
  const rows: TesteRow[] = [
    row({ Id: 1, Elevatória: "PL-RJB-EAT0746 - BOOSTER JK", tipo_teste: TIPO_TESTE_ADR }),
    row({ Id: 2, Elevatória: "PL-RJB-EAT0746  - BOOSTER JK", tipo_teste: TIPO_TESTE_ADR }),
    row({ Id: 3, Elevatória: "PL-RJB-EAT0746", tipo_teste: TIPO_TESTE_ADR }),
    row({ Id: 4, Elevatória: "PL-RJB-EAT0746 - OUTRA UNIDADE", tipo_teste: TIPO_TESTE_ADR }),
    // CEDAE da mesma planta NÃO entra no histórico AdR.
    row({ Id: 5, Elevatória: "PL-RJB-EAT0746 - BOOSTER JK", tipo_teste: TIPO_TESTE_CEDAE }),
    // Mesmo número, prefixo diferente: outra planta.
    row({ Id: 6, Elevatória: "PL-RJB-EEAT0746 - X", tipo_teste: TIPO_TESTE_ADR }),
    // Sem planta reconhecível.
    row({ Id: 7, Elevatória: "MORRO DA TORRE", tipo_teste: TIPO_TESTE_ADR }),
  ];

  it("a Ficha mostra o mesmo conjunto que o dashboard para a planta", () => {
    const ficha = testesDaFicha(rows, PLANTA);
    const dashboard = testesDoDashboard(rows, { tipoTeste: TIPO_TESTE_ADR, planta: PLANTA });
    const ids = (rs: TesteRow[]) => rs.map((r) => r.Id).sort((a, b) => Number(a) - Number(b));
    expect(ids(ficha)).toEqual(ids(dashboard));
    expect(ficha).toHaveLength(4);
    expect(ficha.every((r) => r.tipo_teste === TIPO_TESTE_ADR)).toBe(true);
  });

  it("filtro do dashboard aceita o valor canônico 'AdR'", () => {
    const dashboard = testesDoDashboard(rows, { tipoTeste: "AdR", planta: PLANTA });
    expect(dashboard).toHaveLength(4);
  });

  it("planta sem código não retorna nada", () => {
    expect(filtrarTestesPorPlanta(rows, "MORRO DA TORRE")).toEqual([]);
    expect(testesDaFicha(rows, null)).toEqual([]);
  });

  it("filtrarTestesPorTipo separa CEDAE de AdR", () => {
    expect(filtrarTestesPorTipo(rows, TIPO_TESTE_CEDAE).map((r) => r.Id)).toEqual([5]);
  });
});
