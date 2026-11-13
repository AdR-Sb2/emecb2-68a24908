// Fonte única de dados de Testes & Aferições (dashboard e Ficha da elevatória).
// Este módulo é puro (sem Supabase/React) para permitir testes automatizados.
// A consulta ao banco fica em `testes-api.ts` e é a MESMA para as duas telas.

import {
  TIPO_TESTE_ADR,
  normalizarCodigoElevatoria,
  normalizarTipoTeste,
  type TipoTeste,
} from "./testes-tipos";

// Linha de teste no formato do modelo (chaves do Microsoft Forms + classificação).
export type TesteRow = {
  Id: number | null;
  "Hora de início": string | null;
  "Hora de conclusão": string | null;
  Email: string | null;
  Nome: string | null;
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
  tipo_teste: TipoTeste;
};

// Converte uma linha crua de `testes_afericoes` (snake_case) para o modelo.
// Usada pelo dashboard E pela Ficha — garante que as duas telas leiam idêntico.
export function mapearTesteDb(row: Record<string, unknown>): TesteRow {
  return {
    Id: typeof row.id === "number" ? row.id : row.id ? Number(row.id) : null,
    "Hora de início": (row.hora_inicio as string) ?? null,
    "Hora de conclusão": (row.hora_conclusao as string) ?? null,
    Email: (row.email as string) ?? null,
    Nome: (row.nome as string) ?? null,
    "Data do Teste": (row.data_teste as string) ?? null,
    "Tipo de Serviço": (row.tipo_servico as string) ?? null,
    Elevatória: (row.elevatoria as string) ?? null,
    Grupo: (row.grupo as string) ?? null,
    "Tensão ( V )": (row.tensao_v as string) ?? null,
    "Corrente ( A )": (row.corrente_a as string) ?? null,
    Retaguarda: (row.retaguarda as string) ?? null,
    Recalque: (row.recalque as string) ?? null,
    "Corrente ShutOff": (row.corrente_shutoff as string) ?? null,
    "Retaguarda ShutOff": (row.retaguarda_shutoff as string) ?? null,
    "Recalque ShutOff": (row.recalque_shutoff as string) ?? null,
    "Impossibilidade:": (row.impossibilidade as string) ?? null,
    "Serviço Executado:": (row.servico_executado as string) ?? null,
    "Nome dos Colaboradores:": (row.nome_colaboradores as string) ?? null,
    "Observação:": (row.observacao as string) ?? null,
    "Na Chegada": (row.na_chegada as string) ?? null,
    "Na saida": (row.na_saida as string) ?? null,
    Status: (row.status as string) ?? null,
    tipo_teste: normalizarTipoTeste(row.tipo_teste as string | null | undefined),
  };
}

// Compara duas elevatórias pela PLANTA (nunca pelo nome): extrai o código,
// remove espaços e compara em caixa alta. Sem planta reconhecível -> nunca casa.
export function mesmaPlanta(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = normalizarCodigoElevatoria(a);
  const cb = normalizarCodigoElevatoria(b);
  return ca != null && ca === cb;
}

export function filtrarTestesPorPlanta(
  rows: TesteRow[],
  planta: string | null | undefined,
): TesteRow[] {
  return rows.filter((r) => mesmaPlanta(r.Elevatória, planta));
}

export function filtrarTestesPorTipo(
  rows: TesteRow[],
  tipo: string | null | undefined,
): TesteRow[] {
  const alvo = normalizarTipoTeste(tipo);
  return rows.filter((r) => normalizarTipoTeste(r.tipo_teste) === alvo);
}

// Conjunto exibido na aba "Testes AdR" da Ficha: AdR da planta (somente leitura).
export function testesDaFicha(rows: TesteRow[], planta: string | null | undefined): TesteRow[] {
  return filtrarTestesPorPlanta(filtrarTestesPorTipo(rows, TIPO_TESTE_ADR), planta);
}

// Mesmo conjunto que o dashboard mostra para TIPO DE TESTE + ELEVATÓRIA (planta).
export function testesDoDashboard(
  rows: TesteRow[],
  filtros: { tipoTeste?: string | null; planta?: string | null } = {},
): TesteRow[] {
  let out = rows;
  if (filtros.tipoTeste && filtros.tipoTeste !== "TODOS") {
    out = filtrarTestesPorTipo(out, filtros.tipoTeste);
  }
  if (filtros.planta && filtros.planta !== "TODOS") {
    out = filtrarTestesPorPlanta(out, filtros.planta);
  }
  return out;
}
