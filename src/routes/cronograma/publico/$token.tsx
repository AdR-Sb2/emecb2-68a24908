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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CronogramaProjeto, CronogramaItem } from "@/lib/cronograma-types";

export const Route = createFileRoute("/cronograma/publico/$token")({
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

type SortField = "nome" | "status" | "inicio" | "fim" | "duracao" | "custo";
type SortDir = "asc" | "desc";

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
  const [sortField, setSortField] = useState<SortField>("inicio");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "nome":
          cmp = a.nome.localeCompare(b.nome);
          break;
        case "status": {
          const order = { atrasado: 0, em_andamento: 1, nao_iniciado: 2, concluido: 3 };
          cmp = (order[a.status] ?? 4) - (order[b.status] ?? 4);
          break;
        }
        case "inicio":
          cmp = (a.data_inicio_calculada ?? "").localeCompare(b.data_inicio_calculada ?? "");
          break;
        case "fim":
          cmp = (a.data_termino_calculada ?? "").localeCompare(b.data_termino_calculada ?? "");
          break;
        case "duracao":
          cmp =
            (a.duracao_dias ?? projeto?.duracao_padrao_dias ?? 0) -
            (b.duracao_dias ?? projeto?.duracao_padrao_dias ?? 0);
          break;
        case "custo":
          cmp = (a.custo_material ?? 0) - (b.custo_material ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [itens, busca, filtroStatus, filtroAno, sortField, sortDir, projeto]);

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

  const hasActiveFilters = busca.trim() !== "" || filtroStatus !== "todos" || filtroAno !== "todos";

  function clearFilters() {
    setBusca("");
    setFiltroStatus("todos");
    setFiltroAno("todos");
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function exportarPDF() {
    window.print();
  }

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0b2d5e 0%, #0f4c8a 40%, #1a7bc4 80%, #38a3d9 100%)",
        }}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-white" />
          <p className="mt-4 text-sm text-white/80">Carregando cronograma…</p>
        </div>
      </div>
    );
  }

  if (erro || !projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔒</div>
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
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
        @keyframes pulseAlert {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .fade-up { animation: fadeUp 0.4s ease-out both; }
        .progress-bar { animation: progressFill 1s ease-out both; }
        .pulse-alert { animation: pulseAlert 2s ease-in-out infinite; }
        .hero-geo {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          pointer-events: none;
        }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ─── HERO HEADER ─── */}
      <header
        className="relative overflow-hidden px-4 pt-5 pb-5 md:px-8 md:pt-7 md:pb-6"
        style={{
          background: "linear-gradient(135deg, #0b2d5e 0%, #0f4c8a 40%, #1a7bc4 80%, #38a3d9 100%)",
        }}
      >
        {/* Decorative shapes */}
        <div className="hero-geo" style={{ width: 400, height: 400, top: -120, right: -80 }} />
        <div className="hero-geo" style={{ width: 240, height: 240, bottom: -60, left: -40 }} />
        <div className="hero-geo" style={{ width: 140, height: 140, top: 10, right: "30%" }} />
        <div className="hero-geo" style={{ width: 80, height: 80, bottom: "20%", left: "50%" }} />

        <div className="relative mx-auto max-w-6xl">
          {/* Top row: title + cost/progress side by side */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: breadcrumb + title */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium tracking-widest text-white/60 uppercase backdrop-blur-sm">
                <CalendarRange className="h-2.5 w-2.5" />
                Cronograma
              </div>
              <h1
                className="text-2xl font-extrabold leading-tight text-white md:text-4xl"
                style={{ fontWeight: 800, letterSpacing: "-0.03em" }}
              >
                {projeto.nome}
              </h1>
              {projeto.descricao && (
                <p className="mt-1.5 max-w-xl text-xs text-white/50 md:text-sm">
                  {projeto.descricao}
                </p>
              )}

              {/* KPIs row */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <KpiCard
                  label="Total"
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
                  label="Andamento"
                  value={String(stats.emAndamento)}
                  icon={<PlayCircle className="h-4 w-4" />}
                  accent="#60a5fa"
                />
                <KpiCard
                  label="Atrasados"
                  value={String(stats.atrasados)}
                  icon={<AlertCircle className="h-4 w-4" />}
                  accent="#f87171"
                  pulse={stats.atrasados > 0}
                />
                <KpiCard
                  label="Dias"
                  value={String(stats.totalDias)}
                  icon={<Clock className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Right: cost + progress panel */}
            <div className="flex w-full flex-col gap-2.5 lg:w-56 lg:flex-shrink-0">
              {/* Cost card */}
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                    <DollarSign className="h-3.5 w-3.5 text-green-300" />
                  </div>
                  <span className="text-[10px] font-medium text-white/50">Custo total</span>
                </div>
                <p
                  className="text-lg font-extrabold text-white"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {formatCurrency(stats.custoTotal)}
                </p>
              </div>

              {/* Progress card */}
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-white/50">Progresso</span>
                  <span className="text-sm font-bold text-white">{stats.progresso}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="progress-bar h-full rounded-full"
                    style={{
                      width: `${Math.max(stats.progresso, 2)}%`,
                      background: "linear-gradient(90deg, #4ade80, #22c55e)",
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
                  <span>{formatDate(stats.dataMin || projeto.data_inicio_base)}</span>
                  <span className="text-white/20">→</span>
                  <span>{formatDate(stats.dataMax)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── BARRA DE CONTROLES STICKY ─── */}
      <div
        className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-2 md:px-8">
          {/* Desktop controls */}
          <div className="hidden items-center gap-2 sm:flex">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar item..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
            >
              <option value="todos">Anos</option>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {(["todos", "nao_iniciado", "em_andamento", "concluido", "atrasado"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setFiltroStatus(s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
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
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setViewMode("lista")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === "lista"
                    ? "bg-white text-[#0b3a73] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </button>
              <button
                onClick={() => setViewMode("gantt")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === "gantt"
                    ? "bg-white text-[#0b3a73] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <GanttChart className="h-3.5 w-3.5" /> Gantt
              </button>
            </div>
            <button
              onClick={exportarPDF}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 sm:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                mobileFiltersOpen || hasActiveFilters
                  ? "border-[#0b3a73] bg-[#0b3a73] text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
              {hasActiveFilters && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-white" />}
            </button>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setViewMode("lista")}
                className={`rounded-md px-2 py-1 text-xs transition ${
                  viewMode === "lista" ? "bg-white text-[#0b3a73] shadow-sm" : "text-slate-500"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("gantt")}
                className={`rounded-md px-2 py-1 text-xs transition ${
                  viewMode === "gantt" ? "bg-white text-[#0b3a73] shadow-sm" : "text-slate-500"
                }`}
              >
                <GanttChart className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile expanded filters */}
          {mobileFiltersOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2 sm:hidden">
              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
              >
                <option value="todos">Todos os anos</option>
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {(["todos", "nao_iniciado", "em_andamento", "concluido", "atrasado"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setFiltroStatus(s)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                      filtroStatus === s
                        ? "bg-[#0b3a73] text-white shadow-sm"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s === "todos" ? "Todos" : STATUS_CONFIG[s].label}
                  </button>
                ),
              )}
              <button
                onClick={exportarPDF}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-600"
              >
                <Download className="h-3 w-3" /> PDF
              </button>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Filtros:</span>
              {busca.trim() && <Chip label={`"${busca}"`} onRemove={() => setBusca("")} />}
              {filtroAno !== "todos" && (
                <Chip label={filtroAno} onRemove={() => setFiltroAno("todos")} />
              )}
              {filtroStatus !== "todos" && (
                <Chip
                  label={STATUS_CONFIG[filtroStatus as StatusKey].label}
                  onRemove={() => setFiltroStatus("todos")}
                />
              )}
              <button
                onClick={clearFilters}
                className="text-[10px] font-medium text-slate-400 hover:text-slate-600"
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── CONTEÚDO ─── */}
      <main className="mx-auto max-w-6xl px-4 py-4 md:px-8">
        {itensFiltrados.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">Nenhum item encontrado</p>
            <p className="mt-1 text-xs text-slate-400">Tente ajustar os filtros ou a busca</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#0b3a73] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0d4a8f]"
              >
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>
        ) : viewMode === "lista" ? (
          <ViewLista
            itens={itensFiltrados}
            projeto={projeto}
            sortField={sortField}
            sortDir={sortDir}
            onSort={toggleSort}
          />
        ) : (
          <ViewGantt itens={itensFiltrados} projeto={projeto} stats={stats} />
        )}
      </main>

      {/* ─── RODAPÉ ─── */}
      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-[10px] text-slate-400 md:px-8">
        Águas do Rio · Eletromecânica Baixada 2 · Gerado em {new Date().toLocaleDateString("pt-BR")}
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COMPONENTES AUXILIARES
   ═══════════════════════════════════════════════ */

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  pulse,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-md transition hover:bg-white/15 ${
        pulse ? "pulse-alert border-red-400/30" : ""
      }`}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: accent ? `${accent}25` : "rgba(255,255,255,0.12)" }}
      >
        <span style={{ color: accent || "rgba(255,255,255,0.85)" }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-white/45 leading-tight truncate">{label}</p>
        <p
          className="text-base font-extrabold text-white leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ViewLista({
  itens,
  projeto,
  sortField,
  sortDir,
  onSort,
}: {
  itens: CronogramaItem[];
  projeto: CronogramaProjeto;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const grupos = useMemo(() => {
    const map = new Map<string, CronogramaItem[]>();
    itens.forEach((item) => {
      const g = item.grupo || "(sem grupo)";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [itens]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#0b3a73]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#0b3a73]" />
    );
  }

  function ItemProgress({ item }: { item: CronogramaItem }) {
    const pct =
      item.status === "concluido"
        ? 100
        : item.status === "em_andamento"
          ? 55
          : item.status === "atrasado"
            ? 75
            : 0;
    const st = STATUS_CONFIG[item.status as StatusKey];
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: st.color }}
          />
        </div>
        <span className="text-[10px] text-slate-400">{pct}%</span>
      </div>
    );
  }

  let seq = 0;

  return (
    <div className="space-y-5">
      {/* ── TABLE VIEW (desktop lg+) ── */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 font-semibold text-slate-500">#</th>
              <th className="px-3 py-2 font-semibold text-slate-500">Item</th>
              <th className="px-3 py-2 font-semibold text-slate-500">Status</th>
              <th
                className="cursor-pointer px-3 py-2 font-semibold text-slate-500 select-none"
                onClick={() => onSort("inicio")}
              >
                <span className="inline-flex items-center gap-1">
                  Início <SortIcon field="inicio" />
                </span>
              </th>
              <th
                className="cursor-pointer px-3 py-2 font-semibold text-slate-500 select-none"
                onClick={() => onSort("fim")}
              >
                <span className="inline-flex items-center gap-1">
                  Fim <SortIcon field="fim" />
                </span>
              </th>
              <th
                className="cursor-pointer px-3 py-2 font-semibold text-slate-500 select-none"
                onClick={() => onSort("duracao")}
              >
                <span className="inline-flex items-center gap-1">
                  Duração <SortIcon field="duracao" />
                </span>
              </th>
              <th
                className="cursor-pointer px-3 py-2 font-semibold text-slate-500 select-none"
                onClick={() => onSort("custo")}
              >
                <span className="inline-flex items-center gap-1">
                  Custo <SortIcon field="custo" />
                </span>
              </th>
              <th className="px-3 py-2 font-semibold text-slate-500">Progresso</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(([grupo, items]) => (
              <>
                <tr key={`g-${grupo}`}>
                  <td colSpan={8} className="border-b border-slate-100 bg-slate-50/80 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {grupo}
                      </span>
                      <span className="text-[10px] text-slate-400">{items.length} itens</span>
                    </div>
                  </td>
                </tr>
                {items.map((item) => {
                  seq++;
                  const st = STATUS_CONFIG[item.status as StatusKey];
                  const duracao = item.duracao_dias ?? projeto.duracao_padrao_dias;
                  return (
                    <tr
                      key={item.id}
                      className="fade-up border-b border-slate-50 transition-colors hover:bg-blue-50/30"
                      style={{ animationDelay: `${Math.min(seq * 30, 400)}ms` }}
                    >
                      <td className="px-3 py-2 text-[11px] text-slate-400">
                        {String(seq).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-slate-700">{item.nome}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bgColor} ${st.textColor}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dotColor}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">
                        {formatDate(item.data_inicio_calculada)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">
                        {formatDate(item.data_termino_calculada)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">{duracao}d</td>
                      <td className="px-3 py-2 text-[11px] text-green-600">
                        {item.custo_material ? formatCurrency(item.custo_material) : "--"}
                      </td>
                      <td className="px-3 py-2">
                        <ItemProgress item={item} />
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── CARD VIEW (mobile/tablet) ── */}
      <div className="space-y-2 lg:hidden">
        {grupos.map(([grupo, items]) => (
          <div key={grupo}>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {grupo}
              </h3>
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] text-slate-400">{items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((item) => {
                seq++;
                const st = STATUS_CONFIG[item.status as StatusKey];
                const duracao = item.duracao_dias ?? projeto.duracao_padrao_dias;
                const pct =
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
                    className="fade-up rounded-lg border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md"
                    style={{ animationDelay: `${Math.min(seq * 30, 400)}ms` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                        {String(seq).padStart(2, "0")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {item.nome}
                          </p>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${st.bgColor} ${st.textColor}`}
                          >
                            <span className={`h-1 w-1 rounded-full ${st.dotColor}`} />
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: st.color,
                            }}
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          <span className="inline-flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />{" "}
                            {formatDate(item.data_inicio_calculada)}
                          </span>
                          <span>→</span>
                          <span className="inline-flex items-center gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5" />{" "}
                            {formatDate(item.data_termino_calculada)}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>{duracao}d</span>
                          {item.custo_material ? (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="inline-flex items-center gap-0.5 text-green-600">
                                <DollarSign className="h-2.5 w-2.5" />{" "}
                                {formatCurrency(item.custo_material)}
                              </span>
                            </>
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
      const label = current.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });
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
              className={`flex border-b border-slate-100 transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
              } hover:bg-blue-50/30`}
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
                  className="absolute top-2 overflow-hidden rounded-md"
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
