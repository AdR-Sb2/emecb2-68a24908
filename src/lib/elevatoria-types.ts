export type Elevatoria = {
  id: number;
  nome: string;
  planta: string | null;
  tipo: string | null;
  superintendencia: string | null;
  endereco: string | null;
  bairro: string | null;
  municipio: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  inicio_operacao: string | null;
  caracteristicas_area: string | null;
  grupo: string | null;
  funcao: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type ElevatoriaEquipamento = {
  id: number;
  elevatoria_id: number;
  potencia_motor_cv: string | null;
  rpm: string | null;
  marca_motor: string | null;
  carcaca_motor: string | null;
  tag_motor: string | null;
  tensao_v: string | null;
  corrente_a: string | null;
  mancais_la: string | null;
  mancais_loa: string | null;
  modelo_bomba: string | null;
  tag_bomba: string | null;
  marca_bomba: string | null;
  diametro_rotor_pol: string | null;
  diametro_rotor_mm: string | null;
  tipo_construtivo_elevatoria: string | null;
  bomba_dreno: string | null;
  ponta_eixo_motor: string | null;
  sentido_montagem_motor: string | null;
  flange: string | null;
  forma_construtiva_bomba: string | null;
  vazao_aproximada_m3h: string | null;
  amt_aproximada: string | null;
  capacidade_tratamento: string | null;
  procedencia_mca: string | null;
  cod_sap: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type ElevatoriaEletrica = {
  id: number;
  elevatoria_id: number;
  bt_mt: string | null;
  trafo_kva: string | null;
  num_cliente: string | null;
  medidor: string | null;
  medidor_apurado: string | null;
  medidor_apurado_data: string | null;
  unidade_consumo: string | null;
  endereco_concessionaria: string | null;
  fusivel_pc: string | null;
  disjuntor_pc: string | null;
  regulagem_rele_termico_bimetálico: string | null;
  rele_tempo_delta_y: string | null;
  rele_eletrodo_nivel: string | null;
  monitor_corrente: string | null;
  tamanho_fusivel_nh: string | null;
  corrente_fusivel_nh: string | null;
  corrente_fusivel_dz: string | null;
  tag_painel: string | null;
  tipo_acionamento: string | null;
  fabricante_acionamento: string | null;
  modelo_acionamento: string | null;
  corrente_a_acionamento: string | null;
  tag_acionamento: string | null;
  clp: string | null;
  pcp: string | null;
  retaguarda_liga: string | null;
  retaguarda_desliga: string | null;
  recalque_setpoint: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type ElevatoriaHidraulica = {
  id: number;
  elevatoria_id: number;
  succao: string | null;
  recalque: string | null;
  tronco: string | null;
  distancia_ate_elev: string | null;
  tomada_retaguarda: string | null;
  tomada_recalque: string | null;
  eletrodo_superior: string | null;
  eletrodo_inferior: string | null;
  tipo_recalque: string | null;
  cota_elevatoria: string | null;
  cota_maxima: string | null;
  distancia_elev_coordenacao: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type ElevatoriaAreaInfluencia = {
  id: number;
  elevatoria_id: number;
  populacao_beneficiada_habitantes: string | null;
  domicilios: string | null;
  comunidades_hospitais_locais_importantes: string | null;
  area_influencia: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type ElevatoriaRolamentoSelo = {
  id: number;
  elevatoria_id: number;
  tipo: string | null;
  cadeados_padrao: string | null;
  quantidade_cadeados: string | null;
  rolamento_motor: string | null;
  rolamento_bomba: string | null;
  b_acoplamento: string | null;
  gaxeta: string | null;
  selo_mecanico: string | null;
  data_troca: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type StatusImplantacao = 'planejada' | 'em_construcao' | 'instalada' | 'em_testes' | 'operacional';

export type ElevatoriaImplantacao = {
  id: number;
  elevatoria_id: number;
  tipo: string | null;
  segmento: string | null;
  status: StatusImplantacao;
  fase_atual: string | null;
  observacoes_inconformidades: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type ElevatoriaImplantacaoEtapa = {
  id: number;
  implantacao_id: number;
  descricao: string;
  concluida: boolean;
  ordem: number;
  criado_em: string | null;
  atualizado_em: string | null;
};

export type ElevatoriaAuditoria = {
  id: number;
  elevatoria_id: number;
  tabela: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_id: string | null;
  criado_em: string | null;
  usuario_nome?: string | null;
};

export type ElevatoriaCampoNA = {
  id: number;
  elevatoria_id: number;
  tabela: string;
  campo: string;
  motivo: string;
};

export const IMPLANTACAO_STATUS_OPCOES: { value: StatusImplantacao; label: string }[] = [
  { value: 'planejada', label: 'Planejada' },
  { value: 'em_construcao', label: 'Em Construção' },
  { value: 'instalada', label: 'Instalada' },
  { value: 'em_testes', label: 'Em Testes' },
  { value: 'operacional', label: 'Operacional' },
];

export const IMPLANTACAO_STATUS_CORES: Record<string, string> = {
  planejada: 'bg-slate-100 text-slate-600 border-slate-300',
  em_construcao: 'bg-amber-100 text-amber-700 border-amber-200',
  instalada: 'bg-blue-100 text-blue-700 border-blue-200',
  em_testes: 'bg-purple-100 text-purple-700 border-purple-200',
  operacional: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export type CompletudeNivel = 'critico' | 'atencao' | 'bom';

export type ElevatoriaCompletude = {
  elevatoria_id: number;
  total_campos: number;
  preenchidos: number;
  na_aplicaveis: number;
  percentual: number;
  nivel: CompletudeNivel;
};

export function calcCompletude(preenchidos: number, total: number, naAplicaveis: number): CompletudeNivel {
  const aplicaveis = total - naAplicaveis;
  if (aplicaveis <= 0) return 'bom';
  const pct = (preenchidos / aplicaveis) * 100;
  if (pct >= 80) return 'bom';
  if (pct >= 50) return 'atencao';
  return 'critico';
}

export function getCompletudeCor(nivel: CompletudeNivel): string {
  if (nivel === 'bom') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  if (nivel === 'atencao') return 'bg-amber-100 text-amber-700 border-amber-300';
  return 'bg-red-100 text-red-700 border-red-300';
}

export const TABELAS_DADOS_MESTRES = [
  { key: 'equipamento', label: 'Equipamento Instalado', table: 'elevatoria_equipamento' },
  { key: 'eletrica', label: 'Elétrica & Automação', table: 'elevatoria_eletrica' },
  { key: 'hidraulica', label: 'Hidráulica', table: 'elevatoria_hidraulica' },
  { key: 'rolamentos', label: 'Rolamentos & Selos', table: 'elevatoria_rolamentos_selos' },
  { key: 'area_influencia', label: 'Área de Influência', table: 'elevatoria_area_influencia' },
  { key: 'implantacao', label: 'Implantação', table: 'elevatoria_implantacao' },
] as const;
