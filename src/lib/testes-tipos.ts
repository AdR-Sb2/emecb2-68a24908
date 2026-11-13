// Regras de domínio dos Testes & Aferições (CEDAE x AdR).
// Módulo puro (sem React/Supabase) para permitir testes automatizados.

export type TipoTeste = "CEDAE" | "ADR";

export const TIPO_TESTE_CEDAE: TipoTeste = "CEDAE";
export const TIPO_TESTE_ADR: TipoTeste = "ADR";
export const TIPOS_TESTE: TipoTeste[] = [TIPO_TESTE_CEDAE, TIPO_TESTE_ADR];

// Valor canônico exibido na interface (o persistido é sempre "ADR"/"CEDAE").
export const TIPO_TESTE_ADR_LABEL = "AdR";

// Canonicaliza o valor de tipo_teste. Compara sem diferenciar maiúsculas, aceita
// "AdR"/"adr"/"ADR" e trata ausente/vazio/desconhecido como AdR (o padrão da
// importação de planilha, que não classifica o teste).
export function normalizarTipoTeste(valor: string | null | undefined): TipoTeste {
  if (valor == null) return TIPO_TESTE_ADR;
  const v = String(valor).trim().toUpperCase();
  if (v === TIPO_TESTE_CEDAE) return TIPO_TESTE_CEDAE;
  if (v === TIPO_TESTE_ADR) return TIPO_TESTE_ADR;
  return TIPO_TESTE_ADR;
}

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

// Extrai a planta (código) da elevatória a partir de um texto livre.
// A planta é o padrão "PL-RJB-" + letras + números; compara-se sempre em caixa
// alta e sem espaços, NUNCA pelo nome.
// Ex.: "PL-RJB-EAT0053 - Ivo Miranda" -> "PL-RJB-EAT0053"
//      "PL-RJB-EEAT0073  - CHATUBA"   -> "PL-RJB-EEAT0073"
//      "  pl-rjb-sda1003"             -> "PL-RJB-SDA1003"
// Prefixos diferentes NÃO são unificados: EAT0053 e EEAT0053 são plantas
// distintas (ver detectarPrefixosDivergentes). Sem planta reconhecível -> null.
const PLANTA_RE = /PL-RJB-[A-Z]+\s*\d+/i;

export function normalizarCodigoElevatoria(valor: string | null | undefined): string | null {
  if (valor == null) return null;
  const texto = String(valor);
  if (!texto.trim()) return null;

  const match = texto.match(PLANTA_RE);
  if (!match) return null;

  return match[0].replace(/\s+/g, "").toUpperCase();
}

export type DivergenciaPlanta = {
  numero: string;
  prefixos: string[];
  exemplos: string[];
};

// Detecta números de planta que aparecem com prefixos diferentes (ex.: EAT0053
// e EEAT0053). Esses casos NÃO devem ser juntados em silêncio — são reportados
// para revisão. Retorna apenas os números com mais de um prefixo.
export function detectarPrefixosDivergentes(
  valores: Array<string | null | undefined>,
): DivergenciaPlanta[] {
  const porNumero = new Map<string, Map<string, Set<string>>>();
  for (const valor of valores) {
    const codigo = normalizarCodigoElevatoria(valor);
    if (!codigo) continue;
    const m = codigo.match(/^PL-RJB-([A-Z]+)(\d+)$/);
    if (!m) continue;
    const [, prefixo, numero] = m;
    if (!porNumero.has(numero)) porNumero.set(numero, new Map());
    const prefixos = porNumero.get(numero)!;
    if (!prefixos.has(prefixo)) prefixos.set(prefixo, new Set());
    prefixos.get(prefixo)!.add(codigo);
  }

  const divergencias: DivergenciaPlanta[] = [];
  for (const [numero, prefixos] of porNumero.entries()) {
    if (prefixos.size > 1) {
      divergencias.push({
        numero,
        prefixos: [...prefixos.keys()].sort(),
        exemplos: [...prefixos.values()].flatMap((s) => [...s]).sort(),
      });
    }
  }
  return divergencias.sort((a, b) => a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }));
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
    if (normalizarTipoTeste(r.tipo_teste) !== TIPO_TESTE_CEDAE) return false;
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
// Os campos seguem o Forms do Microsoft, na mesma ordem e rótulos.
export type FormularioTeste = {
  dataTeste: string;
  tipoServico: string;
  // Quando vazio, usa-se o fallback informado (ex.: a elevatória da Ficha).
  elevatoria?: string;
  grupo: string;
  tensao: string;
  corrente: string;
  retaguarda: string;
  recalque: string;
  correnteShutOff: string;
  retaguardaShutOff: string;
  recalqueShutOff: string;
  impossibilidade?: string;
  servicoExecutado: string;
  nomeColaboradores: string;
  observacao: string;
  naChegada: string;
  naSaida: string;
  status?: string;
};

export const FORMULARIO_TESTE_VAZIO: FormularioTeste = {
  dataTeste: "",
  tipoServico: "",
  elevatoria: "",
  grupo: "",
  tensao: "",
  corrente: "",
  retaguarda: "",
  recalque: "",
  correnteShutOff: "",
  retaguardaShutOff: "",
  recalqueShutOff: "",
  impossibilidade: "",
  servicoExecutado: "",
  nomeColaboradores: "",
  observacao: "",
  naChegada: "",
  naSaida: "",
  status: "",
};

// Converte o formulário manual no formato do modelo interno (24 colunas).
export function formularioParaLinhaModelo(
  form: FormularioTeste,
  elevatoriaFallback = "",
): TesteNormalizado {
  const elevatoria = form.elevatoria || elevatoriaFallback;
  const row: Record<string, unknown> = {
    "Data do Teste": form.dataTeste || null,
    "Tipo de Serviço": form.tipoServico || null,
    Elevatória: elevatoria || null,
    Grupo: form.grupo || null,
    "Tensão ( V )": form.tensao || null,
    "Corrente ( A )": form.corrente || null,
    Retaguarda: form.retaguarda || null,
    Recalque: form.recalque || null,
    "Corrente ShutOff": form.correnteShutOff || null,
    "Retaguarda ShutOff": form.retaguardaShutOff || null,
    "Recalque ShutOff": form.recalqueShutOff || null,
    "Impossibilidade:": form.impossibilidade || null,
    "Serviço Executado:": form.servicoExecutado || null,
    "Nome dos Colaboradores:": form.nomeColaboradores || null,
    "Observação:": form.observacao || null,
    "Na Chegada": form.naChegada || null,
    "Na saida": form.naSaida || null,
    Status: form.status || null,
  };
  return row as unknown as TesteNormalizado;
}

export function montarPayloadFormulario(
  form: FormularioTeste,
  elevatoriaFallback: string,
  tipoTeste: TipoTeste,
): TestePayload {
  return montarPayloadTeste(formularioParaLinhaModelo(form, elevatoriaFallback), tipoTeste, {
    id: gerarIdTeste(),
  });
}
