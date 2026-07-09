export type CategoriaMaterial =
  | "eletrico"
  | "mecanico"
  | "hidraulico"
  | "epi"
  | "consumivel"
  | "outros";

export const CATEGORIAS: CategoriaMaterial[] = [
  "eletrico",
  "mecanico",
  "hidraulico",
  "epi",
  "consumivel",
  "outros",
];

export const CATEGORIA_LABEL: Record<CategoriaMaterial, string> = {
  eletrico: "Elétrico",
  mecanico: "Mecânico",
  hidraulico: "Hidráulico",
  epi: "EPI",
  consumivel: "Consumível",
  outros: "Outros",
};

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE";

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
  categoria: CategoriaMaterial;
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

export type StatusEstoque = "normal" | "atencao" | "critico";

export function getStatusEstoque(
  saldo: number,
  minimo: number,
): StatusEstoque {
  if (saldo <= minimo) return "critico";
  if (saldo <= minimo * 1.2) return "atencao";
  return "normal";
}

export function getStatusCor(
  saldo: number,
  minimo: number,
): string {
  const s = getStatusEstoque(saldo, minimo);
  if (s === "critico") return "text-red-600 bg-red-50 border-red-200";
  if (s === "atencao") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}
