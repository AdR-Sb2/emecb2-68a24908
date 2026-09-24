export type PlanoManutencaoEquipamento = {
  id?: string;
  elevatoria_id?: number | null;
  nome_elevatoria: string;
  planta: string;
  tag_equipamento: string;
  tipo_equipamento: string;
  plano_ativo: boolean;
  movimentado_corretamente: boolean;
  observacao?: string | null;
  criado_por?: string | null;
  atualizado_por?: string | null;
  criado_em?: string;
  atualizado_em?: string;
};

export type PlanoManutencaoModelo = {
  id?: string;
  nome: string;
  tipo_equipamento: string;
  tag_sugerida?: string | null;
  plano_ativo_padrao: boolean;
  movimentado_corretamente_padrao: boolean;
  observacao_padrao?: string | null;
  criado_por?: string | null;
  criado_em?: string;
  atualizado_em?: string;
};
