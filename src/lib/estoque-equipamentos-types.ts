export const TIPOS_EQUIPAMENTO = [
  "Motor",
  "Bomba Voluta",
  "Bomba Submersa",
  "Bomba Submersível",
  "Inversor Danfoss",
  "Inversor WEG",
  "Softstart SS07",
] as const;

export type TipoEquipamento = (typeof TIPOS_EQUIPAMENTO)[number];

export const STATUS_EQUIPAMENTO = ["Operacional", "Em manutenção", "Reserva", "Baixado"] as const;

export type StatusEquipamento = (typeof STATUS_EQUIPAMENTO)[number];

export interface EquipamentoCategoria {
  id: string;
  nome: string;
  ordem: number;
}

export interface Equipamento {
  id: string;
  tag: string;
  descricao: string;
  tipo: string;
  categoria_id: string | null;
  categorias?: EquipamentoCategoria | null;
  origem: string | null;
  codigo_sap: string | null;
  observacao: string | null;
  critico: boolean;
  status: StatusEquipamento;
  foto_url: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface EquipamentoFoto {
  id: string;
  equipamento_id: string;
  url: string;
  autor_id: string | null;
  criado_em: string;
}

export interface EquipamentoRegistro {
  id: string;
  equipamento_id: string;
  tipo: string;
  descricao: string;
  autor_id: string | null;
  autor_nome: string | null;
  criado_em: string;
}
