import { describe, expect, it } from "vitest";
import {
  COLUNAS_MODELO_TESTE,
  LIMITE_CEDAE,
  TIPO_TESTE_ADR,
  TIPO_TESTE_CEDAE,
  contarCedaePorCodigo,
  detectarPrefixosDivergentes,
  formularioParaLinhaModelo,
  gerarIdTeste,
  linhaModeloVazia,
  mapearLinhaModelo,
  montarPayloadFormulario,
  montarPayloadTeste,
  normalizarCodigoElevatoria,
  normalizarTipoTeste,
  validarLimiteCedae,
} from "./testes-tipos";

// Fixtures fictícias — sem dados reais de colaboradores ou plantas.
const PLANTA = "PL-RJB-EAT9001";
const NOME_SUJO = "PL-RJB-EAT9001 - ESTAÇÃO FICTÍCIA";
const PLANTA_EEAT = "PL-RJB-EEAT9001";
const NOME_EEAT = "pl-rjb-eeat9001 - OUTRO NOME";

function linhaModelo(overrides: Record<string, unknown> = {}) {
  return {
    ID: 1,
    "Hora de início": "08:00",
    "Hora de conclusão": "09:00",
    Email: "teste@exemplo.invalid",
    Nome: "Fulano de Teste",
    "Hora da última modificação": "2026-01-01T10:00:00.000Z",
    "Data do Teste": "2026-01-01",
    "Tipo de Serviço": "Preventiva",
    Elevatória: NOME_SUJO,
    Grupo: 1,
    "Tensão ( V )": "380",
    "Corrente ( A )": "12,5",
    Retaguarda: "7mca",
    Recalque: "8mca",
    "Corrente ShutOff": "10",
    "Retaguarda ShutOff": "5",
    "Recalque ShutOff": "6",
    "Impossibilidade:": null,
    "Serviço Executado:": "Ajuste",
    "Nome dos Colaboradores:": "Equipe Fictícia",
    "Observação:": "N/A",
    "Na Chegada": "08:00",
    "Na saida": "09:00",
    Status: "Concluído",
    ...overrides,
  };
}

describe("normalização da planta", () => {
  it("extrai a planta ignorando sufixo de nome e caixa", () => {
    expect(normalizarCodigoElevatoria(NOME_SUJO)).toBe(PLANTA);
    expect(normalizarCodigoElevatoria(PLANTA)).toBe(PLANTA);
    expect(normalizarCodigoElevatoria("  pl-rjb-eat9001   ")).toBe(PLANTA);
  });

  it("aceita espaço antes e depois do código", () => {
    expect(normalizarCodigoElevatoria("  PL-RJB-EEAT0073  - CHATUBA")).toBe("PL-RJB-EEAT0073");
    expect(normalizarCodigoElevatoria("PL-RJB-SDA1003")).toBe("PL-RJB-SDA1003");
    expect(normalizarCodigoElevatoria("PL-RJB-OFI0005")).toBe("PL-RJB-OFI0005");
  });

  it("mantém EAT e EEAT como plantas diferentes", () => {
    expect(normalizarCodigoElevatoria(NOME_EEAT)).toBe(PLANTA_EEAT);
    expect(normalizarCodigoElevatoria("EEAT9001")).toBeNull();
    expect(normalizarCodigoElevatoria(NOME_EEAT)).not.toBe(PLANTA);
  });

  it("preserva zeros à esquerda do código", () => {
    expect(normalizarCodigoElevatoria("PL-RJB-EAT0053 - FICTÍCIA")).toBe("PL-RJB-EAT0053");
  });

  it("retorna null para vazio ou texto sem planta", () => {
    expect(normalizarCodigoElevatoria(null)).toBeNull();
    expect(normalizarCodigoElevatoria("   ")).toBeNull();
    expect(normalizarCodigoElevatoria("MORRO DA TORRE")).toBeNull();
  });

  it("normaliza variações de espaço e caixa do mesmo código", () => {
    const esperado = "PL-RJB-EAT0746";
    expect(normalizarCodigoElevatoria("PL-RJB-EAT0746 - BOOSTER JK")).toBe(esperado);
    expect(normalizarCodigoElevatoria("PL-RJB-EAT0746  - BOOSTER JK")).toBe(esperado);
    expect(normalizarCodigoElevatoria("PL-RJB-EAT0746")).toBe(esperado);
    expect(normalizarCodigoElevatoria("  pl-rjb-eat0746   ")).toBe(esperado);
    expect(normalizarCodigoElevatoria("pl-rjb-eat0746 - booster jk")).toBe(esperado);
  });
});

describe("valor canônico de tipo de teste", () => {
  it("canonicaliza AdR/ADR/ausente para ADR e CEDAE para CEDAE", () => {
    expect(TIPO_TESTE_ADR).toBe("ADR");
    expect(normalizarTipoTeste("AdR")).toBe(TIPO_TESTE_ADR);
    expect(normalizarTipoTeste("adr")).toBe(TIPO_TESTE_ADR);
    expect(normalizarTipoTeste("ADR")).toBe(TIPO_TESTE_ADR);
    expect(normalizarTipoTeste(null)).toBe(TIPO_TESTE_ADR);
    expect(normalizarTipoTeste(undefined)).toBe(TIPO_TESTE_ADR);
    expect(normalizarTipoTeste("")).toBe(TIPO_TESTE_ADR);
    expect(normalizarTipoTeste("cedae")).toBe(TIPO_TESTE_CEDAE);
    expect(normalizarTipoTeste("CEDAE")).toBe(TIPO_TESTE_CEDAE);
  });
});

describe("relatório de prefixos divergentes", () => {
  it("reporta o mesmo número com prefixos diferentes sem juntar", () => {
    const divergencias = detectarPrefixosDivergentes([
      "PL-RJB-EAT0053 - IVO",
      "PL-RJB-EEAT0053 - OUTRO",
      "PL-RJB-EAT0053 - SEM NOME",
    ]);
    expect(divergencias).toHaveLength(1);
    expect(divergencias[0].numero).toBe("0053");
    expect(divergencias[0].prefixos).toEqual(["EAT", "EEAT"]);
  });

  it("não reporta plantas distintas com números distintos", () => {
    expect(
      detectarPrefixosDivergentes(["PL-RJB-EAT0053", "PL-RJB-EEAT0073", "PL-RJB-SDA1003"]),
    ).toEqual([]);
  });
});

describe("limite de testes CEDAE", () => {
  it("permite enquanto há vaga e bloqueia no limite", () => {
    expect(validarLimiteCedae(0, TIPO_TESTE_CEDAE).ok).toBe(true);
    expect(validarLimiteCedae(1, TIPO_TESTE_CEDAE).ok).toBe(true);
    const bloqueio = validarLimiteCedae(LIMITE_CEDAE, TIPO_TESTE_CEDAE);
    expect(bloqueio.ok).toBe(false);
    expect(bloqueio.mensagem).toContain("Limite");
  });

  it("nunca bloqueia testes AdR", () => {
    expect(validarLimiteCedae(99, TIPO_TESTE_ADR).ok).toBe(true);
  });

  it("excluir um CEDAE libera a vaga", () => {
    const registros = [
      { tipo_teste: TIPO_TESTE_CEDAE, elevatoria_codigo: PLANTA },
      { tipo_teste: TIPO_TESTE_CEDAE, elevatoria_codigo: PLANTA },
      { tipo_teste: TIPO_TESTE_ADR, elevatoria_codigo: PLANTA },
    ];
    expect(contarCedaePorCodigo(registros, PLANTA)).toBe(2);
    expect(validarLimiteCedae(contarCedaePorCodigo(registros, PLANTA), TIPO_TESTE_CEDAE).ok).toBe(
      false,
    );

    const aposExclusao = registros.slice(1);
    expect(contarCedaePorCodigo(aposExclusao, PLANTA)).toBe(1);
    expect(
      validarLimiteCedae(contarCedaePorCodigo(aposExclusao, PLANTA), TIPO_TESTE_CEDAE).ok,
    ).toBe(true);
  });

  it("não conta CEDAE de outra elevatória", () => {
    const registros = [
      { tipo_teste: TIPO_TESTE_CEDAE, elevatoria_codigo: "PL-RJB-EAT9999" },
      { tipo_teste: TIPO_TESTE_CEDAE, elevatoria_codigo: "PL-RJB-EAT9999" },
    ];
    expect(contarCedaePorCodigo(registros, PLANTA)).toBe(0);
  });
});

describe("modelo de importação de 24 colunas", () => {
  it("mantém exatamente as 24 colunas na ordem do formulário", () => {
    expect(COLUNAS_MODELO_TESTE).toHaveLength(24);
    expect(COLUNAS_MODELO_TESTE[0]).toBe("ID");
    expect(COLUNAS_MODELO_TESTE[6]).toBe("Data do Teste");
    expect(COLUNAS_MODELO_TESTE[23]).toBe("Status");
  });

  it("mapeia linha do modelo e gera payload AdR por padrão", () => {
    const linha = mapearLinhaModelo(linhaModelo());
    const payload = montarPayloadTeste(linha);
    expect(payload.tipo_teste).toBe(TIPO_TESTE_ADR);
    expect(payload.elevatoria_codigo).toBe(PLANTA);
    expect(payload.data_teste).toBe("2026-01-01");
    expect(payload.grupo).toBe("1");
    expect(payload.corrente_a).toBe("12,5");
  });

  it("identifica linhas vazias (apenas metadados)", () => {
    const vazios = Object.fromEntries(COLUNAS_MODELO_TESTE.map((c) => [c, null]));
    expect(
      linhaModeloVazia({
        ...vazios,
        ID: 7,
        "Hora de início": "08:00",
        Email: "teste@exemplo.invalid",
        Nome: "Fulano de Teste",
      }),
    ).toBe(true);
    expect(linhaModeloVazia(linhaModelo())).toBe(false);
  });
});

describe("histórico AdR (somente leitura, filtrado por planta)", () => {
  const historicoDe = (
    registros: Array<{ tipo_teste?: string | null; elevatoria_codigo?: string | null }>,
    planta: string | null,
  ) =>
    planta == null
      ? []
      : registros.filter(
          (r) =>
            (r.tipo_teste ?? TIPO_TESTE_ADR) === TIPO_TESTE_ADR && r.elevatoria_codigo === planta,
        );

  it("importação nova na aba Testes aparece no histórico da ficha correspondente", () => {
    const payload = montarPayloadTeste(mapearLinhaModelo(linhaModelo({ ID: 500 })));
    const base = [
      { tipo_teste: TIPO_TESTE_CEDAE, elevatoria_codigo: PLANTA },
      { tipo_teste: TIPO_TESTE_ADR, elevatoria_codigo: PLANTA },
    ];
    const combinado = [...base, payload];
    expect(historicoDe(combinado, PLANTA)).toHaveLength(2);
    // CEDAE não entra no histórico AdR.
    expect(historicoDe(combinado, PLANTA).every((r) => r.tipo_teste === TIPO_TESTE_ADR)).toBe(true);
  });

  it("elevatória sem planta não puxa nada", () => {
    const registros = [{ tipo_teste: TIPO_TESTE_ADR, elevatoria_codigo: PLANTA }];
    expect(historicoDe(registros, normalizarCodigoElevatoria("MORRO DA TORRE"))).toEqual([]);
  });

  it("plantas diferentes com o mesmo número não se misturam", () => {
    const registros = [
      { tipo_teste: TIPO_TESTE_ADR, elevatoria_codigo: "PL-RJB-EAT0053" },
      { tipo_teste: TIPO_TESTE_ADR, elevatoria_codigo: "PL-RJB-EEAT0053" },
    ];
    expect(historicoDe(registros, "PL-RJB-EAT0053")).toHaveLength(1);
    expect(historicoDe(registros, "PL-RJB-EEAT0053")).toHaveLength(1);
  });
});

describe("formulário manual", () => {
  it("converte formulário em linha do modelo com N/A vazio", () => {
    const linha = formularioParaLinhaModelo(
      {
        dataTeste: "2026-02-02",
        tipoServico: "Corretiva",
        grupo: "2",
        nomeColaboradores: "Equipe Fictícia",
        servicoExecutado: "Troca de selo",
        observacao: "",
        tensao: "220",
        corrente: "9",
        recalque: "3mca",
        retaguarda: "2mca",
        correnteShutOff: "",
        retaguardaShutOff: "",
        recalqueShutOff: "",
        naChegada: "07:30",
        naSaida: "11:00",
      },
      NOME_SUJO,
    );
    expect(linha["Observação:"]).toBeNull();
    expect(linha["Data do Teste"]).toBe("2026-02-02");
    const payload = montarPayloadTeste(linha, TIPO_TESTE_CEDAE, { id: 42 });
    expect(payload.id).toBe(42);
    expect(payload.tipo_teste).toBe(TIPO_TESTE_CEDAE);
    expect(payload.elevatoria_codigo).toBe(PLANTA);
  });

  it("monta payload CEDAE de formulário com id gerado", () => {
    const payload = montarPayloadFormulario(
      {
        dataTeste: "2026-02-02",
        tipoServico: "Preventiva",
        grupo: "1",
        nomeColaboradores: "",
        servicoExecutado: "",
        observacao: "",
        tensao: "",
        corrente: "",
        recalque: "",
        retaguarda: "",
        correnteShutOff: "",
        retaguardaShutOff: "",
        recalqueShutOff: "",
        naChegada: "",
        naSaida: "",
      },
      NOME_SUJO,
      TIPO_TESTE_CEDAE,
    );
    expect(payload.id).toBeGreaterThan(0);
    expect(payload.tipo_teste).toBe(TIPO_TESTE_CEDAE);
    expect(payload.elevatoria_codigo).toBe(PLANTA);
  });

  it("gera id estável a partir do relógio", () => {
    expect(gerarIdTeste(1700000000000)).toBe(1700000000000);
  });
});
