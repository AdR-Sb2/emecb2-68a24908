export interface Categoria {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em?: string;
}

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE";
export type OrigemMovimentacao = "HISTORICO_PLANILHA" | "SISTEMA";

export type StatusCompra =
  | "Solicitado"
  | "Aprovado"
  | "Comprado"
  | "A Caminho"
  | "Entregue";

export const STATUS_COMPRA_CORES: Record<StatusCompra, string> = {
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
  cod_sap: string;
  quantidade_solicitada: number;
  quantidade_recebida: number;
  status: StatusCompra;
  data_solicitacao: string;
  data_prevista_entrega: string | null;
  data_entrega_real: string | null;
  fornecedor: string;
  numero_pedido: string;
  solicitante: string;
  observacao: string;
  criado_por: string;
  criado_em: string;
}

export type StatusEstoque = "normal" | "atencao" | "baixo" | "sem_estoque";

export function getStatusEstoque(
  saldo: number,
  minimo: number,
): StatusEstoque {
  if (saldo === 0) return "sem_estoque";
  if (saldo <= minimo) return "baixo";
  if (saldo <= minimo * 1.2) return "atencao";
  return "normal";
}

export function getStatusCor(
  saldo: number,
  minimo: number,
): string {
  const s = getStatusEstoque(saldo, minimo);
  if (s === "sem_estoque") return "text-red-700 bg-red-100 border-red-300";
  if (s === "baixo") return "text-orange-600 bg-orange-50 border-orange-200";
  if (s === "atencao") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}
