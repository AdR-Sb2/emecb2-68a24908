export type CaopEmec = {
  id: number;
  ano: number;
  mes: number;
  orcamento: number | null;
  custo_realizado: number | null;
  total_os: number | null;
  tipos_os: Record<string, number> | null;
  detalhamento: Record<string, number> | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

export const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export function nomeMes(mes: number): string {
  return MESES.find((m) => m.value === mes)?.label ?? String(mes);
}

export const TIPOS_OS_PADRAO = ["Preventiva", "Corretiva", "Emergencial"] as const;

export const DETALHAMENTO_PADRAO = ["Folha", "Serviço", "Material", "Veículos"] as const;

export const DETALHAMENTO_CORES: Record<string, string> = {
  Folha: "#0b3a73",
  Serviço: "#ef4444",
  Material: "#f59e0b",
  Veículos: "#10b981",
};

export const TIPOS_OS_CORES = ["#0b3a73", "#ef4444", "#f59e0b"];

export function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}
