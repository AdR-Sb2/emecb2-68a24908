import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Loader2,
  Download,
  Search,
  Tag,
  Calendar,
  TrendingUp,
  Clock,
  DollarSign,
  List,
  GanttChart,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Circle,
  PlayCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CronogramaProjeto, CronogramaItem } from "@/lib/cronograma-types";

export const Route = createFileRoute("/publico/$token")({
  component: PublicoCronogramaPage,
  head: () => ({
    meta: [
      { title: "Cronograma · Águas do Rio" },
      { name: "description", content: "Cronograma compartilhado" },
    ],
  }),
});

const STATUS_CONFIG = {
  nao_iniciado: {
    label: "Não iniciado",
    color: "#94a3b8",
    bgColor: "bg-slate-100",
    textColor: "text-slate-600",
    dotColor: "bg-slate-400",
    icon: Circle,
  },
  em_andamento: {
    label: "Em andamento",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    dotColor: "bg-blue-500",
    icon: PlayCircle,
  },
  concluido: {
    label: "Concluído",
    color: "#22c55e",
    bgColor: "bg-green-50",
    textColor: "text-green-600",
    dotColor: "bg-green-500",
    icon: CheckCircle2,
  },
  atrasado: {
    label: "Atrasado",
    color: "#ef4444",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    dotColor: "bg-red-500",
    icon: AlertCircle,
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function formatDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function formatCurrency(v: number | null): string {
  if (!v || v === 0) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const d1 = new Date(a + "T12:00:00");
  const d2 = new Date(b + "T12:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

function PublicoCronogramaPage() {
  const { token } = Route.useParams();
  const [projeto, setProjeto] = useState<CronogramaProjeto | null>(null);
  const [itens, setItens] = useState<CronogramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"lista" | "gantt">("lista");
  const [filtroAno, setFiltroAno] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      const { data: proj, error: errProj } = await supabase
        .from("cronograma_projetos")
        .select("*, profiles!cronograma_projetos_criado_por_fkey(nome_completo)")
        .eq("link_publico_token", token)
        .maybeSingle();
      if (errProj || !proj) {
        setErro("Cronograma não encontrado ou link inválido.");
        setLoading(false);
        return;
      }
      const mappedProj = {
        ...proj,
        criado_por_nome: (proj.profiles as { nome_completo: string } | null)?.nome_completo ?? null,
      } as unknown as CronogramaProjeto;
      setProjeto(mappedProj);

      const { data: items } = await supabase
        .from("cronograma_itens")
        .select("*")
        .eq("projeto_id", mappedProj.id)
        .order("ordem", { ascending: true });
      if (items) setItens(items as unknown as CronogramaItem[]);
      setLoading(false);
    })();
  }, [token]);

  const itensFiltrados = useMemo(() => {
    let result = itens;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter((i) => i.nome.toLowerCase().includes(q));
    }
    if (filtroStatus !== "todos") {
      result = result.filter((i) => i.status === filtroStatus);
    }
    if (filtroAno !== "todos") {
      result = result.filter((i) => {
        const d = i.data_inicio_calculada;
        return d && d.startsWith(filtroAno);
      });
    }
    return result;
  }, [itens, busca, filtroStatus, filtroAno]);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>();
    itens.forEach((i) => {
      if (i.data_inicio_calculada) anos.add(i.data_inicio_calculada.slice(0, 4));
    });
    return [...anos].sort().reverse();
  }, [itens]);

  const stats = useMemo(() => {
    const total = itens.length;
    const concluidos = itens.filter((i) => i.status === "concluido").length;
    const emAndamento = itens.filter((i) => i.status === "em_andamento").length;
    const atrasados = itens.filter((i) => i.status === "atrasado").length;
    const naoIniciados = itens.filter((i) => i.status === "nao_iniciado").length;
    const totalDias = itens.reduce(
      (sum, i) => sum + (i.duracao_dias ?? projeto?.duracao_padrao_dias ?? 1),
      0,
    );
    const custoTotal = itens.reduce((sum, i) => sum + (i.custo_material ?? 0), 0);
    const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    const dataMin =
      itens.length > 0
        ? itens.reduce(
            (min, i) =>
              i.data_inicio_calculada && i.data_inicio_calculada < min
                ? i.data_inicio_calculada
                : min,
            itens[0]?.data_inicio_calculada || "",
          )
        : projeto?.data_inicio_base || "";
    const dataMax =
      itens.length > 0
        ? itens.reduce(
            (max, i) =>
              i.data_termino_calculada && i.data_termino_calculada > max
                ? i.data_termino_calculada
                : max,
            itens[0]?.data_termino_calculada || "",
          )
        : "";
    return {
      total,
      concluidos,
      emAndamento,
      atrasados,
      naoIniciados,
      totalDias,
      custoTotal,
      progresso,
      dataMin,
      dataMax,
    };
  }, [itens, projeto]);

  function exportarPDF() {
    window.print();
  }

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0b3a73 0%, #1e5fa8 50%, #0ea5e9 100%)" }}
      >
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-white mx-auto" />
          <p className="mt-4 text-white/80 text-sm">Carregando cronograma…</p>
        </div>
      </div>
    );
  }

  if (erro || !projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-slate-700">Cronograma não encontrado</h2>
          <p className="mt-2 text-sm text-slate-500">{erro || "O link pode ter sido revogado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 print:bg-white">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
        .progress-bar { animation: progressFill 1.2s ease-out both; }
        .hero-geo {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          pointer-events: none;
        }
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {/* ─── HERO HEADER ─── */}
      <header
        className="relative overflow-hidden px-4 pt-8 pb-6 md:px-8 md:pt-12 md:pb-8"
        style={{ background: "linear-gradient(135deg, #0b3a73 0%, #1e5fa8 50%, #0ea5e9 100%)" }}
      >
        <div className="hero-geo" style={{ width: 320, height: 320, top: -80, right: -60 }} />
        <div className="hero-geo" style={{ width: 200, height: 200, bottom: -40, left: -30 }} />
        <div className="hero-geo" style={{ width: 120, height: 120, top: 20, left: "40%" }} />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
            <CalendarRange className="h-3.5 w-3.5" />
            Cronograma · Águas do Rio
          </div>
          <h1
            className="text-2xl font-extrabold tracking-tight text-white md:text-4xl"
            style={{ fontWeight: 800, letterSpacing: "-0.02em" }}
          >
            {projeto.nome}
          </h1>
          {projeto.descricao && (
            <p className="mt-2 max-w-2xl text-sm text-white/70 md:text-base">{projeto.descricao}</p>
          )}

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              label="Total de itens"
              value={String(stats.total)}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <KpiCard
              label="Concluídos"
              value={String(stats.concluidos)}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accent="#4ade80"
            />
            <KpiCard
              label="Em andamento"
              value={String(stats.emAndamento)}
              icon={<PlayCircle className="h-4 w-4" />}
              accent="#60a5fa"
            />
            <KpiCard
              label="Atrasados"
              value={String(stats.atrasados)}
              icon={<AlertCircle className="h-4 w-4" />}
              accent="#f87171"
            />
            <KpiCard
              label="Total de dias"
              value={String(stats.totalDias)}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>

          {/* Custo total */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 backdrop-blur-sm">
            <DollarSign className="h-4 w-4 text-green-300" />
            <span className="text-xs text-white/70">Custo total de material:</span>
            <span className="text-sm font-bold text-white">{formatCurrency(stats.custoTotal)}</span>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs text-white/60">
              <span>Progresso geral</span>
              <span className="font-semibold text-white">{stats.progresso}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="progress-bar h-full rounded-full"
                style={{
                  width: `${stats.progresso}%`,
                  background: "linear-gradient(90deg, #4ade80, #22c55e)",
                }}
              />
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-white/50">
              <span>Início: {formatDate(stats.dataMin || projeto.data_inicio_base)}</span>
              <span>Previsão: {formatDate(stats.dataMax)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── BARRA DE CONTROLES STICKY ─── */}
      <div
        className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md md:px-8"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar item..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          {/* Filtro de ano */}
          <select
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          >
            <option value="todos">Todos os anos</option>
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Chips de status */}
          <div className="flex flex-wrap gap-1.5">
            {(["todos", "nao_iniciado", "em_andamento", "concluido", "atrasado"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    filtroStatus === s
                      ? "bg-[#0b3a73] text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {s === "todos" ? "Todos" : STATUS_CONFIG[s].label}
                </button>
              ),
            )}
          </div>

          {/* Toggle view */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode("lista")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "lista"
                  ? "bg-white text-[#0b3a73] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              onClick={() => setViewMode("gantt")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "gantt"
                  ? "bg-white text-[#0b3a73] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <GanttChart className="h-3.5 w-3.5" /> Gantt
            </button>
          </div>

          {/* PDF */}
          <button
            onClick={exportarPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* ─── CONTEÚDO ─── */}
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        {itensFiltrados.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl">🔍</div>
            <p className="mt-3 text-sm text-slate-500">
              Nenhum item encontrado para os filtros selecionados.
            </p>
          </div>
        )}

        {viewMode === "lista" ? (
          <ViewLista itens={itensFiltrados} projeto={projeto} />
        ) : (
          <ViewGantt itens={itensFiltrados} projeto={projeto} stats={stats} />
        )}
      </main>

      {/* ─── RODAPÉ ─── */}
      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400 md:px-8">
        Águas do Rio · Eletromecânica Baixada 2 · Gerado em {new Date().toLocaleDateString("pt-BR")}
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COMPONENTES AUXILIARES
   ═══════════════════════════════════════════════ */

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 backdrop-blur-md"
      style={{ background: "rgba(255,255,255,0.1)" }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: accent ? `${accent}22` : "rgba(255,255,255,0.15)" }}
      >
        <span style={{ color: accent || "rgba(255,255,255,0.8)" }}>{icon}</span>
      </div>
      <div>
        <p className="text-[11px] text-white/50">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function ViewLista({ itens, projeto }: { itens: CronogramaItem[]; projeto: CronogramaProjeto }) {
  const grupos = useMemo(() => {
    const map = new Map<string, CronogramaItem[]>();
    itens.forEach((item) => {
      const g = item.grupo || "(sem grupo)";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [itens]);

  let seq = 0;

  return (
    <div className="space-y-6">
      {grupos.map(([grupo, items]) => (
        <div key={grupo}>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{grupo}</h3>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] text-slate-400">{items.length} itens</span>
          </div>
          <div className="space-y-2">
            {items.map((item) => {
              seq++;
              const st = STATUS_CONFIG[item.status as StatusKey];
              const duracao = item.duracao_dias ?? projeto.duracao_padrao_dias;
              return (
                <div
                  key={item.id}
                  className="fade-up rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
                  style={{ animationDelay: `${Math.min(seq * 40, 600)}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                      {String(seq).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.nome}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bgColor} ${st.textColor}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dotColor}`} />
                          {st.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{duracao}d</span>
                      </div>
                      {/* Barra de progresso fina */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width:
                              item.status === "concluido"
                                ? "100%"
                                : item.status === "em_andamento"
                                  ? "55%"
                                  : item.status === "atrasado"
                                    ? "75%"
                                    : "0%",
                            backgroundColor: st.color,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {item.grupo || "--"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(item.data_inicio_calculada)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />{" "}
                          {formatDate(item.data_termino_calculada)}
                        </span>
                        {item.custo_material ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <DollarSign className="h-3 w-3" /> {formatCurrency(item.custo_material)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewGantt({
  itens,
  projeto,
  stats,
}: {
  itens: CronogramaItem[];
  projeto: CronogramaProjeto;
  stats: { dataMin: string; dataMax: string };
}) {
  const colWidth = 18;
  const dataMin = stats.dataMin || projeto.data_inicio_base;
  const dataMax = stats.dataMax || addDays(dataMin, 30);
  const diasTotais = diffDays(dataMin, dataMax) + 1;
  const ganttWidth = Math.max(diasTotais * colWidth, 500);

  function diaOffset(data: string): number {
    return diffDays(dataMin, data);
  }

  const meses = useMemo(() => {
    const inicio = new Date(dataMin + "T12:00:00");
    const fim = new Date(dataMax + "T12:00:00");
    const result: { label: string; dias: number }[] = [];
    let current = new Date(inicio);
    while (current <= fim) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const label = current.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      let count = 0;
      const temp = new Date(current);
      while (temp.getMonth() === month && temp <= fim) {
        count++;
        temp.setDate(temp.getDate() + 1);
      }
      result.push({ label, dias: count });
      current = new Date(year, month + 1, 1);
    }
    return result;
  }, [dataMin, dataMax]);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div style={{ minWidth: 240 + ganttWidth }}>
        {/* Header meses */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="flex w-[240px] shrink-0 items-center border-r border-slate-200 px-3 py-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Item</span>
          </div>
          <div className="flex">
            {meses.map((m, i) => (
              <div
                key={i}
                className="flex-shrink-0 border-r border-slate-100 text-center"
                style={{ width: m.dias * colWidth }}
              >
                <div className="py-1 text-[10px] font-medium text-slate-500">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Linhas */}
        {itens.map((item, idx) => {
          const inicio = item.data_inicio_calculada || projeto.data_inicio_base;
          const termino =
            item.data_termino_calculada ||
            addDays(inicio, (item.duracao_dias ?? projeto.duracao_padrao_dias) - 1);
          const offset = diaOffset(inicio);
          const duracao = diffDays(inicio, termino) + 1;
          const barWidth = duracao * colWidth;
          const st = STATUS_CONFIG[item.status as StatusKey];
          const progresso =
            item.status === "concluido"
              ? 100
              : item.status === "em_andamento"
                ? 55
                : item.status === "atrasado"
                  ? 75
                  : 0;

          return (
            <div
              key={item.id}
              className={`flex border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/30 transition-colors`}
            >
              <div className="flex w-[240px] shrink-0 items-center gap-2 border-r border-slate-200 px-3 py-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${st.dotColor}`} />
                <span className="truncate text-xs font-medium text-slate-700">{item.nome}</span>
              </div>
              <div
                className="relative flex items-center"
                style={{ minWidth: ganttWidth, height: 40 }}
              >
                <div
                  className="absolute top-2 rounded-md overflow-hidden"
                  style={{
                    left: offset * colWidth,
                    width: barWidth,
                    height: 28,
                  }}
                >
                  <div className="absolute inset-0 bg-slate-200" />
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${progresso}%`,
                      backgroundColor: st.color,
                    }}
                  />
                  <div className="relative flex h-full items-center px-2">
                    <span className="truncate text-[10px] font-medium text-slate-700 mix-blend-multiply">
                      {item.nome}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotColor}`} />
            <span className="text-[10px] text-slate-500">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PublicoCronogramaPage;
