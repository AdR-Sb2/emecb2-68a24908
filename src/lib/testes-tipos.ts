// Regras de domínio dos Testes & Aferições (CEDAE x AdR).
// Módulo puro (sem React/Supabase) para permitir testes automatizados.

export type TipoTeste = "CEDAE" | "ADR";

export const TIPO_TESTE_CEDAE: TipoTeste = "CEDAE";
export const TIPO_TESTE_ADR: TipoTeste = "ADR";
export const TIPOS_TESTE: TipoTeste[] = [TIPO_TESTE_CEDAE, TIPO_TESTE_ADR];

// Cada elevatória aceita no máximo 2 testes CEDAE.
export const LIMITE_CEDAE = 2;

// Modelo de importação (planilha do Microsoft Forms) — exatamente 24 colunas, nesta ordem.
export const COLUNAS_MODELO_TESTE = [
  "ID",
  "Hora de início",
  "Hora de conclusão",
  "Email",
  "Nome",
  "Hora da última modificação",
  "Data do Teste",
  "Tipo de Serviço",
  "Elevatória",
  "Grupo",
  "Tensão ( V )",
  "Corrente ( A )",
  "Retaguarda",
  "Recalque",
  "Corrente ShutOff",
  "Retaguarda ShutOff",
  "Recalque ShutOff",
  "Impossibilidade:",
  "Serviço Executado:",
  "Nome dos Colaboradores:",
  "Observação:",
  "Na Chegada",
  "Na saida",
  "Status",
] as const;

export type ColunaModeloTeste = (typeof COLUNAS_MODELO_TESTE)[number];

// Chaves internas equivalentes ao modelo de importação.
export type TesteNormalizado = {
  Id: number | null;
  "Hora de início": string | null;
  "Hora de conclusão": string | null;
  Email: string | null;
  Nome: string | null;
  "Hora da última modificação": string | null;
  "Data do Teste": string | null;
  "Tipo de Serviço": string | null;
  Elevatória: string | null;
  Grupo: string | number | null;
  "Tensão ( V )": string | null;
  "Corrente ( A )": string | null;
  Retaguarda: string | null;
  Recalque: string | null;
  "Corrente ShutOff": string | null;
  "Retaguarda ShutOff": string | null;
  "Recalque ShutOff": string | null;
  "Impossibilidade:": string | null;
  "Serviço Executado:": string | null;
  "Nome dos Colaboradores:": string | null;
  "Observação:": string | null;
  "Na Chegada": string | null;
  "Na saida": string | null;
  Status: string | null;
};

export const COLUNA_MODELO_PARA_INTERNO: Record<ColunaModeloTeste, keyof TesteNormalizado> = {
  ID: "Id",
  "Hora de início": "Hora de início",
  "Hora de conclusão": "Hora de conclusão",
  Email: "Email",
  Nome: "Nome",
  "Hora da última modificação": "Hora da última modificação",
  "Data do Teste": "Data do Teste",
  "Tipo de Serviço": "Tipo de Serviço",
  Elevatória: "Elevatória",
  Grupo: "Grupo",
  "Tensão ( V )": "Tensão ( V )",
  "Corrente ( A )": "Corrente ( A )",
  Retaguarda: "Retaguarda",
  Recalque: "Recalque",
  "Corrente ShutOff": "Corrente ShutOff",
  "Retaguarda ShutOff": "Retaguarda ShutOff",
  "Recalque ShutOff": "Recalque ShutOff",
  "Impossibilidade:": "Impossibilidade:",
  "Serviço Executado:": "Serviço Executado:",
  "Nome dos Colaboradores:": "Nome dos Colaboradores:",
  "Observação:": "Observação:",
  "Na Chegada": "Na Chegada",
  "Na saida": "Na saida",
  Status: "Status",
};

// Normaliza o nome/código da elevatória para um código canônico por planta.
// Ex.: "PL-RJB-EAT0053 - Ivo Miranda" -> "PL-RJB-EAT0053"
//      "PL-RJB-EEAT739 - TIMBÓ"       -> "PL-RJB-EAT739"
//      "EEAT739"                       -> "PL-RJB-EAT739"
//      "pl-rjb-eat0832"               -> "PL-RJB-EAT0832"
// A chave é sempre o código (EAT/EEAT unificados), nunca o nome — que é
// inconsistente na origem (maiúsculas, espaços extras, sufixo de nome).
export function normalizarCodigoElevatoria(valor: string | null | undefined): string | null {
  if (valor == null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const match = texto.match(/PL[\s-]*RJB[\s-]*(E{1,2}AT)[\s-]*(\d+)/i);
  if (match) {
    return `PL-RJB-EAT${match[2]}`;
  }

  const curto = texto.match(/\b(E{1,2}AT)[\s-]*(\d+)/i);
  if (curto) {
    return `PL-RJB-EAT${curto[2]}`;
  }

  // Sem código reconhecível: devolve a parte antes do separador de nome,
  // em caixa alta e sem espaços duplicados (fallback estável para agrupar).
  const base = texto
    .split(/\s+[-–—]\s+/)[0]
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  return base || null;
}

export type ResultadoValidacao = { ok: boolean; mensagem?: string };

// Valida a regra de negócio do limite de testes CEDAE.
export function validarLimiteCedae(
  quantidadeExistente: number,
  tipo: TipoTeste,
  limite: number = LIMITE_CEDAE,
): ResultadoValidacao {
  if (tipo !== TIPO_TESTE_CEDAE) return { ok: true };
  if (quantidadeExistente >= limite) {
    return {
      ok: false,
      mensagem: `Limite de ${limite} testes CEDAE por elevatória atingido. Exclua um teste CEDAE para liberar uma vaga.`,
    };
  }
  return { ok: true };
}

// Conta quantos testes CEDAE existem para um código de elevatória normalizado.
export function contarCedaePorCodigo(
  registros: Array<{
    tipo_teste?: string | null;
    elevatoria_codigo?: string | null;
    Elevatória?: string | null;
  }>,
  codigo: string | null,
): number {
  if (!codigo) return 0;
  return registros.filter((r) => {
    const tipo = r.tipo_teste ?? TIPO_TESTE_ADR;
    if (tipo !== TIPO_TESTE_CEDAE) return false;
    const chave = r.elevatoria_codigo ?? normalizarCodigoElevatoria(r.Elevatória ?? null);
    return chave === codigo;
  }).length;
}

// Gera um id numérico para testes cadastrados manualmente (a PK é BIGINT sem identity).
export function gerarIdTeste(agora: number = Date.now()): number {
  return Math.floor(agora);
}

function isoParaData(valor: unknown): string | null {
  if (valor == null) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return valor.toISOString().split("T")[0];
  }
  const texto = String(valor).trim();
  if (!texto) return null;
  const d = new Date(texto);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return texto;
}

function texto(valor: unknown): string | null {
  if (valor == null) return null;
  if (valor instanceof Date) return valor.toISOString();
  const s = String(valor).trim();
  return s === "" ? null : s;
}

// Mapeia uma linha crua do modelo de 24 colunas para as chaves internas.
export function mapearLinhaModelo(row: Record<string, unknown>): TesteNormalizado {
  const out: Record<string, unknown> = {};
  for (const [colForms, colInternal] of Object.entries(COLUNA_MODELO_PARA_INTERNO)) {
    const v = row[colForms];
    if (v !== null && v !== undefined) out[colInternal] = v instanceof Date ? v.toISOString() : v;
  }
  if (out.Id !== undefined && out.Id !== null && out.Id !== "") out.Id = Number(out.Id);
  return out as unknown as TesteNormalizado;
}

// Verifica se a linha só contém metadados (nenhum campo de teste preenchido).
export function linhaModeloVazia(row: Record<string, unknown>): boolean {
  const camposTeste: ColunaModeloTeste[] = [
    "Data do Teste",
    "Tipo de Serviço",
    "Elevatória",
    "Grupo",
    "Tensão ( V )",
    "Corrente ( A )",
    "Retaguarda",
    "Recalque",
    "Corrente ShutOff",
    "Retaguarda ShutOff",
    "Recalque ShutOff",
    "Impossibilidade:",
    "Serviço Executado:",
    "Nome dos Colaboradores:",
    "Observação:",
    "Na Chegada",
    "Na saida",
    "Status",
  ];
  return camposTeste.every((c) => {
    const v = row[c];
    return v === null || v === undefined || String(v).trim() === "";
  });
}

export type TestePayload = {
  id: number;
  hora_inicio: string | null;
  hora_conclusao: string | null;
  email: string | null;
  nome: string | null;
  data_teste: string | null;
  tipo_servico: string | null;
  elevatoria: string | null;
  elevatoria_codigo: string | null;
  grupo: string | null;
  tensao_v: string | null;
  corrente_a: string | null;
  retaguarda: string | null;
  recalque: string | null;
  corrente_shutoff: string | null;
  retaguarda_shutoff: string | null;
  recalque_shutoff: string | null;
  impossibilidade: string | null;
  servico_executado: string | null;
  nome_colaboradores: string | null;
  observacao: string | null;
  na_chegada: string | null;
  na_saida: string | null;
  status: string | null;
  tipo_teste: TipoTeste;
};

// Converte um teste normalizado no payload persistido em `testes_afericoes`.
// `tipo_teste` classifica o registro; a importação de planilha usa ADR por padrão.
export function montarPayloadTeste(
  row: TesteNormalizado,
  tipoTeste: TipoTeste = TIPO_TESTE_ADR,
  opcoes: { id?: number; criadoPor?: string } = {},
): TestePayload {
  const id = opcoes.id ?? row.Id ?? gerarIdTeste();
  const elevatoria = texto(row.Elevatória);
  return {
    id: Number(id),
    hora_inicio: texto(row["Hora de início"]),
    hora_conclusao: texto(row["Hora de conclusão"]),
    email: texto(row.Email),
    nome: texto(row.Nome),
    data_teste: isoParaData(row["Data do Teste"]),
    tipo_servico: texto(row["Tipo de Serviço"]),
    elevatoria,
    elevatoria_codigo: normalizarCodigoElevatoria(elevatoria),
    grupo: row.Grupo != null && String(row.Grupo).trim() !== "" ? String(row.Grupo) : null,
    tensao_v: texto(row["Tensão ( V )"]),
    corrente_a: texto(row["Corrente ( A )"]),
    retaguarda: texto(row.Retaguarda),
    recalque: texto(row.Recalque),
    corrente_shutoff: texto(row["Corrente ShutOff"]),
    retaguarda_shutoff: texto(row["Retaguarda ShutOff"]),
    recalque_shutoff: texto(row["Recalque ShutOff"]),
    impossibilidade: texto(row["Impossibilidade:"]),
    servico_executado: texto(row["Serviço Executado:"]),
    nome_colaboradores: texto(row["Nome dos Colaboradores:"]),
    observacao: texto(row["Observação:"]),
    na_chegada: texto(row["Na Chegada"]),
    na_saida: texto(row["Na saida"]),
    status: texto(row.Status),
    tipo_teste: tipoTeste,
  };
}

// Dados do formulário manual de teste (modal "Adicionar teste").
export type FormularioTeste = {
  dataTeste: string;
  tipoServico: string;
  grupo: string;
  nomeColaboradores: string;
  servicoExecutado: string;
  observacao: string;
  tensao: string;
  corrente: string;
  recalque: string;
  retaguarda: string;
  correnteShutOff: string;
  retaguardaShutOff: string;
  recalqueShutOff: string;
  naChegada: string;
  naSaida: string;
};

export const FORMULARIO_TESTE_VAZIO: FormularioTeste = {
  dataTeste: "",
  tipoServico: "",
  grupo: "",
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
};

// Converte o formulário manual no formato do modelo interno (24 colunas).
export function formularioParaLinhaModelo(
  form: FormularioTeste,
  elevatoriaNome: string,
): TesteNormalizado {
  const row: Record<string, unknown> = {
    "Data do Teste": form.dataTeste || null,
    "Tipo de Serviço": form.tipoServico || null,
    Elevatória: elevatoriaNome || null,
    Grupo: form.grupo || null,
    "Tensão ( V )": form.tensao || null,
    "Corrente ( A )": form.corrente || null,
    Retaguarda: form.retaguarda || null,
    Recalque: form.recalque || null,
    "Corrente ShutOff": form.correnteShutOff || null,
    "Retaguarda ShutOff": form.retaguardaShutOff || null,
    "Recalque ShutOff": form.recalqueShutOff || null,
    "Serviço Executado:": form.servicoExecutado || null,
    "Nome dos Colaboradores:": form.nomeColaboradores || null,
    "Observação:": form.observacao || null,
    "Na Chegada": form.naChegada || null,
    "Na saida": form.naSaida || null,
  };
  return row as unknown as TesteNormalizado;
}

export function montarPayloadFormulario(
  form: FormularioTeste,
  elevatoriaNome: string,
  tipoTeste: TipoTeste,
): TestePayload {
  return montarPayloadTeste(formularioParaLinhaModelo(form, elevatoriaNome), tipoTeste, {
    id: gerarIdTeste(),
  });
}
