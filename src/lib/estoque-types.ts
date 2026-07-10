export interface Categoria {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em?: string;
}

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE";
export type OrigemMovimentacao = "HISTORICO_PLANILHA" | "SISTEMA";

export type StatusCompra =
  | "Requisição - Item Concluído"
  | "Requisição - Item Eliminado"
  | "Cotação a agregar"
  | "Cotação - em Negociação"
  | "PC - em Aprovação"
  | "Aguardando emissão NF"
  | "Escrituração Parcial Realizada"
  | "Escrituração Final Realizada"
  | "Escrituração Realizada"
  | "Solicitado"
  | "Aprovado"
  | "Comprado"
  | "A Caminho"
  | "Entregue";

export const STATUS_COMPRA_CORES: Record<StatusCompra, string> = {
  "Requisição - Item Concluído": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Requisição - Item Eliminado": "bg-slate-100 text-slate-500 border-slate-200",
  "Cotação a agregar": "bg-amber-100 text-amber-800 border-amber-200",
  "Cotação - em Negociação": "bg-orange-100 text-orange-800 border-orange-200",
  "PC - em Aprovação": "bg-blue-100 text-blue-800 border-blue-200",
  "Aguardando emissão NF": "bg-purple-100 text-purple-800 border-purple-200",
  "Escrituração Parcial Realizada": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Escrituração Final Realizada": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Escrituração Realizada": "bg-emerald-100 text-emerald-800 border-emerald-200",
  Solicitado: "bg-amber-100 text-amber-800 border-amber-200",
  Aprovado: "bg-blue-100 text-blue-800 border-blue-200",
  Comprado: "bg-purple-100 text-purple-800 border-purple-200",
  "A Caminho": "bg-cyan-100 text-cyan-800 border-cyan-200",
  Entregue: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export interface Material {
  id: number;
  cod_sap: string;
  descricao: string;
  unidade_medida: string;
  categoria_id: number;
  categorias?: Categoria | null;
  fabricante: string;
  local_armazenagem: string;
  estoque_minimo: number;
  material_critico: boolean;
  vinculo_elevatoria: string;
  ativo: boolean;
  saldo_atual: number;
  custo_unitario: number;
  criado_em: string;
  atualizado_em: string;
}

export function getCategoriaNome(m: Material): string {
  return m.categorias?.nome ?? "—";
}

export interface Movimentacao {
  id: number;
  cod_sap: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  data: string;
  destino: string;
  solicitante: string;
  responsavel: string;
  observacao: string;
  motivo_ajuste: string;
  criado_por: string;
  criado_em: string;
  origem: OrigemMovimentacao;
  afeta_saldo: boolean;
  divergencia_cod_sap: boolean;
}

export interface Compra {
  id: number;
  requisicao: number | null;
  item_rc: number | null;
  cod_sap: string | null;
  descricao_material: string | null;
  qtde_rc: number | null;
  comprador_cotacao: string | null;
  deposito_rc: string | null;
  pedido: string | null;
  fornecedor: string | null;
  status_geral: StatusCompra | null;
  dt_criacao_rc: string | null;
  dt_aprovacao_rc: string | null;
  dt_criacao_pedido: string | null;
  dt_remessa_pedido: string | null;
  data_confirmada: string | null;
  emissao_nf: string | null;
  dt_pagamento: string | null;
  chegou: boolean;
  data_chegou: string | null;
  foi_retirado: boolean;
  data_retirado: string | null;
  cobrado_via_email: boolean;
  observacao: string | null;
  solicitante: string | null;
  previsao_uso: string | null;
  rc_em_fila: boolean;
  afeta_saldo: boolean;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}

export type StatusEstoque = "normal" | "atencao" | "baixo" | "sem_estoque";

export function getStatusEstoque(saldo: number, minimo: number): StatusEstoque {
  if (saldo === 0) return "sem_estoque";
  if (saldo <= minimo) return "baixo";
  if (saldo <= minimo * 1.2) return "atencao";
  return "normal";
}

export function getStatusCor(saldo: number, minimo: number): string {
  const s = getStatusEstoque(saldo, minimo);
  if (s === "sem_estoque") return "text-red-700 bg-red-100 border-red-300";
  if (s === "baixo") return "text-orange-600 bg-orange-50 border-orange-200";
  if (s === "atencao") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}
