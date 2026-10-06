import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Clock,
  Flame,
  GitMerge,
  Hammer,
  ListChecks,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Target,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  equipeChaveFinal,
  equipeIndiceCor,
  equipeRotuloFinal,
  integranteChaveFinal,
  integranteRotuloFinal,
} from "@/lib/equipe-utils";
import { useEquipeAliases } from "@/hooks/use-equipe-aliases";
import { useAuth } from "@/lib/auth";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import {
  UnificarEquipesDialog,
  type EquipeGerenciavel,
} from "@/components/unificar-equipes-dialog";
import {
  CONFIG_PADRAO,
  adicionarDias,
  adicionarMeses,
  ehCorretiva,
  ehMelhoria,
  ehPreventiva,
  limiteCorretivasPeriodo,
  metaDiariaProporcional,
  metaIndividualPeriodo,
  metaProporcional,
  normalizarTipo,
  temMetaConfigurada,
  useProdutividadeConfig,
  type ProdutividadeConfig,
} from "@/lib/produtividade-config";

// ─── Tipos ────────────────────────────────────────────────────

export type FieldDia = {
  id: number;
  data: string;
  criado_em: string;
  observacao_geral: string;
};

export type FieldEquipe = {
  id: number;
  dia_id: number;
  nome_equipe: string;
  tecnicos: number[];
};

export type FieldAtividade = {
  id: number;
  dia_id: number;
  id_recurso: number;
  id_atividade: number;
  ordem_manutencao: number;
  status: string;
  tipo_atividade: string;
  prioridade: string;
  area_trabalho: string;
  texto_breve: string;
  centro_trabalho: string;
  criticidade: string;
  parada: boolean;
  inicio: string | null;
  fim: string | null;
  duracao_min: number | null;
  motivo_paralisacao: string;
  planta: string;
  cidade: string;
};

export type Periodo = {
  type: "day" | "7" | "30" | "mes" | "custom";
  date?: string;
  mes?: string;
  inicio?: string;
  fim?: string;
};

/** O.S. agrupada por OM/ID com status, HH, categoria e vínculos. */
export type OsAgrupada = {
  key: string;
  om: number;
  concluida: boolean;
  suspensa: boolean;
  cancelada: boolean;
  hh: number;
  corretiva: boolean;
  preventiva: boolean;
  melhoria: boolean;
  categoria: string;
  datas: string[];
  diaIds: number[];
  texto: string;
  planta: string;
  area: string;
  equipes: string[];
  tecnicos: number[];
  atividades: FieldAtividade[];
};

type Metricas = {
  osExec: number;
  osSusp: number;
  osCanc: number;
  osTotal: number;
  hhExec: number;
  hhCorretiva: number;
  hhMelhoria: number;
  corretivas: number;
};

type ComparacaoDef = { id: string; rotulo: string; curto: string };

// ─── Constantes ───────────────────────────────────────────────

const ATIVIDADES_ADMINISTRATIVAS = [
  "DDS",
  "ALMOÇO",
  "ALMOCO",
  "RETORNO PARA BASE",
  "MONTAR EQUIPE",
  "SEPARAR MATERIAL / FERRAMENTA",
  "SEPARAR MATERIAL / FERRAMENTAS",
  "FEEDBACK",
  "PROBLEMAS COM VEÍCULO",
  "PROBLEMAS COM VEICULO",
  "REUNIÃO",
  "REUNIÕES",
  "REUNIAO",
  "TREINAMENTO",
  "ABASTECIMENTO",
  "ABASTECIMENTO DE VEÍCULO",
  "ABASTECIMENTO DE COMBUSTÍVEL",
  "ABASTECIMENTO DE VEICULO",
  "REABASTECIMENTO",
];

const EQUIPE_COLORS = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", hex: "#3b82f6" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", hex: "#10b981" },
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", hex: "#8b5cf6" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", hex: "#f59e0b" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", hex: "#f43f5e" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", hex: "#06b6d4" },
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", hex: "#f97316" },
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", hex: "#14b8a6" },
];

const CORES_CATEGORIA: Record<string, string> = {
  Corretiva: "#ef4444",
  Preventiva: "#3b82f6",
  "Engenharia de Manutenção": "#f59e0b",
  Preditiva: "#8b5cf6",
  Serviços: "#22c55e",
  Outros: "#94a3b8",
};

const CATEGORIAS = [
  "Corretiva",
  "Preventiva",
  "Engenharia de Manutenção",
  "Preditiva",
  "Serviços",
  "Outros",
];

const MESES_BR = [
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

const COMPARACOES: ComparacaoDef[] = [
  { id: "ontem", rotulo: "vs. ontem", curto: "ontem" },
  { id: "mes", rotulo: "vs. mesmo dia mês anterior", curto: "mês anterior" },
  { id: "media7", rotulo: "vs. média 7 dias", curto: "média 7 dias" },
  { id: "media30", rotulo: "vs. média 30 dias", curto: "média 30 dias" },
  { id: "meta", rotulo: "da meta", curto: "meta" },
  { id: "periodo", rotulo: "no período", curto: "no período" },
];

const LOOKBACK_DIAS = 75;

// ─── Helpers básicos ──────────────────────────────────────────

function getEquipeColor(chave: string) {
  return EQUIPE_COLORS[equipeIndiceCor(chave, EQUIPE_COLORS.length)];
}

function normalizeStatus(s: string): string {
  const lower = (s || "").toLowerCase().trim();
  if (lower === "concluído" || lower === "concluido") return "concluido";
  if (lower === "suspenso" || lower === "pendente") return "suspenso";
  if (lower === "cancelado") return "cancelado";
  return lower;
}

function isAtividadeAdministrativa(tipo: string | null | undefined): boolean {
  if (!tipo) return false;
  const norm = tipo.toUpperCase().trim();
  if (ATIVIDADES_ADMINISTRATIVAS.includes(norm)) return true;
  // Notas de abastecimento não são ordem de serviço de execução.
  if (norm.startsWith("ABASTECIMENTO")) return true;
  return false;
}

function chaveOs(a: FieldAtividade): string {
  return a.ordem_manutencao ? `om:${a.ordem_manutencao}` : `at:${a.id_atividade}`;
}

function formatDataBR(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatMesBR(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES_BR[m - 1] || m}/${y}`;
}

function formatMinutos(mins: number): string {
  if (!mins) return "00:00";
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatNumero(valor: number, casas = 1): string {
  if (!Number.isFinite(valor)) return "—";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}

function rangeDatas(inicio: string, fim: string): string[] {
  const saida: string[] = [];
  if (!inicio || !fim || inicio > fim) return saida;
  let atual = inicio;
  let guarda = 0;
  while (atual <= fim && guarda < 800) {
    saida.push(atual);
    atual = adicionarDias(atual, 1);
    guarda++;
  }
  return saida;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function datasDoPeriodo(periodo: Periodo): string[] {
  const hoje = hojeISO();
  if (periodo.type === "day") return periodo.date ? [periodo.date] : [];
  if (periodo.type === "7") return rangeDatas(adicionarDias(hoje, -6), hoje);
  if (periodo.type === "30") return rangeDatas(adicionarDias(hoje, -29), hoje);
  if (periodo.type === "custom") return rangeDatas(periodo.inicio || "", periodo.fim || "");
  const [a, m] = periodo.mes
    ? periodo.mes.split("-").map(Number)
    : [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))];
  return rangeDatas(
    `${a}-${String(m).padStart(2, "0")}-01`,
    `${a}-${String(m).padStart(2, "0")}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`,
  );
}

/** Datas de referência da comparação ativa (janela anterior ao período). */
function datasReferencia(id: string, datasPeriodo: string[]): string[] {
  if (datasPeriodo.length === 0) return [];
  const inicio = datasPeriodo[0];
  switch (id) {
    case "ontem":
      return [adicionarDias(inicio, -1)];
    case "mes":
      return datasPeriodo.map((d) => adicionarMeses(d, -1));
    case "media7":
      return Array.from({ length: 7 }, (_, i) => adicionarDias(inicio, i - 7));
    case "media30":
      return Array.from({ length: 30 }, (_, i) => adicionarDias(inicio, i - 30));
    case "periodo":
      return datasPeriodo;
    default:
      return [];
  }
}

function categoriaAtividade(a: FieldAtividade): string {
  const norm = normalizarTipo(a.tipo_atividade);
  if (ehCorretiva(norm)) return "Corretiva";
  if (ehPreventiva(norm)) return "Preventiva";
  if (ehMelhoria(norm)) return "Engenharia de Manutenção";
  if (norm === "MANUTENÇÃO PREDITIVA") return "Preditiva";
  if (norm === "SERVIÇOS") return "Serviços";
  return "Outros";
}

function corCategoria(categoria: string): string {
  return CORES_CATEGORIA[categoria] || CORES_CATEGORIA.Outros;
}

function corProgresso(pct: number): string {
  if (pct >= 100) return "#22c55e";
  if (pct >= 70) return "#f59e0b";
  return "#ef4444";
}

/** Cor do delta da comparação: verde = melhor, vermelho = pior. */
function corDelta(delta: number | null, invertido = false): string {
  if (delta === null || Math.round(delta) === 0) return "text-slate-400";
  const melhor = invertido ? delta < 0 : delta > 0;
  return melhor ? "text-emerald-600" : "text-red-500";
}

// ─── Agrupamento de O.S. ──────────────────────────────────────

function agruparAtividades(
  atividades: FieldAtividade[],
  diaPorId: Map<number, FieldDia>,
  equipes: FieldEquipe[],
  aliasesEquipes: Parameters<typeof equipeChaveFinal>[1],
  aliasesIntegrantes: Parameters<typeof equipeChaveFinal>[2],
): OsAgrupada[] {
  const mapa = new Map<string, OsAgrupada>();

  const equipesPorDia = new Map<number, Array<{ chave: string; tecnicos: number[] }>>();
  for (const eq of equipes) {
    const lista = equipesPorDia.get(eq.dia_id) || [];
    lista.push({
      chave: equipeChaveFinal(eq.nome_equipe, aliasesEquipes, aliasesIntegrantes),
      tecnicos: eq.tecnicos,
    });
    equipesPorDia.set(eq.dia_id, lista);
  }

  for (const a of atividades) {
    if (isAtividadeAdministrativa(a.tipo_atividade)) continue;
    const key = chaveOs(a);
    let os = mapa.get(key);
    if (!os) {
      os = {
        key,
        om: a.ordem_manutencao || 0,
        concluida: false,
        suspensa: false,
        cancelada: false,
        hh: 0,
        corretiva: false,
        preventiva: false,
        melhoria: false,
        categoria: "",
        datas: [],
        diaIds: [],
        texto: "",
        planta: "",
        area: "",
        equipes: [],
        tecnicos: [],
        atividades: [],
      };
      mapa.set(key, os);
    }
    os.atividades.push(a);

    const dia = diaPorId.get(a.dia_id);
    if (dia && !os.datas.includes(dia.data)) {
      os.datas.push(dia.data);
      os.diaIds.push(a.dia_id);
    }
    if (!os.texto && a.texto_breve) os.texto = a.texto_breve;
    if (!os.planta && a.planta) os.planta = a.planta;
    if (!os.area && a.area_trabalho) os.area = a.area_trabalho;

    if (!os.tecnicos.includes(a.id_recurso)) os.tecnicos.push(a.id_recurso);

    for (const eq of equipesPorDia.get(a.dia_id) || []) {
      if (eq.tecnicos.includes(a.id_recurso) && !os.equipes.includes(eq.chave)) {
        os.equipes.push(eq.chave);
      }
    }

    const status = normalizeStatus(a.status);
    if (status === "concluido") os.concluida = true;

    const cat = categoriaAtividade(a);
    if (cat === "Corretiva") os.corretiva = true;
    else if (cat === "Preventiva") os.preventiva = true;
    else if (cat === "Engenharia de Manutenção") os.melhoria = true;
    if (!os.categoria || os.categoria === "Outros") os.categoria = cat;
    else if (cat === "Corretiva") os.categoria = "Corretiva";
    else if (cat === "Preventiva") os.categoria = "Preventiva";
    else if (cat === "Engenharia de Manutenção") os.categoria = "Engenharia de Manutenção";
  }

  const lista = [...mapa.values()];
  for (const os of lista) {
    const statuses = os.atividades.map((a) => normalizeStatus(a.status));
    if (!os.concluida) {
      os.suspensa = statuses.length > 0 && statuses.every((s) => s === "suspenso");
      os.cancelada = statuses.length > 0 && statuses.every((s) => s === "cancelado");
    }
    if (os.concluida) {
      os.hh = os.atividades.reduce((acc, a) => acc + (Number(a.duracao_min) || 0), 0);
    }
    if (!os.categoria) os.categoria = "Outros";
    os.datas.sort();
  }
  // Só O.S. vinculadas a pelo menos uma equipe (ordens sem equipe não entram).
  return lista.filter((os) => os.equipes.length > 0);
}

function filtrarPorDatas(osList: OsAgrupada[], datas: string[] | Set<string>): OsAgrupada[] {
  const alvo = datas instanceof Set ? datas : new Set(datas);
  if (alvo.size === 0) return [];
  return osList.filter((os) => os.datas.some((d) => alvo.has(d)));
}

function calcularMetricas(osList: OsAgrupada[]): Metricas {
  const m: Metricas = {
    osExec: 0,
    osSusp: 0,
    osCanc: 0,
    osTotal: 0,
    hhExec: 0,
    hhCorretiva: 0,
    hhMelhoria: 0,
    corretivas: 0,
  };
  for (const os of osList) {
    if (os.concluida) m.osExec++;
    else if (os.suspensa) m.osSusp++;
    else if (os.cancelada) m.osCanc++;
    m.osTotal++;
    if (os.concluida) {
      m.hhExec += os.hh;
      if (os.corretiva) m.hhCorretiva += os.hh;
      if (os.melhoria) m.hhMelhoria += os.hh;
    }
    if (os.corretiva) m.corretivas++;
  }
  return m;
}

// ─── Linhas de ranking ────────────────────────────────────────

export type LinhaEquipe = {
  chave: string;
  nome: string;
  chavesOrigem: string[];
  integrantes: Array<{ chave: string; rotulo: string; total: number }>;
  exec: number;
  susp: number;
  canc: number;
  total: number;
  corretivas: number;
  tecnicos: number[];
  /** % de contribuição da equipe para a meta mensal global do período (null sem meta). */
  contribPct: number | null;
  /** O.S. da meta mensal global usada como base da contribuição. */
  contribTotal: number;
};

export type LinhaTecnico = {
  tecId: number;
  nome: string;
  participadas: number;
  /** O.S. com atividade própria do colaborador no período. */
  proprias: number;
  diasTrabalhados: number;
  /** HH das equipes em que o colaborador participou no período, em minutos. */
  hhMin: number;
  meta: number;
  pct: number | null;
  cor: string;
};

type Alerta = { nivel: "ok" | "atencao" | "critico"; texto: string; detalhe: string };

// ─── Dashboard ────────────────────────────────────────────────

export function DashboardComparacao({ diaInicial }: { diaInicial?: string }) {
  const { user, profile } = useAuth();
  const aliases = useEquipeAliases();
  const { data: config } = useProdutividadeConfig();
  const cfg: ProdutividadeConfig = config ?? CONFIG_PADRAO;

  const [dias, setDias] = useState<FieldDia[]>([]);
  const [atividades, setAtividades] = useState<FieldAtividade[]>([]);
  const [equipes, setEquipes] = useState<FieldEquipe[]>([]);
  const [recursosList, setRecursosList] = useState<Array<{ id_recurso: number; nome: string }>>([]);
  const [todasDatas, setTodasDatas] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>(() =>
    diaInicial ? { type: "day", date: diaInicial } : { type: "7" },
  );
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [podeUnificarEquipes, setPodeUnificarEquipes] = useState(false);
  const [unificarAberto, setUnificarAberto] = useState(false);
  const [equipeDetalhe, setEquipeDetalhe] = useState<LinhaEquipe | null>(null);
  const [cmpIdx, setCmpIdx] = useState(0);
  const [rotacaoPausada, setRotacaoPausada] = useState(false);
  const [drill, setDrill] = useState<{
    titulo: string;
    subtitulo: string;
    filtro: (os: OsAgrupada) => boolean;
  } | null>(null);
  const [osDetalhe, setOsDetalhe] = useState<OsAgrupada | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!user || !profile?.cargo_id) {
      setPodeUnificarEquipes(false);
      return () => {
        ativo = false;
      };
    }
    getPermissoesCargo(profile.cargo_id)
      .then((permissoes) => {
        if (ativo) {
          setPodeUnificarEquipes(temPermissao(permissoes, "produtividade", "unificar_equipes"));
        }
      })
      .catch(() => {
        if (ativo) setPodeUnificarEquipes(false);
      });
    return () => {
      ativo = false;
    };
  }, [profile?.cargo_id, user]);

  useEffect(() => {
    if (diaInicial) setPeriodo({ type: "day", date: diaInicial });
  }, [diaInicial]);

  useEffect(() => {
    let ativo = true;
    const load = async () => {
      setLoading(true);
      const datas = datasDoPeriodo(periodo);
      const hoje = hojeISO();
      const inicioJanela = adicionarDias(datas.length ? datas[0] : hoje, -LOOKBACK_DIAS);
      const fimJanela = datas.length ? datas[datas.length - 1] : hoje;

      const datesRes = await supabase
        .from("field_dias")
        .select("data")
        .order("data", { ascending: false })
        .limit(1000);
      if (!ativo) return;
      setTodasDatas([...new Set((datesRes.data || []).map((d: { data: string }) => d.data))]);

      const recRes = await supabase.from("field_recursos").select("*");
      if (!ativo) return;
      if (recRes.error) {
        console.warn(
          "Falha ao carregar field_recursos (nomes de técnicos virarão IDs):",
          recRes.error.message,
        );
      } else {
        setRecursosList((recRes.data || []) as Array<{ id_recurso: number; nome: string }>);
      }

      const diasRes = await supabase
        .from("field_dias")
        .select("*")
        .gte("data", inicioJanela)
        .lte("data", fimJanela)
        .order("data", { ascending: false });
      if (!ativo) return;
      const diasData = (diasRes.data || []) as FieldDia[];
      setDias(diasData);

      if (diasData.length > 0) {
        const diaIds = diasData.map((d) => d.id);
        const buscarTudo = async <T,>(tabela: string, pagina = 1000): Promise<T[]> => {
          const linhas: T[] = [];
          let inicio = 0;
          for (;;) {
            const { data, error } = await supabase
              .from(tabela)
              .select("*")
              .in("dia_id", diaIds)
              .range(inicio, inicio + pagina - 1);
            if (error) break;
            if (!data || data.length === 0) break;
            linhas.push(...(data as T[]));
            if (data.length < pagina) break;
            inicio += pagina;
          }
          return linhas;
        };
        const [ativs, eqs] = await Promise.all([
          buscarTudo<FieldAtividade>("field_atividades"),
          buscarTudo<FieldEquipe>("field_equipes"),
        ]);
        if (!ativo) return;
        setAtividades(ativs);
        setEquipes(eqs);
      } else {
        setAtividades([]);
        setEquipes([]);
      }
      if (ativo) setLoading(false);
    };
    void load();
    return () => {
      ativo = false;
    };
  }, [periodo, refreshKey]);

  // Rotação automática da comparação secundária dos KPIs.
  useEffect(() => {
    if (rotacaoPausada || drill || equipeDetalhe || osDetalhe) return;
    const segundos =
      cfg.intervaloKpisSeg > 0 ? cfg.intervaloKpisSeg : CONFIG_PADRAO.intervaloKpisSeg;
    const id = window.setInterval(() => {
      setCmpIdx((i) => (i + 1) % COMPARACOES.length);
    }, segundos * 1000);
    return () => window.clearInterval(id);
  }, [rotacaoPausada, cfg.intervaloKpisSeg, drill, equipeDetalhe, osDetalhe]);

  const cmp = COMPARACOES[cmpIdx] || COMPARACOES[0];

  const mesesDisponiveis = useMemo(() => {
    const vistos = new Set<string>();
    for (const d of todasDatas) vistos.add(d.slice(0, 7));
    return [...vistos].sort().reverse();
  }, [todasDatas]);

  const datasPeriodo = useMemo(() => datasDoPeriodo(periodo), [periodo]);
  const datasPeriodoSet = useMemo(() => new Set(datasPeriodo), [datasPeriodo]);
  const diaPorId = useMemo(() => new Map(dias.map((d) => [d.id, d])), [dias]);

  const osAgrupadas = useMemo(
    () => agruparAtividades(atividades, diaPorId, equipes, aliases.equipes, aliases.integrantes),
    [atividades, diaPorId, equipes, aliases.equipes, aliases.integrantes],
  );

  const osPeriodo = useMemo(() => {
    // Agrupa apenas atividades dos dias do período: O.S. executadas fora dos
    // dias importados não entram na apuração do período.
    const atividadesPeriodo = atividades.filter((a) => {
      const d = diaPorId.get(a.dia_id);
      return !!d && datasPeriodoSet.has(d.data);
    });
    return agruparAtividades(
      atividadesPeriodo,
      diaPorId,
      equipes,
      aliases.equipes,
      aliases.integrantes,
    );
  }, [atividades, diaPorId, datasPeriodoSet, equipes, aliases.equipes, aliases.integrantes]);

  // Filtros adicionais (equipe, técnico, tipo de OS e local) aplicados sobre
  // as O.S. do período. Todos os cálculos abaixo passam a usar esta lista.
  const osFiltrado = useMemo(() => {
    let lista = osPeriodo;
    if (filtroEquipe) lista = lista.filter((os) => os.equipes.includes(filtroEquipe));
    if (filtroTecnico) {
      const id = Number(filtroTecnico);
      lista = lista.filter((os) => os.tecnicos.includes(id));
    }
    if (filtroTipo) lista = lista.filter((os) => os.categoria === filtroTipo);
    if (filtroLocal) lista = lista.filter((os) => os.planta === filtroLocal);
    return lista;
  }, [osPeriodo, filtroEquipe, filtroTecnico, filtroTipo, filtroLocal]);

  const metricasPeriodo = useMemo(() => calcularMetricas(osFiltrado), [osFiltrado]);

  const diasComDadosPeriodo = useMemo(
    () => dias.filter((d) => datasPeriodoSet.has(d.data)).length,
    [dias, datasPeriodoSet],
  );
  const diasPeriodoEfetivos = diasComDadosPeriodo || datasPeriodo.length || 1;

  const recursosMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of recursosList) m.set(Number(r.id_recurso), r.nome);
    return m;
  }, [recursosList]);

  // ── Metas / limites do período ─────────────────────────────
  const metaTotal = useMemo(() => metaProporcional(cfg, datasPeriodo), [cfg, datasPeriodo]);
  const metaDiaria = useMemo(() => metaDiariaProporcional(cfg, datasPeriodo), [cfg, datasPeriodo]);
  const temMeta = metaTotal > 0;
  const pctMeta = temMeta ? (metricasPeriodo.osExec / metaTotal) * 100 : null;
  const limiteCorretivas = useMemo(
    () => limiteCorretivasPeriodo(cfg, datasPeriodo),
    [cfg, datasPeriodo],
  );

  // ── Janela de referência da comparação ativa ───────────────
  const datasRef = useMemo(() => datasReferencia(cmp.id, datasPeriodo), [cmp.id, datasPeriodo]);
  const osRef = useMemo(() => filtrarPorDatas(osAgrupadas, datasRef), [osAgrupadas, datasRef]);
  const metricasRef = useMemo(() => calcularMetricas(osRef), [osRef]);
  const diasComDadosRef = useMemo(() => {
    const alvo = new Set(datasRef);
    return dias.filter((d) => alvo.has(d.data)).length;
  }, [dias, datasRef]);
  const diasRefEfetivos = diasComDadosRef || datasRef.length || 1;

  type Modo = "acumulado" | "diario";
  const valorReferencia = (
    seletor: (m: Metricas) => number,
    modo: Modo,
    metaAcum: number,
    metaDia: number,
  ): number => {
    if (cmp.id === "meta") return modo === "acumulado" ? metaAcum : metaDia;
    if (cmp.id === "periodo") {
      const total = seletor(metricasPeriodo);
      return modo === "diario" ? total / diasPeriodoEfetivos : total;
    }
    const media = seletor(metricasRef) / diasRefEfetivos;
    return modo === "diario" ? media : media * diasPeriodoEfetivos;
  };

  type LinhaRef = { texto: string; delta: number | null };
  const linhaReferencia = (
    valor: number,
    ref: number,
    formato: (n: number) => string,
  ): LinhaRef => {
    if (cmp.id === "periodo") return { texto: `no período: ${formato(valor)}`, delta: null };
    if (ref <= 0) {
      return cmp.id === "meta"
        ? { texto: "meta não configurada", delta: null }
        : { texto: `${cmp.curto}: sem dados`, delta: null };
    }
    const delta = ((valor - ref) / ref) * 100;
    return {
      texto: `${cmp.curto}: ${formato(ref)} · ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`,
      delta,
    };
  };

  const rotulosEquipe = useMemo(() => {
    const mapa = new Map<string, { nome: string; variantes: Map<string, number> }>();
    for (const eq of equipes) {
      const chave = equipeChaveFinal(eq.nome_equipe, aliases.equipes, aliases.integrantes);
      let atual = mapa.get(chave);
      if (!atual) {
        atual = { nome: chave, variantes: new Map() };
        mapa.set(chave, atual);
      }
      atual.variantes.set(eq.nome_equipe, (atual.variantes.get(eq.nome_equipe) || 0) + 1);
    }
    for (const [chave, atual] of mapa) {
      atual.nome = equipeRotuloFinal(
        chave,
        [...atual.variantes].map(([texto, qtd]) => ({ texto, qtd })),
        aliases.equipes,
        aliases.integrantes,
      );
    }
    return mapa;
  }, [equipes, aliases.equipes, aliases.integrantes]);

  const nomeDaEquipe = (chave: string) => rotulosEquipe.get(chave)?.nome || chave || "Sem equipe";

  // ── Opções dos filtros da barra superior ───────────────────
  const opcoesEquipe = useMemo(
    () =>
      [...rotulosEquipe.entries()]
        .map(([chave, v]) => ({ chave, nome: v.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [rotulosEquipe],
  );

  const opcoesTecnico = useMemo(
    () =>
      [...recursosList]
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"))
        .map((r) => ({ id: r.id_recurso, nome: r.nome || `Técnico ${r.id_recurso}` })),
    [recursosList],
  );

  const opcoesLocal = useMemo(() => {
    const vistos = new Set<string>();
    for (const os of osPeriodo) if (os.planta) vistos.add(os.planta);
    return [...vistos].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [osPeriodo]);

  // ── Ranking de equipes (com meta individual) ───────────────
  const rankingEquipes = useMemo<LinhaEquipe[]>(() => {
    const info = new Map<
      string,
      {
        variantes: Map<string, number>;
        chavesOrigem: Set<string>;
        integrantes: Map<string, { total: number; rotulos: Map<string, number> }>;
        tecSet: Set<number>;
      }
    >();

    for (const eq of equipes) {
      const dia = diaPorId.get(eq.dia_id);
      if (!dia || !datasPeriodoSet.has(dia.data)) continue;
      const chave = equipeChaveFinal(eq.nome_equipe, aliases.equipes, aliases.integrantes);
      let cur = info.get(chave);
      if (!cur) {
        cur = {
          variantes: new Map(),
          chavesOrigem: new Set(),
          integrantes: new Map(),
          tecSet: new Set(),
        };
        info.set(chave, cur);
      }
      cur.variantes.set(eq.nome_equipe, (cur.variantes.get(eq.nome_equipe) || 0) + 1);
      cur.chavesOrigem.add(equipeChaveFinal(eq.nome_equipe, [], aliases.integrantes));
      for (const t of eq.tecnicos) cur.tecSet.add(t);

      const vistos = new Set<string>();
      for (const nome of eq.nome_equipe
        .split(/[&/+,]/)
        .map((parte) => parte.trim())
        .filter(Boolean)) {
        const chaveIntegrante = integranteChaveFinal(nome, aliases.integrantes);
        if (vistos.has(chaveIntegrante)) continue;
        vistos.add(chaveIntegrante);
        const atual = cur.integrantes.get(chaveIntegrante) || {
          total: 0,
          rotulos: new Map<string, number>(),
        };
        atual.total += 1;
        const rotulo = integranteRotuloFinal(nome, aliases.integrantes);
        atual.rotulos.set(rotulo, (atual.rotulos.get(rotulo) || 0) + 1);
        cur.integrantes.set(chaveIntegrante, atual);
      }
    }

    const contagem = new Map<
      string,
      { exec: number; susp: number; canc: number; total: number; corretivas: number }
    >();
    for (const chave of info.keys()) {
      contagem.set(chave, { exec: 0, susp: 0, canc: 0, total: 0, corretivas: 0 });
    }
    for (const os of osFiltrado) {
      for (const chave of os.equipes) {
        const c = contagem.get(chave);
        if (!c) continue;
        c.total++;
        if (os.concluida) c.exec++;
        else if (os.suspensa) c.susp++;
        else if (os.cancelada) c.canc++;
        if (os.corretiva) c.corretivas++;
      }
    }

    const linhas: LinhaEquipe[] = [];
    for (const [chave, i] of info) {
      const c = contagem.get(chave) || { exec: 0, susp: 0, canc: 0, total: 0, corretivas: 0 };
      if (c.total === 0) continue;
      linhas.push({
        chave,
        nome: rotulosEquipe.get(chave)?.nome || chave || "Sem equipe",
        chavesOrigem: [...i.chavesOrigem],
        integrantes: [...i.integrantes].map(([k, integ]) => ({
          chave: k,
          rotulo: [...integ.rotulos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || k,
          total: integ.total,
        })),
        exec: c.exec,
        susp: c.susp,
        canc: c.canc,
        total: c.total,
        corretivas: c.corretivas,
        tecnicos: [...i.tecSet],
        contribPct: metaTotal > 0 ? (c.exec / metaTotal) * 100 : null,
        contribTotal: metaTotal,
      });
    }
    return linhas.sort((a, b) => b.exec - a.exec);
  }, [
    equipes,
    diaPorId,
    datasPeriodoSet,
    osFiltrado,
    aliases.equipes,
    aliases.integrantes,
    metaTotal,
    rotulosEquipe,
  ]);

  // ── Ranking de técnicos ────────────────────────────────────
  const rankingTecnicos = useMemo<LinhaTecnico[]>(() => {
    // Só técnicos que estão registrados em equipe em algum dia do período.
    const membros = new Set<number>();
    const equipeDias = new Map<number, Map<string, number>>();
    const participadas = new Map<number, number>();
    const hhMin = new Map<number, number>();
    const diasSet = new Map<number, Set<string>>();

    for (const dia of dias) {
      if (!datasPeriodoSet.has(dia.data)) continue;
      const equipesDia = equipes.filter((e) => e.dia_id === dia.id);
      if (equipesDia.length === 0) continue;
      const osDia = osFiltrado.filter((os) => os.concluida && os.datas.includes(dia.data));

      const tecsDia = new Set<number>();
      for (const e of equipesDia) for (const t of e.tecnicos) tecsDia.add(t);

      for (const tec of tecsDia) {
        membros.add(tec);
        // Dias trabalhados = dia em que o colaborador participa de equipe no período.
        const setD = diasSet.get(tec) || new Set<string>();
        setD.add(dia.data);
        diasSet.set(tec, setD);
        const minhasEqs = equipesDia.filter((e) => e.tecnicos.includes(tec));
        const eqSet = new Set<number>();
        for (const e of minhasEqs) for (const t of e.tecnicos) eqSet.add(t);
        const osEq = osDia.filter((os) => os.tecnicos.some((t) => eqSet.has(t)));
        participadas.set(tec, (participadas.get(tec) || 0) + osEq.length);
        // HH da equipe/unidade de equipe na qual o colaborador participou no dia.
        let hhDia = 0;
        for (const os of osEq) {
          for (const a of os.atividades) {
            if (a.dia_id === dia.id && eqSet.has(a.id_recurso)) {
              hhDia += Number(a.duracao_min) || 0;
            }
          }
        }
        if (hhDia > 0) hhMin.set(tec, (hhMin.get(tec) || 0) + hhDia);
        const mapaDia = equipeDias.get(tec) || new Map<string, number>();
        for (const e of minhasEqs) {
          const chave = equipeChaveFinal(e.nome_equipe, aliases.equipes, aliases.integrantes);
          mapaDia.set(chave, (mapaDia.get(chave) || 0) + 1);
        }
        equipeDias.set(tec, mapaDia);
      }
    }

    // O.S. com atividade própria no período (base da média individual).
    const proprias = new Map<number, number>();

    for (const os of osFiltrado) {
      if (!os.concluida) continue;
      for (const tec of os.tecnicos) {
        if (!membros.has(tec)) continue;
        proprias.set(tec, (proprias.get(tec) || 0) + 1);
      }
    }

    const linhas: LinhaTecnico[] = [];
    let totalDiasTrabalhados = 0;
    for (const setD of diasSet.values()) totalDiasTrabalhados += setD.size;

    for (const tec of membros) {
      const pred =
        [...(equipeDias.get(tec)?.entries() || [])].sort((x, y) => y[1] - x[1])[0]?.[0] || "";
      let meta = metaIndividualPeriodo(cfg, tec, datasPeriodo);
      // Fallback: sem meta individual, usa a quota proporcional da meta global
      // do período conforme os dias trabalhados do colaborador.
      if (meta <= 0 && metaTotal > 0 && totalDiasTrabalhados > 0) {
        meta = metaTotal * ((diasSet.get(tec)?.size || 0) / totalDiasTrabalhados);
      }
      linhas.push({
        tecId: tec,
        nome: recursosMap.get(tec) || `Técnico ${tec}`,
        participadas: participadas.get(tec) || 0,
        proprias: proprias.get(tec) || 0,
        diasTrabalhados: diasSet.get(tec)?.size || 0,
        hhMin: hhMin.get(tec) || 0,
        meta,
        pct: meta > 0 ? ((participadas.get(tec) || 0) / meta) * 100 : null,
        cor: getEquipeColor(pred).hex,
      });
    }
    return linhas
      .filter((l) => l.participadas > 0 || l.hhMin > 0)
      .sort((x, y) => y.participadas - x.participadas || y.hhMin - x.hhMin);
  }, [
    dias,
    datasPeriodoSet,
    equipes,
    osFiltrado,
    cfg,
    datasPeriodo,
    metaTotal,
    aliases.equipes,
    aliases.integrantes,
    recursosMap,
  ]);

  // ── Evolução diária ────────────────────────────────────────
  const osPorDia = useMemo(() => {
    return dias
      .filter((d) => datasPeriodoSet.has(d.data))
      .map((d) => {
        const doDia = osFiltrado.filter((os) => os.datas.includes(d.data));
        const porEquipe = new Map<string, number>();
        for (const os of doDia) {
          if (!os.concluida) continue;
          for (const chave of os.equipes) porEquipe.set(chave, (porEquipe.get(chave) || 0) + 1);
        }
        return {
          data: d.data.slice(5),
          dataCompleta: d.data,
          exec: doDia.filter((os) => os.concluida).length,
          corretivas: doDia.filter((os) => os.corretiva).length,
          equipes: [...porEquipe.entries()]
            .map(([chave, exec]) => ({
              chave,
              nome: rotulosEquipe.get(chave)?.nome || chave || "Sem equipe",
              exec,
            }))
            .sort((a, b) => b.exec - a.exec),
        };
      })
      .reverse();
  }, [dias, datasPeriodoSet, osFiltrado, rotulosEquipe]);

  const composicaoPorDia = useMemo(() => {
    return dias
      .filter((d) => datasPeriodoSet.has(d.data))
      .map((d) => {
        const row: Record<string, number | string> = { data: d.data.slice(5) };
        for (const cat of CATEGORIAS) row[cat] = 0;
        const vistos = new Set<string>();
        for (const os of osFiltrado) {
          if (!os.datas.includes(d.data) || vistos.has(os.key)) continue;
          vistos.add(os.key);
          row[os.categoria] = (row[os.categoria] as number) + 1;
        }
        return row;
      })
      .reverse();
  }, [dias, datasPeriodoSet, osFiltrado]);

  // ── Alertas ────────────────────────────────────────────────
  const alertaCorretivas = useMemo<Alerta | null>(() => {
    if (limiteCorretivas <= 0) return null;
    const exec = metricasPeriodo.corretivas;
    const base = `${exec} de ${formatNumero(limiteCorretivas, 2)} corretivas no período`;
    if (exec > limiteCorretivas) {
      return {
        nivel: "critico",
        texto: "Corretivas acima do limite",
        detalhe: `${base} — reduza a volume de correções não planejadas.`,
      };
    }
    if (exec >= limiteCorretivas) {
      return {
        nivel: "atencao",
        texto: "Corretivas no limite",
        detalhe: `${base} — limite mensal atingido, atenção ao restante do período.`,
      };
    }
    return {
      nivel: "ok",
      texto: "Corretivas dentro do limite",
      detalhe: base,
    };
  }, [limiteCorretivas, metricasPeriodo.corretivas]);

  const destaques = useMemo(() => {
    if (rankingEquipes.length === 0) return null;
    const maisProdutiva = rankingEquipes[0];
    const maisCorretivas = [...rankingEquipes].sort((a, b) => b.corretivas - a.corretivas)[0];
    return { maisProdutiva, maisCorretivas };
  }, [rankingEquipes]);

  const equipesGerenciaveis = useMemo<EquipeGerenciavel[]>(
    () =>
      rankingEquipes.map((equipe) => ({
        chave: equipe.chave,
        rotulo: equipe.nome,
        total: equipe.exec,
        chavesOrigem: equipe.chavesOrigem,
        integrantes: equipe.integrantes,
      })),
    [rankingEquipes],
  );

  const mediaPorTecnico = useMemo(() => {
    return rankingTecnicos
      .map((t) => ({
        nome: t.nome,
        total: t.proprias,
        media: t.proprias / diasPeriodoEfetivos,
      }))
      .sort((a, b) => b.media - a.media);
  }, [rankingTecnicos, diasPeriodoEfetivos]);

  const equipeDetalheOs = useMemo(() => {
    if (!equipeDetalhe) return [];
    return osFiltrado
      .filter((os) => os.equipes.includes(equipeDetalhe.chave))
      .sort((a, b) => (b.datas.at(-1) || "").localeCompare(a.datas.at(-1) || "") || a.om - b.om);
  }, [equipeDetalhe, osFiltrado]);

  const drillOs = useMemo(() => {
    if (!drill) return [];
    return osFiltrado
      .filter(drill.filtro)
      .sort((a, b) => (b.datas.at(-1) || "").localeCompare(a.datas.at(-1) || "") || a.om - b.om);
  }, [drill, osFiltrado]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  const periodoTexto =
    periodo.type === "day"
      ? periodo.date
        ? formatDataBR(periodo.date)
        : "—"
      : periodo.type === "mes"
        ? formatMesBR(
            periodo.mes ||
              `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
          )
        : periodo.type === "custom"
          ? periodo.inicio && periodo.fim
            ? `${formatDataBR(periodo.inicio)} – ${formatDataBR(periodo.fim)}`
            : "—"
          : periodo.type === "7"
            ? "últimos 7 dias"
            : "últimos 30 dias";

  const nEquipesPeriodo = rankingEquipes.length || 1;
  const mediaOsDia = diasPeriodoEfetivos > 0 ? metricasPeriodo.osExec / diasPeriodoEfetivos : 0;
  const hhDia = diasPeriodoEfetivos > 0 ? metricasPeriodo.hhExec / diasPeriodoEfetivos : 0;
  const shareHhCorretiva =
    metricasPeriodo.hhExec > 0 ? (metricasPeriodo.hhCorretiva / metricasPeriodo.hhExec) * 100 : 0;
  const shareHhMelhoria =
    metricasPeriodo.hhExec > 0 ? (metricasPeriodo.hhMelhoria / metricasPeriodo.hhExec) * 100 : 0;

  const refOsExec = valorReferencia((m) => m.osExec, "acumulado", metaTotal, metaDiaria);
  const refMediaOs = valorReferencia((m) => m.osExec, "diario", metaTotal, metaDiaria);
  const refHh = valorReferencia((m) => m.hhExec, "acumulado", 0, 0);
  const refCorretivas = valorReferencia(
    (m) => m.corretivas,
    "acumulado",
    limiteCorretivas,
    limiteCorretivas > 0 ? limiteCorretivas / diasPeriodoEfetivos : 0,
  );
  const refHhCorretiva = valorReferencia((m) => m.hhCorretiva, "acumulado", 0, 0);
  const refHhMelhoria = valorReferencia((m) => m.hhMelhoria, "acumulado", 0, 0);
  const refMediaEquipe = refOsExec / nEquipesPeriodo;

  const linhaOsExec = linhaReferencia(metricasPeriodo.osExec, refOsExec, (n) =>
    Math.round(n).toString(),
  );
  const linhaMedia = linhaReferencia(mediaOsDia, refMediaOs, (n) => formatNumero(n, 1));
  const linhaHh = linhaReferencia(metricasPeriodo.hhExec, refHh, formatMinutos);
  const linhaCorretivas = linhaReferencia(metricasPeriodo.corretivas, refCorretivas, (n) =>
    formatNumero(n, 2),
  );
  const linhaHhCorretiva = linhaReferencia(
    metricasPeriodo.hhCorretiva,
    refHhCorretiva,
    formatMinutos,
  );
  const linhaHhMelhoria = linhaReferencia(metricasPeriodo.hhMelhoria, refHhMelhoria, formatMinutos);
  const linhaMediaEquipe = linhaReferencia(
    metricasPeriodo.osExec / nEquipesPeriodo,
    refMediaEquipe,
    (n) => formatNumero(n, 1),
  );

  const abrirDrill = (titulo: string, filtro: (os: OsAgrupada) => boolean) =>
    setDrill({ titulo, subtitulo: `${periodoTexto} · ${datasPeriodo.length} dia(s)`, filtro });

  return (
    <div className="space-y-6">
      {/* ── Barra de filtros ───────────────────────────────── */}
      <Card className="shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Período:
            </span>
            {(
              [
                { key: "day", rotulo: "Hoje" },
                { key: "7", rotulo: "7 dias" },
                { key: "30", rotulo: "30 dias" },
                { key: "mes", rotulo: "Mês" },
                { key: "custom", rotulo: "Personalizado" },
              ] as const
            ).map((p) => (
              <Button
                key={p.key}
                variant={periodo.type === p.key ? "default" : "outline"}
                size="sm"
                className={`h-7 text-[11px] ${
                  periodo.type === p.key ? "bg-[#0b3a73] hover:bg-[#002d74]" : ""
                }`}
                onClick={() => {
                  if (p.key === "day") setPeriodo({ type: "day", date: hojeISO() });
                  else if (p.key === "custom")
                    setPeriodo({
                      type: "custom",
                      inicio:
                        periodo.type === "custom"
                          ? periodo.inicio || ""
                          : adicionarDias(hojeISO(), -6),
                      fim: periodo.type === "custom" ? periodo.fim || "" : hojeISO(),
                    });
                  else setPeriodo({ type: p.key } as Periodo);
                }}
              >
                {p.rotulo}
              </Button>
            ))}
            {periodo.type === "day" && (
              <input
                type="date"
                value={periodo.date || ""}
                onChange={(e) => setPeriodo({ type: "day", date: e.target.value })}
                className="h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
              />
            )}
            {periodo.type === "mes" && (
              <select
                value={periodo.mes || ""}
                onChange={(e) => setPeriodo({ type: "mes", mes: e.target.value })}
                className="min-h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
              >
                <option value="">
                  Mês atual ({new Date().getMonth() + 1}/{new Date().getFullYear()})
                </option>
                {mesesDisponiveis.map((m) => (
                  <option key={m} value={m}>
                    {formatMesBR(m)}
                  </option>
                ))}
              </select>
            )}
            {periodo.type === "custom" && (
              <>
                <span className="text-xs text-slate-500">de</span>
                <input
                  type="date"
                  value={periodo.inicio || ""}
                  onChange={(e) =>
                    setPeriodo({ type: "custom", inicio: e.target.value, fim: periodo.fim })
                  }
                  className="h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
                />
                <span className="text-xs text-slate-500">até</span>
                <input
                  type="date"
                  value={periodo.fim || ""}
                  onChange={(e) =>
                    setPeriodo({ type: "custom", inicio: periodo.inicio, fim: e.target.value })
                  }
                  className="h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroEquipe}
              onChange={(e) => setFiltroEquipe(e.target.value)}
              className="min-h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
            >
              <option value="">Equipe: Todas</option>
              {opcoesEquipe.map((o) => (
                <option key={o.chave} value={o.chave}>
                  {o.nome}
                </option>
              ))}
            </select>
            <select
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="min-h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
            >
              <option value="">Técnico: Todos</option>
              {opcoesTecnico.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.nome}
                </option>
              ))}
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="min-h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
            >
              <option value="">Tipo de OS: Todos</option>
              {CATEGORIAS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filtroLocal}
              onChange={(e) => setFiltroLocal(e.target.value)}
              className="min-h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
            >
              <option value="">Local / Elevatória: Todos</option>
              {opcoesLocal.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <span className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setRefreshKey((k) => k + 1);
              }}
            >
              {loading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Controles: comparação cíclica ──────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Comparação dos KPIs:</span>
        {COMPARACOES.map((c, i) => (
          <Button
            key={c.id}
            variant={i === cmpIdx ? "default" : "outline"}
            size="sm"
            className={`h-7 text-[11px] ${i === cmpIdx ? "bg-[#0b3a73] hover:bg-[#002d74]" : ""}`}
            onClick={() => setCmpIdx(i)}
          >
            {c.rotulo}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-slate-500"
          title={rotacaoPausada ? "Retomar rotação automática" : "Pausar rotação automática"}
          onClick={() => setRotacaoPausada((p) => !p)}
        >
          {rotacaoPausada ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </Button>
        {!rotacaoPausada && (
          <span className="text-[10px] text-slate-400">alterna a cada {cfg.intervaloKpisSeg}s</span>
        )}
      </div>

      {/* ── Alertas ────────────────────────────────────────── */}
      {alertaCorretivas ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            className={`shadow-sm ${
              alertaCorretivas.nivel === "critico"
                ? "border-red-300 bg-red-50"
                : alertaCorretivas.nivel === "atencao"
                  ? "border-amber-300 bg-amber-50"
                  : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    alertaCorretivas.nivel === "critico"
                      ? "#ef4444"
                      : alertaCorretivas.nivel === "atencao"
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              />
              <div>
                <div className="text-sm font-semibold text-slate-700">{alertaCorretivas.texto}</div>
                <div className="text-xs text-slate-500">{alertaCorretivas.detalhe}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700">
          <CardContent className="flex items-start gap-3 p-4">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-slate-400" />
            <div>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Alerta de corretivas desativado
              </div>
              <div className="text-xs text-slate-500">
                Defina o máximo de corretivas no mês em Configurações para ativar este alerta.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <Card
          className="shadow-sm transition hover:border-[#1f7ad6]"
          onClick={() => abrirDrill("O.S. executadas no período", (os) => os.concluida)}
        >
          <CardContent className="flex items-start gap-3 p-3">
            <ClipboardList className="mt-1 h-7 w-7 shrink-0 text-[#0b3a73]" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">OS Executadas</div>
              <div className="text-2xl font-bold leading-tight">{metricasPeriodo.osExec}</div>
              <div className="text-[10px] text-slate-400">
                {metricasPeriodo.osSusp} suspensas · {metricasPeriodo.osCanc} canceladas
              </div>
              <div
                className={`text-[10px] font-medium ${corDelta(linhaOsExec.delta)}`}
                title={cmp.rotulo}
              >
                {linhaOsExec.texto}
              </div>
            </div>
            <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-slate-300" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <Target className="mt-1 h-7 w-7 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500">Meta Realizada</div>
                <div className="text-2xl font-bold leading-tight">
                  {pctMeta !== null ? `${pctMeta.toFixed(0)}%` : "—"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {metricasPeriodo.osExec} de {formatNumero(metaTotal, 1)} OS
                </div>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, pctMeta ?? 0))}%`,
                  backgroundColor: corProgresso(pctMeta ?? 0),
                }}
              />
            </div>
            <div className="mt-1 text-[10px] font-medium text-slate-500">
              {temMeta
                ? `meta ${periodoTexto}: ${formatNumero(metaTotal, 1)} OS`
                : "Meta não configurada — use ⚙ Configurações"}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-start gap-3 p-3">
            <Activity className="mt-1 h-7 w-7 shrink-0 text-violet-600" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">Média diária de OS</div>
              <div className="text-2xl font-bold leading-tight">{formatNumero(mediaOsDia, 1)}</div>
              <div className="text-[10px] text-slate-400">
                em {diasPeriodoEfetivos} dia(s) com dados
              </div>
              <div className={`text-[10px] font-medium ${corDelta(linhaMedia.delta)}`}>
                {linhaMedia.texto}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-sm transition hover:border-[#1f7ad6]"
          onClick={() => abrirDrill("O.S. executadas (horas apontadas)", (os) => os.concluida)}
        >
          <CardContent className="flex items-start gap-3 p-3">
            <Clock className="mt-1 h-7 w-7 shrink-0 text-teal-600" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">HH trabalhados</div>
              <div className="text-2xl font-bold leading-tight">
                {formatMinutos(metricasPeriodo.hhExec)}
              </div>
              <div className="text-[10px] text-slate-400">média {formatMinutos(hhDia)} por dia</div>
              <div className={`text-[10px] font-medium ${corDelta(linhaHh.delta)}`}>
                {linhaHh.texto}
              </div>
            </div>
            <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-slate-300" />
          </CardContent>
        </Card>

        <Card
          className="shadow-sm transition hover:border-[#1f7ad6]"
          onClick={() => abrirDrill("O.S. corretivas no período", (os) => os.corretiva)}
        >
          <CardContent className="flex items-start gap-3 p-3">
            <Flame className="mt-1 h-7 w-7 shrink-0 text-red-500" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">Corretivas</div>
              <div className="text-2xl font-bold leading-tight">{metricasPeriodo.corretivas}</div>
              <div className="text-[10px] text-slate-400">
                {limiteCorretivas > 0
                  ? `limite ${formatNumero(limiteCorretivas, 2)} no período`
                  : "limite não configurado"}
              </div>
              <div className={`text-[10px] font-medium ${corDelta(linhaCorretivas.delta, true)}`}>
                {linhaCorretivas.texto}
              </div>
            </div>
            <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-slate-300" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-start gap-3 p-3">
            <Wrench className="mt-1 h-7 w-7 shrink-0 text-orange-500" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">HH Corretiva (concluída)</div>
              <div className="text-2xl font-bold leading-tight">
                {formatMinutos(metricasPeriodo.hhCorretiva)}
              </div>
              <div className="text-[10px] text-slate-400">
                {formatNumero(shareHhCorretiva, 0)}% do HH executado
              </div>
              <div className={`text-[10px] font-medium ${corDelta(linhaHhCorretiva.delta, true)}`}>
                {linhaHhCorretiva.texto}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-start gap-3 p-3">
            <Hammer className="mt-1 h-7 w-7 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">HH Melhoria / Engenharia</div>
              <div className="text-2xl font-bold leading-tight">
                {formatMinutos(metricasPeriodo.hhMelhoria)}
              </div>
              <div className="text-[10px] text-slate-400">
                {formatNumero(shareHhMelhoria, 0)}% do HH executado
              </div>
              <div className={`text-[10px] font-medium ${corDelta(linhaHhMelhoria.delta)}`}>
                {linhaHhMelhoria.texto}
              </div>
            </div>
          </CardContent>
        </Card>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help shadow-sm">
                <CardContent className="flex items-start gap-3 p-3">
                  <Users className="mt-1 h-7 w-7 shrink-0 text-sky-600" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500">Média por Equipe</div>
                    <div className="text-2xl font-bold leading-tight">
                      {formatNumero(metricasPeriodo.osExec / nEquipesPeriodo, 1)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {rankingEquipes.length} equipe(s) ativa(s)
                    </div>
                    <div className={`text-[10px] font-medium ${corDelta(linhaMediaEquipe.delta)}`}>
                      {linhaMediaEquipe.texto}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="max-h-72 w-60 overflow-auto rounded-lg bg-white p-3 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
            >
              <p className="mb-2 border-b border-slate-100 pb-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Média de O.S./dia por técnico
              </p>
              {mediaPorTecnico.length === 0 ? (
                <p className="text-[11px] text-slate-400">Sem dados no período</p>
              ) : (
                mediaPorTecnico.map((t) => (
                  <div
                    key={t.nome}
                    className="flex items-center justify-between gap-3 py-0.5 text-[11px] text-slate-600 dark:text-slate-300"
                  >
                    <span className="truncate">{t.nome}</span>
                    <span className="shrink-0 font-semibold text-slate-800 dark:text-slate-100">
                      {t.media.toFixed(1)}
                    </span>
                  </div>
                ))
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {osPorDia.length === 0 && (
        <p className="text-center py-8 text-sm text-slate-400">
          Nenhum dado encontrado para o período selecionado.
        </p>
      )}

      {/* ── Evolução diária ────────────────────────────────── */}
      {osPorDia.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução diária</CardTitle>
            <p className="text-[11px] text-slate-500">
              Meta diária proporcional:{" "}
              <strong>
                {temMeta ? `${formatNumero(metaDiaria, 1)} OS/dia` : "não configurada"}
              </strong>{" "}
              · Limite de corretivas/dia:{" "}
              <strong>
                {limiteCorretivas > 0
                  ? formatNumero(limiteCorretivas / diasPeriodoEfetivos, 2)
                  : "—"}
              </strong>
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={osPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as (typeof osPorDia)[number];
                    return (
                      <div className="min-w-[200px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-600 dark:bg-slate-800">
                        <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">
                          {formatDataBR(row.dataCompleta)}
                        </p>
                        <p className="mb-1 text-slate-600 dark:text-slate-300">
                          Executadas: <strong>{row.exec}</strong>
                          <span className="text-slate-400"> · corretivas: {row.corretivas}</span>
                        </p>
                        <div className="border-t border-slate-100 pt-1 dark:border-slate-700">
                          {row.equipes.length === 0 ? (
                            <p className="text-slate-400">Sem equipes cadastradas</p>
                          ) : (
                            row.equipes.map((eq) => (
                              <div
                                key={`${row.data}-${eq.chave}`}
                                className="flex items-center justify-between gap-3 py-0.5"
                              >
                                <span className="flex items-center gap-1.5 text-slate-500">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: getEquipeColor(eq.chave).hex }}
                                  />
                                  {eq.nome}
                                </span>
                                <strong className="text-slate-700 dark:text-slate-200">
                                  {eq.exec}
                                </strong>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="exec"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Executadas"
                />
                <Line
                  type="monotone"
                  dataKey="corretivas"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  name="Corretivas"
                />
                {temMeta && metaDiaria > 0 && (
                  <ReferenceLine
                    y={metaDiaria}
                    stroke="#22c55e"
                    strokeDasharray="5 4"
                    label={{
                      value: "meta/dia",
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: "#22c55e",
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Ranking de equipes ─────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-sm font-semibold">Ranking de Equipes</CardTitle>
            <p className="text-[11px] text-slate-500">
              Clique em uma linha para ver as O.S. da equipe.
            </p>
          </div>
          {podeUnificarEquipes && (
            <Button variant="outline" size="sm" onClick={() => setUnificarAberto(true)}>
              <GitMerge className="mr-1.5 h-4 w-4" /> Unificar equipes
            </Button>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rankingEquipes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhuma equipe com O.S. no período selecionado.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Equipe</th>
                  <th className="px-2 py-1.5 text-right">Téc.</th>
                  <th className="px-2 py-1.5 text-right">Executadas</th>
                  <th className="px-2 py-1.5 text-right">Susp./Canc.</th>
                  <th className="px-2 py-1.5">Contribuição à meta</th>
                  <th className="px-2 py-1.5 text-right">Corretivas</th>
                </tr>
              </thead>
              <tbody>
                {rankingEquipes.map((equipe, i) => (
                  <tr
                    key={equipe.chave}
                    className="cursor-pointer border-t transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    onClick={() => setEquipeDetalhe(equipe)}
                  >
                    <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                    <td className="max-w-[260px] px-2 py-1.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: getEquipeColor(equipe.chave).hex }}
                        />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                          {equipe.nome}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">{equipe.tecnicos.length}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{equipe.exec}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">
                      {equipe.susp} / {equipe.canc}
                    </td>
                    <td className="px-2 py-1.5">
                      {equipe.contribPct !== null ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex cursor-help items-center gap-2">
                                <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                  <span
                                    className="block h-1.5 rounded-full bg-emerald-500"
                                    style={{
                                      width: `${Math.max(0, Math.min(100, equipe.contribPct))}%`,
                                    }}
                                  />
                                </span>
                                <span className="w-10 shrink-0 text-right font-semibold">
                                  {equipe.contribPct.toFixed(0)}%
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {equipe.exec} O.S. de {formatNumero(equipe.contribTotal, 1)} da meta
                              mensal global do período.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span
                        className={
                          equipe.corretivas > 0
                            ? "font-semibold text-red-500"
                            : "text-muted-foreground"
                        }
                      >
                        {equipe.corretivas}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Ranking de técnicos ────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Ranking de Técnicos</CardTitle>
          <p className="text-[11px] text-slate-500">
            Meta e % são individuais por colaborador. O.S. e HH são sumarizados pelas equipes em que
            o colaborador participou no período.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rankingTecnicos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhum técnico em equipe no período selecionado.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Técnico</th>
                  <th className="px-2 py-1.5">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block cursor-help border-b border-dotted border-slate-300">
                            Participadas
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Quantidade de O.S. executadas pela equipe/unidade de equipe da qual o
                          técnico participou no período.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-2 py-1.5 text-right">Dias trabalhados</th>
                  <th className="px-2 py-1.5">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block cursor-help border-b border-dotted border-slate-300">
                            HH trabalhado no período
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Soma do HH apontado pelas equipes em que o colaborador participou no
                          período.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="px-2 py-1.5 text-right">Meta</th>
                  <th className="px-2 py-1.5">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block cursor-help border-b border-dotted border-slate-300">
                            % da meta
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          O.S. sumarizadas das equipes em que o colaborador participou no período ÷
                          a meta (individual ou quota proporcional da meta global).
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const maxHh = Math.max(0, ...rankingTecnicos.map((t) => t.hhMin));
                  return rankingTecnicos.map((tec, i) => (
                    <tr
                      key={tec.tecId}
                      className="cursor-pointer border-t transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      onClick={() =>
                        abrirDrill(`O.S. do técnico ${tec.nome}`, (os) =>
                          os.tecnicos.includes(tec.tecId),
                        )
                      }
                    >
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="max-w-[240px] px-2 py-1.5">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: tec.cor }}
                          />
                          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                            {tec.nome}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold">{tec.participadas}</td>
                      <td className="px-2 py-1.5 text-right text-muted-foreground">
                        {tec.diasTrabalhados}
                      </td>
                      <td className="px-2 py-1.5">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex cursor-help items-center justify-end gap-2">
                                <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                  <span
                                    className="block h-1.5 rounded-full bg-emerald-500"
                                    style={{
                                      width:
                                        maxHh > 0
                                          ? `${Math.max(
                                              Math.min(100, (tec.hhMin / maxHh) * 100),
                                              tec.hhMin > 0 ? 4 : 0,
                                            )}%`
                                          : "0%",
                                    }}
                                  />
                                </span>
                                <span className="w-12 shrink-0 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                                  {formatMinutos(tec.hhMin)}
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              Soma do HH apontado pelas equipes em que o colaborador participou no
                              período.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {tec.meta > 0 ? formatNumero(tec.meta, 1) : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <span
                              className="block h-1.5 rounded-full"
                              style={{
                                width: `${Math.max(0, Math.min(100, tec.pct ?? 0))}%`,
                                backgroundColor: corProgresso(tec.pct ?? 0),
                              }}
                            />
                          </span>
                          <span className="w-10 shrink-0 text-right font-semibold">
                            {tec.pct !== null ? `${tec.pct.toFixed(0)}%` : "—"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Destaques ──────────────────────────────────────── */}
      {destaques && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="shadow-sm border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-4">
              <Trophy className="mt-0.5 h-8 w-8 shrink-0 text-amber-600" />
              <div>
                <div className="text-xs font-semibold text-amber-800">Equipe mais produtiva</div>
                <div className="text-lg font-bold text-amber-700">
                  {destaques.maisProdutiva.nome}
                </div>
                <div className="text-xs text-amber-600">
                  {destaques.maisProdutiva.exec} OS executadas no período
                  {destaques.maisProdutiva.contribPct !== null &&
                    ` · ${destaques.maisProdutiva.contribPct.toFixed(0)}% da meta mensal global`}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-red-200 bg-red-50">
            <CardContent className="flex items-start gap-3 p-4">
              <Flame className="mt-0.5 h-8 w-8 shrink-0 text-red-600" />
              <div>
                <div className="text-xs font-semibold text-red-800">
                  Mais O.S. corretivas no período
                </div>
                <div className="text-lg font-bold text-red-700">
                  {destaques.maisCorretivas.nome}
                </div>
                <div className="text-xs text-red-600">
                  {destaques.maisCorretivas.corretivas} corretivas
                  {limiteCorretivas > 0 &&
                    ` · limite proporcional: ${formatNumero(limiteCorretivas, 2)}`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Barras: equipes e técnicos ─────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">OS Executadas por Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(150, rankingEquipes.length * 35)}>
              <BarChart data={rankingEquipes} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={130}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                />
                <RechartsTooltip
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as LinhaEquipe;
                    return (
                      <div className="min-w-[200px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-600 dark:bg-slate-800">
                        <div className="mb-1 font-bold text-slate-800 dark:text-slate-100">
                          {d.nome}
                        </div>
                        <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                            Executadas: <strong>{d.exec}</strong>
                          </div>
                          <div>
                            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
                            Suspensas: <strong>{d.susp}</strong>
                          </div>
                          <div>
                            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                            Canceladas: <strong>{d.canc}</strong>
                          </div>
                          <div className="pt-1 text-slate-500">
                            Corretivas: <strong>{d.corretivas}</strong>
                          </div>
                          <div className="text-slate-500">
                            Contribuição à meta:{" "}
                            <strong>
                              {d.contribPct !== null ? `${d.contribPct.toFixed(0)}%` : "—"}
                            </strong>
                          </div>
                          <div className="text-slate-500">
                            Técnicos: <strong>{d.tecnicos.length}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="exec" radius={[0, 4, 4, 0]}>
                  {rankingEquipes.map((equipe) => (
                    <Cell
                      key={equipe.chave}
                      fill={getEquipeColor(equipe.chave).hex}
                      cursor="pointer"
                      onClick={() => setEquipeDetalhe(equipe)}
                    />
                  ))}
                  <LabelList
                    dataKey="exec"
                    position="right"
                    className="fill-slate-700 dark:fill-slate-200"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">OS Participadas por Técnico</CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Considera apenas O.S. executadas pela equipe (ou união de equipes) do técnico.
            </p>
          </CardHeader>
          <CardContent>
            {rankingTecnicos.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Sem técnicos em equipe no período selecionado.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(150, rankingTecnicos.length * 35)}>
                <BarChart data={rankingTecnicos} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={150}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as LinhaTecnico;
                      return (
                        <div className="min-w-[220px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-600 dark:bg-slate-800">
                          <div className="mb-1 font-bold text-slate-800 dark:text-slate-100">
                            {d.nome}
                          </div>
                          <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                            <div>
                              O.S. participadas: <strong>{d.participadas}</strong>
                            </div>
                            <div>
                              Dias trabalhados: <strong>{d.diasTrabalhados}</strong>
                            </div>
                            <div>
                              HH das equipes: <strong>{formatMinutos(d.hhMin)}</strong>
                            </div>
                            <div>
                              Meta: <strong>{d.meta > 0 ? formatNumero(d.meta, 1) : "—"}</strong>
                              {d.pct !== null && ` · ${d.pct.toFixed(0)}%`}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="participadas" radius={[0, 4, 4, 0]}>
                    {rankingTecnicos.map((r) => (
                      <Cell key={r.tecId} fill={r.cor} />
                    ))}
                    <LabelList
                      dataKey="participadas"
                      position="right"
                      className="fill-slate-700 dark:fill-slate-200"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Composição por categoria ───────────────────────── */}
      {composicaoPorDia.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Composição de OS por Tipo de Serviço
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Corretiva = emergencial + programada · Preventiva = frequência + condição · Melhoria =
              engenharia de manutenção.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={composicaoPorDia} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip />
                <Legend />
                {CATEGORIAS.map((cat) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="categoria"
                    fill={corCategoria(cat)}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Diálogos ───────────────────────────────────────── */}
      <UnificarEquipesDialog
        open={unificarAberto}
        onOpenChange={setUnificarAberto}
        equipes={equipesGerenciaveis}
        aliasesEquipe={aliases.equipes}
        aliasesIntegrante={aliases.integrantes}
        sugestoesIgnoradas={aliases.ignoradas}
        userId={user?.id || null}
        onAliasesChanged={() => void aliases.recarregar()}
      />

      <Dialog open={!!equipeDetalhe} onOpenChange={(aberto) => !aberto && setEquipeDetalhe(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: equipeDetalhe
                    ? getEquipeColor(equipeDetalhe.chave).hex
                    : "#94a3b8",
                }}
              />
              {equipeDetalhe?.nome}
            </DialogTitle>
            <DialogDescription>
              {equipeDetalheOs.length} O.S. no período · {equipeDetalhe?.exec || 0} executadas ·{" "}
              {equipeDetalhe?.corretivas || 0} corretivas
              {equipeDetalhe?.contribPct !== null && equipeDetalhe?.contribPct !== undefined
                ? ` · contribui ${equipeDetalhe.contribPct.toFixed(0)}% da meta mensal global`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <TabelaOs
            linhas={equipeDetalheOs}
            nomeEquipe={nomeDaEquipe}
            onSelecionar={(os) => setOsDetalhe(os)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!drill} onOpenChange={(aberto) => !aberto && setDrill(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[#0b3a73]" /> {drill?.titulo}
            </DialogTitle>
            <DialogDescription>
              {drill?.subtitulo} · {drillOs.length} O.S. · clique em uma linha para ver os detalhes
            </DialogDescription>
          </DialogHeader>
          <TabelaOs
            linhas={drillOs}
            nomeEquipe={nomeDaEquipe}
            onSelecionar={(os) => setOsDetalhe(os)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!osDetalhe} onOpenChange={(aberto) => !aberto && setOsDetalhe(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{osDetalhe?.om ? `O.S. ${osDetalhe.om}` : "Atividade avulsa"}</DialogTitle>
            <DialogDescription>
              {osDetalhe ? `${osDetalhe.categoria} · ${osDetalhe.texto || "sem descrição"}` : ""}
            </DialogDescription>
          </DialogHeader>
          {osDetalhe && <DetalheOs os={osDetalhe} nomeEquipe={nomeDaEquipe} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────

function rotuloStatus(os: OsAgrupada): { texto: string; cor: string } {
  if (os.concluida) return { texto: "Executada", cor: "text-emerald-600" };
  if (os.suspensa) return { texto: "Suspensa", cor: "text-amber-600" };
  if (os.cancelada) return { texto: "Cancelada", cor: "text-red-500" };
  return { texto: "Pendente", cor: "text-slate-500" };
}

function TabelaOs({
  linhas,
  nomeEquipe,
  onSelecionar,
}: {
  linhas: OsAgrupada[];
  nomeEquipe: (chave: string) => string;
  onSelecionar: (os: OsAgrupada) => void;
}) {
  if (linhas.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Nenhuma O.S. encontrada para este filtro.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">O.S.</th>
            <th className="px-3 py-2">Equipe</th>
            <th className="px-3 py-2">Categoria</th>
            <th className="px-3 py-2">Atividade</th>
            <th className="px-3 py-2 text-right">HH</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Planta</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((os) => {
            const status = rotuloStatus(os);
            return (
              <tr
                key={os.key}
                className="cursor-pointer border-t transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                onClick={() => onSelecionar(os)}
              >
                <td className="whitespace-nowrap px-3 py-2">
                  {os.datas.length === 0
                    ? "—"
                    : os.datas.length === 1
                      ? formatDataBR(os.datas[0])
                      : `${formatDataBR(os.datas[0])} (+${os.datas.length - 1})`}
                </td>
                <td className="px-3 py-2 font-mono">{os.om || "—"}</td>
                <td className="max-w-[160px] px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: os.equipes[0]
                          ? getEquipeColor(os.equipes[0]).hex
                          : "#cbd5e1",
                      }}
                    />
                    <span className="truncate">
                      {os.equipes.length > 0
                        ? os.equipes.map((c) => nomeEquipe(c)).join(" / ")
                        : "—"}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: corCategoria(os.categoria) }}
                  >
                    {os.categoria}
                  </span>
                </td>
                <td className="max-w-[240px] px-3 py-2">
                  <span className="block truncate">{os.texto || "—"}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatMinutos(os.hh)}</td>
                <td className={`whitespace-nowrap px-3 py-2 font-medium ${status.cor}`}>
                  {status.texto}
                </td>
                <td className="max-w-[140px] px-3 py-2">
                  <span className="block truncate">{os.planta || "—"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetalheOs({ os, nomeEquipe }: { os: OsAgrupada; nomeEquipe: (chave: string) => string }) {
  const status = rotuloStatus(os);
  const linhas = [...os.atividades].sort((a, b) => a.id - b.id);
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="text-[10px] uppercase text-slate-400">Status</div>
          <div className={`text-sm font-semibold ${status.cor}`}>{status.texto}</div>
        </div>
        <div className="rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="text-[10px] uppercase text-slate-400">Horas (HH)</div>
          <div className="text-sm font-semibold">{formatMinutos(os.hh)}</div>
        </div>
        <div className="rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="text-[10px] uppercase text-slate-400">Categoria</div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: corCategoria(os.categoria) }}
            />
            {os.categoria}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="text-[10px] uppercase text-slate-400">Datas</div>
          <div className="text-sm font-semibold">{os.datas.map(formatDataBR).join(", ")}</div>
        </div>
        <div className="rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="text-[10px] uppercase text-slate-400">Planta / Área</div>
          <div className="text-sm font-semibold">
            {os.planta || "—"}
            {os.area ? ` · ${os.area}` : ""}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="text-[10px] uppercase text-slate-400">Equipe(s)</div>
          <div className="text-sm font-semibold">
            {os.equipes.length > 0 ? os.equipes.map((c) => nomeEquipe(c)).join(" / ") : "—"}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Técnicos envolvidos
        </div>
        <div className="flex flex-wrap gap-1.5">
          {os.tecnicos.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Atividade</th>
              <th className="px-3 py-2">Técnico</th>
              <th className="px-3 py-2">Início</th>
              <th className="px-3 py-2">Fim</th>
              <th className="px-3 py-2 text-right">Duração</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="max-w-[260px] px-3 py-2">
                  <span className="block truncate">{a.tipo_atividade || a.texto_breve || "—"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{a.id_recurso}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">
                  {a.inicio ? a.inicio.slice(11, 16) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">
                  {a.fim ? a.fim.slice(11, 16) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono">
                  {formatMinutos(Number(a.duracao_min) || 0)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{normalizeStatus(a.status) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
