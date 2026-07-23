export type CronogramaProjeto = {
  id: number;
  nome: string;
  descricao: string | null;
  data_inicio_base: string;
  duracao_padrao_dias: number;
  campo_agrupamento_label: string;
  visibilidade: "privado" | "publico";
  link_publico_token: string | null;
  criado_por: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  criado_por_nome?: string | null;
};

export type CronogramaItem = {
  id: number;
  projeto_id: number;
  nome: string;
  grupo: string;
  ordem: number;
  duracao_dias: number | null;
  data_inicio_calculada: string | null;
  data_termino_calculada: string | null;
  data_inicio_travada: boolean;
  cor_grupo: string | null;
  status: "nao_iniciado" | "em_andamento" | "concluido" | "atrasado";
  os_referencia: string | null;
  rc_referencia: string | null;
  responsavel_id: string | null;
  metadados: Record<string, unknown> | null;
  criado_em: string | null;
  atualizado_em: string | null;
  responsavel_nome?: string | null;
};

export type CronogramaComentario = {
  id: number;
  item_id: number;
  autor_id: string | null;
  conteudo: string;
  mencionados: string[];
  criado_em: string | null;
  autor_nome?: string | null;
};

export type CronogramaAuditoria = {
  id: number;
  item_id: number | null;
  projeto_id: number;
  usuario_id: string | null;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  criado_em: string | null;
  usuario_nome?: string | null;
};

export type Notificacao = {
  id: number;
  usuario_id: string;
  tipo: string;
  referencia_tipo: string;
  referencia_id: number | null;
  mensagem: string;
  lida: boolean;
  criado_em: string | null;
};

export const STATUS_OPCOES = [
  { value: "nao_iniciado", label: "Não iniciado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "atrasado", label: "Atrasado" },
] as const;

export const STATUS_CORES: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  nao_iniciado: {
    bg: "bg-slate-100 dark:bg-slate-700",
    border: "border-slate-300 dark:border-slate-500",
    text: "text-slate-500 dark:text-slate-400",
    icon: "●",
  },
  em_andamento: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-400 dark:border-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    icon: "◐",
  },
  concluido: {
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-400 dark:border-green-500",
    text: "text-green-600 dark:text-green-400",
    icon: "✓",
  },
  atrasado: {
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-400 dark:border-red-500",
    text: "text-red-600 dark:text-red-400",
    icon: "⚠",
  },
};
