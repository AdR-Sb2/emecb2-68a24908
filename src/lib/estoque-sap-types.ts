export const SUPERINTENDENCIAS = [
  "BAIXADA 1",
  "BAIXADA 2",
  "LESTE",
  "NORTE",
  "CENTRO-SUL",
  "SEDE",
  "CDA",
  "COMUNIDADES",
] as const;

export type Superintendencia = (typeof SUPERINTENDENCIAS)[number];

export type EstoqueSapImportacao = {
  id: string;
  arquivo_nome: string;
  importado_por: string | null;
  importado_em: string;
  total_linhas: number;
  valor_total_livre: number;
  qtd_peps: number;
  ativa: boolean;
  status: "processando" | "concluida" | "erro";
  nome_importador?: string | null;
};

export type EstoqueSapResumo = {
  linhas: number;
  valor_total_livre: number;
  qtd_peps: number;
  peps_sem_vinculo: number;
  peps_prioritarios: number;
  novos_peps_sem_vinculo: number;
};

export type EstoqueSapSetor = {
  id: string;
  nome: string;
  ativo: boolean;
  criado_por: string | null;
};

export type EstoqueSapVinculo = {
  pep: string;
  setor_id: string | null;
  setor_nome: string | null;
  superintendencia: Superintendencia | null;
  prioritario: boolean;
  motivo: string;
  qtd_linhas: number;
};

export type EstoqueSapLinha = {
  id: number;
  importacao_id: string;
  centro: string;
  deposito: string;
  denominacao_deposito: string;
  material: string;
  texto_breve: string;
  unidade: string;
  tipo_material: string;
  grupo_mercadorias: string;
  estoque_especial: string;
  pep: string | null;
  qtd_livre: number;
  valor_livre: number;
  qtd_bloqueada: number;
  valor_bloqueado: number;
  setor_id: string | null;
  setor_nome: string | null;
  superintendencia: Superintendencia | null;
  prioritario: boolean;
  motivo_prioridade: string;
};

export type EstoqueSapAlteracao = {
  total_count: number;
  tipo: "Novo" | "Zerado" | "Aumentou" | "Reduziu";
  centro: string;
  pep: string | null;
  setor: string | null;
  superintendencia: Superintendencia | null;
  prioritario: boolean;
  motivo: string;
  deposito: string;
  denominacao_deposito: string;
  material: string;
  texto_breve: string;
  unidade: string;
  tipo_material: string;
  qtd_anterior: number | null;
  qtd_atual: number | null;
  delta_qtd: number;
  valor_anterior: number | null;
  valor_atual: number | null;
  delta_valor: number;
  delta_percent: number | null;
  bloqueado_anterior: number | null;
  bloqueado_atual: number | null;
};

export type EstoqueSapComparacaoResumo = {
  novos: number;
  zerados: number;
  aumentaram: number;
  reduziram: number;
  delta_valor: number;
  alteracoes_prioritarias: number;
  delta_prioritarios: number;
};

export type EstoqueSapPrioritarioComparacao = {
  pep: string;
  setor: string | null;
  superintendencia: Superintendencia | null;
  motivo: string;
  alteracoes: number;
  delta_valor: number;
  detalhes: Array<
    Omit<
      EstoqueSapAlteracao,
      | "total_count"
      | "pep"
      | "setor"
      | "superintendencia"
      | "prioritario"
      | "motivo"
      | "unidade"
      | "tipo_material"
      | "bloqueado_anterior"
      | "bloqueado_atual"
      | "centro"
    >
  >;
};

export type EstoqueSapFiltros = {
  busca: string;
  deposito: string;
  tipo_material: string;
  tipo_alteracao: string;
  setor: string;
  superintendencia: string;
  pep: string;
  somente_pep: boolean;
  somente_sem_vinculo: boolean;
  somente_prioritarios: boolean;
  com_bloqueado: boolean;
  ordem: string;
  direcao: "asc" | "desc";
};

export const PAGINAS_ESTOQUE_SAP = [200, 500, 1000] as const;

export const CABECALHOS_MODELO_ESTOQUE_SAP = [
  "Centro",
  "Nome 1",
  "Elemento PEP",
  "Estoque especial",
  "Depósito",
  "Denominação depósito",
  "Material",
  "Texto breve material",
  "Unid.medida básica",
  "Tipo de material",
  "Grupo de mercadorias",
  "Utilização livre",
  "Val.utiliz.livre",
  "Bloqueado",
  "Val.estoque bloq.",
];
