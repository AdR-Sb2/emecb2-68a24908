import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Printer,
  FileSpreadsheet,
  ShieldAlert,
  Info,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type LinhaAnalitico = {
  elevatoria_id: number;
  nome: string;
  planta: string | null;
  municipio: string | null;
  ultima_preventiva_valida: string | null;
  dias_sem_preventiva_valida: number | null;
  qtd_preventiva_valida_janela: number;
  qtd_corretiva_janela: number;
  qtd_ztpc_janela: number;
  razao_corretiva_preventiva: number | null;
  status_plano: string;
  justificativa_sem_preventiva: string | null;
};

type PontoTendencia = {
  mes: string;
  preventiva: number;
  corretiva: number;
};

type PontoTendenciaComRazao = PontoTendencia & {
  razao: number | null;
};

type Ordenacao = { coluna: string | null; direcao: "asc" | "desc" };

const JANELAS = [3, 6, 12, 24];

const SUGESTOES_JUSTIFICATIVA = ["NOVO", "INSTALANDO", "EM ANÁLISE"];

const META_RAZAO = 10;

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MESES_PT_CURTO = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatMesLabel(mes: string): string {
  const [ano, mm] = mes.split("-");
  const i = Number(mm) - 1;
  return MESES_PT[i] ? `${MESES_PT[i]}/${ano}` : mes;
}

function formatMesTick(mes: string): string {
  const [ano, mm] = mes.split("-");
  const i = Number(mm) - 1;
  return MESES_PT_CURTO[i] ? `${MESES_PT_CURTO[i]}/${ano.slice(2)}` : mes;
}

function fmtRazao(r: number | null): string {
  if (r === null) return "∞";
  return r.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function somaPrevCorr(
  pontos: PontoTendenciaComRazao[],
  n: number,
): { prev: number; corr: number; razao: number | null } {
  const slice = pontos.slice(-n);
  const prev = slice.reduce((s, p) => s + p.preventiva, 0);
  const corr = slice.reduce((s, p) => s + p.corretiva, 0);
  return { prev, corr, razao: corr > 0 ? prev / corr : null };
}

const STATUS_INFO: Record<
  string,
  { label: string; ordem: number; chip: string; card: string; coluna: string }
> = {
  critico_so_emergencial: {
    label: "Crítico (só emergencial)",
    ordem: 0,
    chip: "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100",
    card: "border-slate-900 bg-slate-900 text-white",
    coluna: "bg-slate-900 text-white border-slate-900",
  },
  parado: {
    label: "Parado",
    ordem: 1,
    chip: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
    card: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
    coluna:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  },
  atrasado: {
    label: "Atrasado",
    ordem: 2,
    chip: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    card: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    coluna:
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  },
  normal: {
    label: "Normal",
    ordem: 3,
    chip: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
    card: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    coluna:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  sem_dados: {
    label: "Sem dados",
    ordem: 4,
    chip: "bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
    card: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
    coluna:
      "bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
  },
};

const ORDEM_STATUS: Record<string, number> = {
  critico_so_emergencial: 0,
  parado: 1,
  atrasado: 2,
  normal: 3,
  sem_dados: 4,
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  const parts = d.slice(0, 10).split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isoDaysAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const CABECALHO_COLUNAS = [
  "Elevatória",
  "Município",
  "Última preventiva válida",
  "Dias sem preventiva",
  "Preventiva (janela)",
  "Corretiva (janela)",
  "ZTPC (janela)",
  "Razão Corr/Prev",
  "Status",
  "Justificativa (sem preventiva)",
];

const COLUNA_TOOLTIP: Record<string, string> = {
  Elevatória: "Nome da elevatória (estação de bombeamento)",
  Município: "Cidade onde a elevatória está localizada",
  "Última preventiva válida":
    "Data da O.S. mais recente do tipo Preventiva por Frequência (ZTPF) ou Preditiva (ZTPD)",
  "Dias sem preventiva": "Quantidade de dias corridos desde a última preventiva válida até hoje",
  "Preventiva (janela)":
    "Quantidade de preventivas válidas (ZTPF + ZTPD) dentro do período selecionado no filtro de janela",
  "Corretiva (janela)":
    "Quantidade de corretivas (ZNTE + ZNTP + ZTRE) dentro do período selecionado",
  "ZTPC (janela)":
    "Manutenções por Condição no período — não contam como preventiva válida; indicam que a frequência pode ter falhado",
  "Razão Corr/Prev":
    "Corretivas dividido por preventivas válidas na janela. Acima de 1 indica que a elevatória está recebendo mais corretiva do que preventiva",
  Status:
    "Classificação: Normal (<45 dias sem preventiva), Atrasado (45–89 dias), Parado (90+ dias), Crítico (zero preventiva válida com corretiva ocorrendo), Sem dados (nenhuma O.S. registrada no período)",
  "Justificativa (sem preventiva)":
    "Justificativa informada para elevatórias sem preventiva válida (ex.: NOVO, INSTALANDO, EM ANÁLISE)",
};

function CabecalhoCol({
  col,
  ordenacao,
  onOrdenar,
}: {
  col: string;
  ordenacao: Ordenacao;
  onOrdenar: (c: string) => void;
}) {
  const ativa = ordenacao.coluna === col;
  return (
    <th className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => onOrdenar(col)}
          className="inline-flex items-center gap-0.5 hover:text-[#1f7ad6]"
          title={`Ordenar por ${col}`}
        >
          {col}
          {ativa ? (
            ordenacao.direcao === "asc" ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </button>
        {COLUNA_TOOLTIP[col] && (
          <UiTooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-slate-400 dark:text-slate-500">
                <Info className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px]">
              <p>{COLUNA_TOOLTIP[col]}</p>
            </TooltipContent>
          </UiTooltip>
        )}
      </span>
    </th>
  );
}

function valorCelula(linha: LinhaAnalitico, coluna: string): string {
  switch (coluna) {
    case "Elevatória":
      return linha.nome || linha.planta || `#${linha.elevatoria_id}`;
    case "Município":
      return linha.municipio || "—";
    case "Última preventiva válida":
      return formatDate(linha.ultima_preventiva_valida);
    case "Dias sem preventiva":
      return linha.dias_sem_preventiva_valida != null
        ? String(linha.dias_sem_preventiva_valida)
        : "—";
    case "Preventiva (janela)":
      return String(linha.qtd_preventiva_valida_janela);
    case "Corretiva (janela)":
      return String(linha.qtd_corretiva_janela);
    case "ZTPC (janela)":
      return String(linha.qtd_ztpc_janela);
    case "Razão Corr/Prev":
      return linha.razao_corretiva_preventiva != null
        ? linha.razao_corretiva_preventiva.toLocaleString("pt-BR")
        : "sem base";
    case "Status":
      return STATUS_INFO[linha.status_plano]?.label ?? linha.status_plano;
    case "Justificativa (sem preventiva)":
      return linha.justificativa_sem_preventiva || "—";
    default:
      return "";
  }
}

function valorOrdenacao(linha: LinhaAnalitico, coluna: string): string | number | null {
  switch (coluna) {
    case "Elevatória":
      return (linha.nome || linha.planta || `#${linha.elevatoria_id}`).toLowerCase();
    case "Município":
      return linha.municipio ? linha.municipio.toLowerCase() : null;
    case "Última preventiva válida":
      return linha.ultima_preventiva_valida;
    case "Dias sem preventiva":
      return linha.dias_sem_preventiva_valida;
    case "Preventiva (janela)":
      return linha.qtd_preventiva_valida_janela;
    case "Corretiva (janela)":
      return linha.qtd_corretiva_janela;
    case "ZTPC (janela)":
      return linha.qtd_ztpc_janela;
    case "Razão Corr/Prev":
      return linha.razao_corretiva_preventiva;
    case "Status":
      return linha.status_plano;
    case "Justificativa (sem preventiva)":
      return linha.justificativa_sem_preventiva
        ? linha.justificativa_sem_preventiva.toLowerCase()
        : null;
    default:
      return null;
  }
}

function compararLinhas(
  a: LinhaAnalitico,
  b: LinhaAnalitico,
  coluna: string,
  direcao: "asc" | "desc",
): number {
  const va = valorOrdenacao(a, coluna);
  const vb = valorOrdenacao(b, coluna);
  if (va === null && vb === null) return 0;
  if (va === null) return direcao === "asc" ? -1 : 1;
  if (vb === null) return direcao === "asc" ? 1 : -1;
  let cmp: number;
  if (typeof va === "number" && typeof vb === "number") {
    cmp = va - vb;
  } else if (typeof va === "string" && typeof vb === "string") {
    if (coluna === "Status") {
      cmp = (ORDEM_STATUS[va] ?? 99) - (ORDEM_STATUS[vb] ?? 99);
    } else {
      cmp = va.localeCompare(vb, "pt-BR");
    }
  } else {
    cmp = 0;
  }
  return direcao === "asc" ? cmp : -cmp;
}

function CelulaJustificativa({
  linha,
  onSalvar,
}: {
  linha: LinhaAnalitico;
  onSalvar: (elevatoriaId: number, valor: string) => Promise<boolean>;
}) {
  const [rascunho, setRascunho] = useState(linha.justificativa_sem_preventiva ?? "");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setRascunho(linha.justificativa_sem_preventiva ?? "");
  }, [linha.justificativa_sem_preventiva]);

  const salvar = async (valor: string) => {
    if (salvando) return;
    setSalvando(true);
    try {
      const ok = await onSalvar(linha.elevatoria_id, valor);
      if (ok) {
        setSalvo(true);
        window.setTimeout(() => setSalvo(false), 1500);
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex max-w-[230px] flex-col gap-1">
      <input
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={() => {
          const atual = (linha.justificativa_sem_preventiva ?? "").trim();
          if (rascunho.trim() !== atual) void salvar(rascunho.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        disabled={salvando}
        placeholder="Digitar justificativa..."
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
      />
      <div className="flex flex-wrap items-center gap-1">
        {SUGESTOES_JUSTIFICATIVA.map((op) => {
          const ativa = rascunho.trim().toUpperCase() === op;
          return (
            <button
              key={op}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setRascunho(op);
                void salvar(op);
              }}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                ativa
                  ? "border-[#1f7ad6] bg-[#eaf3fb] text-[#0b3a73] dark:bg-slate-600 dark:text-white"
                  : "border-slate-300 text-slate-500 hover:border-[#1f7ad6] dark:border-slate-600 dark:text-slate-300"
              }`}
            >
              {op}
            </button>
          );
        })}
        {rascunho.trim() !== "" && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setRascunho("");
              void salvar("");
            }}
            className="text-[10px] font-semibold text-red-500 hover:underline"
          >
            limpar
          </button>
        )}
      </div>
      {salvo && <span className="text-[10px] font-semibold text-emerald-600">salvo</span>}
    </div>
  );
}

function MultiSelectMunicipio({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { nome: string; contagem: number }[];
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => {
    if (valor.includes(o)) onChange(valor.filter((v) => v !== o));
    else onChange([...valor, o]);
  };
  const label =
    valor.length === 0
      ? "Todos os municípios"
      : valor.length === 1
        ? valor[0]
        : `${valor.length} municípios`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-10 max-w-[220px] items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 hover:border-[#1f7ad6] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar município..." />
          <CommandList>
            <CommandEmpty>Nenhum município encontrado</CommandEmpty>
            {opcoes.map((op) => {
              const marcado = valor.includes(op.nome);
              return (
                <CommandItem
                  key={op.nome}
                  onSelect={() => toggle(op.nome)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        marcado
                          ? "border-[#1f7ad6] bg-[#1f7ad6] text-white"
                          : "border-slate-300 dark:border-slate-500"
                      }`}
                    >
                      {marcado && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{op.nome}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{op.contagem}</span>
                </CommandItem>
              );
            })}
          </CommandList>
          <div className="border-t p-1.5">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full rounded px-2 py-1 text-left text-xs font-semibold text-[#1f7ad6] hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Limpar seleção (todos)
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CardRazao({
  titulo,
  sub,
  d,
}: {
  titulo: string;
  sub: string;
  d: { prev: number; corr: number; razao: number | null };
}) {
  const dentro = d.razao === null || d.razao >= META_RAZAO;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {titulo}
      </div>
      <div
        className={`mt-1 text-3xl font-bold ${
          dentro ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {d.razao === null ? "∞" : `${fmtRazao(d.razao)} : 1`}
      </div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {d.prev} preventiva{d.prev === 1 ? "" : "s"} · {d.corr} corretiva{d.corr === 1 ? "" : "s"}
      </div>
      <div
        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          dentro
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        }`}
      >
        {dentro ? "dentro da meta" : `abaixo da meta (${META_RAZAO}:1)`}
      </div>
      <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{sub}</div>
    </div>
  );
}

function TooltipTendencia({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PontoTendenciaComRazao }>;
}) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  const razao = ponto.razao;
  const dentro = razao === null || razao >= META_RAZAO;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-bold text-slate-700 dark:text-slate-200">
        {formatMesLabel(ponto.mes)}
      </p>
      <p className="text-emerald-600 dark:text-emerald-400">
        Preventiva válida: {ponto.preventiva}
      </p>
      <p className="text-red-600 dark:text-red-400">Corretiva: {ponto.corretiva}</p>
      <p
        className={`mt-1 font-semibold ${
          dentro ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        Razão Prev/Corr: {razao === null ? "sem corretiva (∞)" : `${fmtRazao(razao)} : 1`} ·{" "}
        {dentro ? "dentro da meta" : "abaixo da meta (10:1)"}
      </p>
    </div>
  );
}

export function AnaliticoManutencao() {
  const [janelaMeses, setJanelaMeses] = useState<number>(12);
  const [dados, setDados] = useState<LinhaAnalitico[]>([]);
  const [tendencia, setTendencia] = useState<PontoTendencia[]>([]);
  const [emergenciais30dias, setEmergenciais30dias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);
  const [ocultarSemDados, setOcultarSemDados] = useState(true);
  const [municipiosSelecionados, setMunicipiosSelecionados] = useState<string[]>([]);
  const [buscaNome, setBuscaNome] = useState("");
  const [razaoMin, setRazaoMin] = useState("");
  const [razaoMax, setRazaoMax] = useState("");
  const [abaixoMeta, setAbaixoMeta] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>({ coluna: null, direcao: "asc" });
  const [exportando, setExportando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [res, tend, emerg] = await Promise.all([
        supabase.rpc("analitico_manutencao", { janela_meses: janelaMeses }),
        supabase.rpc("analitico_tendencia_mensal", {
          ultimos_meses: 24,
          municipios: municipiosSelecionados.length ? municipiosSelecionados : null,
        }),
        supabase
          .from("registros_atendimento")
          .select("*", { count: "exact", head: true })
          .eq("tipo_ordem", "ZNTE")
          .not("elevatoria_id", "is", null)
          .gte("data_entrada", isoDaysAtras(30)),
      ]);
      if (res.error) throw res.error;
      if (tend.error) throw tend.error;
      setDados((res.data ?? []) as LinhaAnalitico[]);
      setTendencia((tend.data ?? []) as PontoTendencia[]);
      setEmergenciais30dias(emerg.count ?? 0);
    } catch (err) {
      toast.error(
        "Erro ao carregar analítico: " + (err instanceof Error ? err.message : "desconhecido"),
      );
    } finally {
      setLoading(false);
    }
  }, [janelaMeses, municipiosSelecionados]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const municipiosDisponiveis = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dados) {
      const m = d.municipio;
      if (!m) continue;
      map.set(m, (map.get(m) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([nome, contagem]) => ({ nome, contagem }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [dados]);

  const contagemStatus = useMemo(() => {
    const c: Record<string, number> = {
      normal: 0,
      atrasado: 0,
      parado: 0,
      critico_so_emergencial: 0,
      sem_dados: 0,
    };
    const set = new Set(municipiosSelecionados);
    for (const d of dados) {
      if (set.size && (!d.municipio || !set.has(d.municipio))) continue;
      c[d.status_plano] = (c[d.status_plano] ?? 0) + 1;
    }
    return c;
  }, [dados, municipiosSelecionados]);

  const salvarJustificativa = async (elevatoriaId: number, valor: string) => {
    const novo = valor.trim() === "" ? null : valor.trim();
    const { error } = await supabase
      .from("elevatorias")
      .update({ justificativa_sem_preventiva: novo })
      .eq("id", elevatoriaId);
    if (error) {
      toast.error("Erro ao salvar justificativa: " + error.message);
      return false;
    }
    setDados((prev) =>
      prev.map((l) =>
        l.elevatoria_id === elevatoriaId ? { ...l, justificativa_sem_preventiva: novo } : l,
      ),
    );
    return true;
  };

  const linhasFiltradas = useMemo(() => {
    let list = dados;
    if (municipiosSelecionados.length) {
      const set = new Set(municipiosSelecionados);
      list = list.filter((l) => l.municipio !== null && set.has(l.municipio));
    }
    if (statusSelecionados.length) {
      const set = new Set(statusSelecionados);
      list = list.filter((l) => set.has(l.status_plano));
    }
    if (ocultarSemDados) {
      list = list.filter((l) => l.status_plano !== "sem_dados");
    }
    const busca = buscaNome.trim().toLowerCase();
    if (busca) {
      list = list.filter((l) => (l.nome || l.planta || "").toLowerCase().includes(busca));
    }
    const rMin = razaoMin.trim() === "" ? null : Number(razaoMin);
    const rMax = razaoMax.trim() === "" ? null : Number(razaoMax);
    if (rMin !== null || rMax !== null) {
      list = list.filter(
        (l) =>
          l.razao_corretiva_preventiva !== null &&
          (rMin === null || l.razao_corretiva_preventiva >= rMin) &&
          (rMax === null || l.razao_corretiva_preventiva <= rMax),
      );
    }
    if (abaixoMeta) {
      list = list.filter(
        (l) => l.razao_corretiva_preventiva !== null && l.razao_corretiva_preventiva > 0.1,
      );
    }
    const arr = [...list];
    if (ordenacao.coluna) {
      arr.sort((a, b) => compararLinhas(a, b, ordenacao.coluna!, ordenacao.direcao));
    } else {
      arr.sort((a, b) => {
        const sa = ORDEM_STATUS[a.status_plano] ?? 99;
        const sb = ORDEM_STATUS[b.status_plano] ?? 99;
        if (sa !== sb) return sa - sb;
        const da = a.dias_sem_preventiva_valida ?? Number.MAX_SAFE_INTEGER;
        const db = b.dias_sem_preventiva_valida ?? Number.MAX_SAFE_INTEGER;
        return db - da;
      });
    }
    return arr;
  }, [
    dados,
    municipiosSelecionados,
    statusSelecionados,
    ocultarSemDados,
    buscaNome,
    razaoMin,
    razaoMax,
    abaixoMeta,
    ordenacao,
  ]);

  const tendenciaComRazao = useMemo<PontoTendenciaComRazao[]>(
    () =>
      tendencia.map((p) => ({
        ...p,
        razao: p.corretiva > 0 ? p.preventiva / p.corretiva : null,
      })),
    [tendencia],
  );

  const cardMensal = useMemo(() => {
    if (!tendenciaComRazao.length) return { prev: 0, corr: 0, razao: null };
    const ultimo = tendenciaComRazao[tendenciaComRazao.length - 1];
    return { prev: ultimo.preventiva, corr: ultimo.corretiva, razao: ultimo.razao };
  }, [tendenciaComRazao]);

  const cardPeriodo = useMemo(
    () => somaPrevCorr(tendenciaComRazao, janelaMeses),
    [tendenciaComRazao, janelaMeses],
  );

  const cardAnual = useMemo(() => somaPrevCorr(tendenciaComRazao, 12), [tendenciaComRazao]);

  const criticos = useMemo(
    () => linhasFiltradas.filter((l) => l.status_plano === "critico_so_emergencial"),
    [linhasFiltradas],
  );

  const toggleStatus = (s: string) => {
    setStatusSelecionados((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const toggleOrdenacao = (coluna: string) => {
    setOrdenacao((prev) => {
      if (prev.coluna !== coluna) return { coluna, direcao: "asc" };
      if (prev.direcao === "asc") return { coluna, direcao: "desc" };
      return { coluna: null, direcao: "asc" };
    });
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      wb.creator = "EMEC Baixada 2";
      const ws = wb.addWorksheet("Analítico Manutenção");

      const AZUL = "002d74";
      const BRANCO = "FFFFFF";
      const CINZA = "F1F5F9";
      const CINZA_SEM_DADOS = "E2E8F0";
      const PRETO = "1E293B";
      const AMARELO = "FEF3C7";
      const VERMELHO = "FEE2E2";
      const VERDE = "D1FAE5";

      const numColunas = CABECALHO_COLUNAS.length;

      ws.mergeCells(1, 1, 1, numColunas);
      const titulo = ws.getCell("A1");
      titulo.value = "ANALÍTICO DE MANUTENÇÃO - PREVENTIVA x CORRETIVA";
      titulo.font = { name: "Calibri", size: 14, bold: true, color: { argb: BRANCO } };
      titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
      titulo.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 26;

      ws.mergeCells(2, 1, 2, numColunas);
      const sub = ws.getCell("A2");
      sub.value =
        `EMEC Baixada 2 - Águas do Rio | Gerado em ${new Date().toLocaleString("pt-BR")} | ` +
        `Janela de análise: ${janelaMeses} meses | Ordenado por criticidade`;
      sub.font = { name: "Calibri", size: 10, italic: true, color: { argb: "475569" } };
      sub.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(2).height = 20;

      ws.mergeCells(3, 1, 3, numColunas);
      const resumo = ws.getCell("A3");
      const partes = Object.keys(ORDEM_STATUS).map((s) => {
        const info = STATUS_INFO[s];
        return `${info.label}: ${contagemStatus[s] ?? 0}`;
      });
      resumo.value = `Resumo — ${partes.join("  |  ")} | Emergenciais (ZNTE, 30 dias): ${emergenciais30dias}`;
      resumo.font = { name: "Calibri", size: 10, bold: true, color: { argb: "0B3A73" } };
      resumo.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(3).height = 20;

      const cabecalhoLinha = (linha: number) => {
        CABECALHO_COLUNAS.forEach((col, i) => {
          const cell = ws.getCell(linha, i + 1);
          cell.value = col;
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: BRANCO } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        });
      };

      const corStatus = (status: string): string => {
        if (status === "critico_so_emergencial") return PRETO;
        if (status === "parado") return VERMELHO;
        if (status === "atrasado") return AMARELO;
        if (status === "sem_dados") return CINZA_SEM_DADOS;
        return VERDE;
      };

      const escreverLinha = (linha: LinhaAnalitico, r: number) => {
        CABECALHO_COLUNAS.forEach((col, i) => {
          const cell = ws.getCell(r, i + 1);
          cell.value = valorCelula(linha, col);
          cell.font = { name: "Calibri", size: 10 };
          cell.alignment = { vertical: "middle", wrapText: true };
          if (col === "Status") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: corStatus(linha.status_plano) },
            };
            cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "1F2937" } };
          }
        });
      };

      let r = 5;

      if (criticos.length) {
        ws.mergeCells(r, 1, r, numColunas);
        const sec = ws.getCell(r, 1);
        sec.value = `GRUPO CRÍTICO — SOMENTE EMERGENCIAL (${criticos.length})`;
        sec.font = { name: "Calibri", size: 11, bold: true, color: { argb: BRANCO } };
        sec.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRETO } };
        r++;
        cabecalhoLinha(r);
        r++;
        for (const l of criticos) {
          escreverLinha(l, r);
          r++;
        }
        r++;
      }

      ws.mergeCells(r, 1, r, numColunas);
      const sec2 = ws.getCell(r, 1);
      sec2.value = `TODAS AS ELEVATÓRIAS (${linhasFiltradas.length})`;
      sec2.font = { name: "Calibri", size: 11, bold: true, color: { argb: AZUL } };
      sec2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA } };
      r++;
      cabecalhoLinha(r);
      r++;
      for (const l of linhasFiltradas) {
        escreverLinha(l, r);
        r++;
      }

      ws.columns.forEach((col) => {
        if (col) col.width = 20;
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analitico-manutencao-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Analítico exportado em Excel!");
    } catch (err) {
      toast.error(
        "Erro ao exportar Excel: " + (err instanceof Error ? err.message : "desconhecido"),
      );
    } finally {
      setExportando(false);
    }
  };

  const exportarPdf = () => {
    window.print();
  };

  if (loading && !dados.length) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* ==== ÁREA INTERATIVA (não sai no print) ==== */}
      <div className="print:hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-[#0b3a73] dark:text-white sm:text-2xl">
              <ShieldAlert className="h-5 w-5" /> Analítico de Manutenção
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Preventiva atrasada/parada e elevatórias atendidas só por corretiva/emergencial.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={janelaMeses}
              onChange={(e) => setJanelaMeses(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {JANELAS.map((m) => (
                <option key={m} value={m}>
                  Janela: {m} meses
                </option>
              ))}
            </select>
            <button
              onClick={exportarExcel}
              disabled={exportando}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-[#1f7ad6] bg-white dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-[#0b3a73] dark:text-white hover:bg-[#eaf3fb] disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </button>
            <button
              onClick={exportarPdf}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Printer className="h-4 w-4" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Object.keys(ORDEM_STATUS).map((s) => {
            const info = STATUS_INFO[s];
            const ativo = statusSelecionados.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${info.card} ${
                  ativo ? "ring-2 ring-offset-1 ring-slate-500" : ""
                }`}
                title="Clique para filtrar a tabela por este status"
              >
                <div className="text-xs font-semibold uppercase tracking-wide">{info.label}</div>
                <div className="mt-1 text-3xl font-bold">{contagemStatus[s] ?? 0}</div>
                {s === "critico_so_emergencial" && (
                  <div className="mt-1 text-[11px] opacity-80">maior prioridade de cobrança</div>
                )}
                {s === "sem_dados" && (
                  <div className="mt-1 text-[11px] opacity-80">
                    sem O.S. registrada no período — verificar importação
                  </div>
                )}
              </button>
            );
          })}
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Emergenciais (30 dias)
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-700 dark:text-white">
              {emergenciais30dias}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              O.S. ZNTE nos últimos 30 dias
            </div>
          </div>
        </div>

        {/* Filtros extras */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Switch checked={ocultarSemDados} onCheckedChange={setOcultarSemDados} />
            Ocultar "Sem dados"
          </label>
          <MultiSelectMunicipio
            opcoes={municipiosDisponiveis}
            valor={municipiosSelecionados}
            onChange={setMunicipiosSelecionados}
          />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              placeholder="Buscar elevatória..."
              className="w-52 pl-8"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              step={0.1}
              value={razaoMin}
              onChange={(e) => setRazaoMin(e.target.value)}
              placeholder="Razão mín"
              className="w-24"
            />
            <span className="text-xs text-slate-400">a</span>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={razaoMax}
              onChange={(e) => setRazaoMax(e.target.value)}
              placeholder="Razão máx"
              className="w-24"
            />
          </div>
          <label
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
            title="Elevatórias com razão Corr/Prev acima de 0,1 (menos de 10 preventivas por corretiva)"
          >
            <input
              type="checkbox"
              checked={abaixoMeta}
              onChange={(e) => setAbaixoMeta(e.target.checked)}
              className="h-4 w-4 accent-[#1f7ad6]"
            />
            Abaixo da meta (10:1)
          </label>
        </div>

        {/* Razão Preventiva/Corretiva (meta 10:1) */}
        <div className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0b3a73] dark:text-white">
            Razão Preventiva/Corretiva
            <span className="font-normal text-slate-400 dark:text-slate-500">
              meta de referência: 10 preventivas para cada corretiva (10:1)
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardRazao
              titulo="Mensal (mês atual)"
              sub="Preventivas ÷ corretivas no mês corrente"
              d={cardMensal}
            />
            <CardRazao
              titulo={`Do período (${janelaMeses} meses)`}
              sub="Soma das preventivas ÷ corretivas na janela selecionada"
              d={cardPeriodo}
            />
            <CardRazao
              titulo="Anual (12 meses)"
              sub="Soma das preventivas ÷ corretivas no último ano"
              d={cardAnual}
            />
          </div>
        </div>

        {/* Filtro de status */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Filtrar status:
          </span>
          {Object.keys(ORDEM_STATUS).map((s) => {
            const info = STATUS_INFO[s];
            const ativo = statusSelecionados.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${info.chip} ${
                  ativo ? "" : "opacity-40"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {info.label}
              </button>
            );
          })}
          {statusSelecionados.length > 0 && (
            <button
              onClick={() => setStatusSelecionados([])}
              className="text-xs font-semibold text-[#1f7ad6] hover:underline"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {/* Gráfico de tendência */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-2 text-sm font-bold text-[#0b3a73] dark:text-white">
            Tendência mensal — Preventiva válida x Corretiva (últimos 24 meses)
          </h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={tendenciaComRazao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickFormatter={formatMesTick} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  yAxisId="ratio"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  width={40}
                  domain={[0, (dataMax: number) => Math.max(META_RAZAO, dataMax)]}
                />
                <Tooltip content={<TooltipTendencia />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="preventiva"
                  name="Preventiva válida"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="corretiva"
                  name="Corretiva"
                  fill="#ef4444"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="ratio"
                  type="monotone"
                  dataKey="razao"
                  name="Razão Prev/Corr"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <ReferenceLine
                  yAxisId="ratio"
                  y={META_RAZAO}
                  stroke="#d97706"
                  strokeDasharray="6 4"
                  label={{
                    value: "Meta 10:1",
                    position: "insideTopRight",
                    fill: "#d97706",
                    fontSize: 10,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela ranqueada */}
        <div className="overflow-x-auto overflow-y-clip rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {CABECALHO_COLUNAS.map((col) => (
                  <CabecalhoCol
                    key={col}
                    col={col}
                    ordenacao={ordenacao}
                    onOrdenar={toggleOrdenacao}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.map((l) => {
                const info = STATUS_INFO[l.status_plano];
                return (
                  <tr
                    key={l.elevatoria_id}
                    className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-3 py-2 font-semibold text-[#0b3a73] dark:text-white">
                      <Link
                        to="/elevatorias/$id"
                        params={{ id: String(l.elevatoria_id) }}
                        className="hover:text-[#1f7ad6] hover:underline"
                        title="Abrir ficha da elevatória"
                      >
                        {l.nome || l.planta || `#${l.elevatoria_id}`}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {l.municipio || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {formatDate(l.ultima_preventiva_valida)}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {l.dias_sem_preventiva_valida != null ? (
                        <span
                          className={
                            l.dias_sem_preventiva_valida >= 45
                              ? "font-bold text-red-600 dark:text-red-400"
                              : ""
                          }
                        >
                          {l.dias_sem_preventiva_valida}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {l.qtd_preventiva_valida_janela}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {l.qtd_corretiva_janela}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {l.qtd_ztpc_janela}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {l.razao_corretiva_preventiva != null
                        ? l.razao_corretiva_preventiva.toLocaleString("pt-BR")
                        : "sem base"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`border ${info?.chip ?? ""}`}>
                        {info?.label ?? l.status_plano}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {l.dias_sem_preventiva_valida == null ? (
                        <CelulaJustificativa linha={l} onSalvar={salvarJustificativa} />
                      ) : (
                        l.justificativa_sem_preventiva || "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {linhasFiltradas.length === 0 && (
                <tr>
                  <td
                    colSpan={CABECALHO_COLUNAS.length}
                    className="px-3 py-8 text-center text-sm text-slate-400"
                  >
                    Nenhuma elevatória encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==== ÁREA DE IMPRESSÃO (relatório PDF) ==== */}
      <div className="hidden print:block">
        <div className="mb-4 border-b-4 border-[#002d74] pb-3">
          <p className="text-xl font-bold text-[#002d74]">Águas do Rio · EMEC Baixada 2</p>
          <p className="text-sm font-semibold">ANALÍTICO DE MANUTENÇÃO — PREVENTIVA x CORRETIVA</p>
          <p className="text-xs text-slate-500">
            Gerado em {new Date().toLocaleString("pt-BR")} · Janela de análise: {janelaMeses} meses
          </p>
        </div>

        <div className="mb-4">
          <h3 className="mb-2 text-sm font-bold text-[#0b3a73]">Resumo</h3>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {Object.keys(ORDEM_STATUS).map((s) => (
              <div key={s} className="rounded-md border border-slate-300 p-2">
                <span className="font-semibold">{STATUS_INFO[s].label}:</span>{" "}
                {contagemStatus[s] ?? 0}
              </div>
            ))}
            <div className="rounded-md border border-slate-300 p-2">
              <span className="font-semibold">Emergenciais (ZNTE, 30 dias):</span>{" "}
              {emergenciais30dias}
            </div>
          </div>
        </div>

        {criticos.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 rounded bg-slate-900 px-2 py-1 text-sm font-bold text-white">
              GRUPO CRÍTICO — SOMENTE EMERGENCIAL ({criticos.length})
            </h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {CABECALHO_COLUNAS.map((col) => (
                    <th key={col} className="border border-slate-300 px-2 py-1">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criticos.map((l) => (
                  <tr key={l.elevatoria_id}>
                    {CABECALHO_COLUNAS.map((col) => (
                      <td key={col} className="border border-slate-300 px-2 py-1">
                        {valorCelula(l, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mb-2 rounded bg-slate-200 px-2 py-1 text-sm font-bold text-[#002d74]">
          TODAS AS ELEVATÓRIAS ({linhasFiltradas.length})
        </h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              {CABECALHO_COLUNAS.map((col) => (
                <th key={col} className="border border-slate-300 px-2 py-1">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.map((l) => (
              <tr key={l.elevatoria_id}>
                {CABECALHO_COLUNAS.map((col) => (
                  <td key={col} className="border border-slate-300 px-2 py-1">
                    {valorCelula(l, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}

export default AnaliticoManutencao;
