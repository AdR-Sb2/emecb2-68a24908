import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarRange, Loader2, AlertTriangle, Download, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CronogramaProjeto, CronogramaItem } from "@/lib/cronograma-types";
import { STATUS_OPCOES, STATUS_CORES } from "@/lib/cronograma-types";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/cronograma/publico/$token")({
  component: PublicoCronogramaPage,
  head: () => ({
    meta: [
      { title: "Cronograma · Modo Apresentação" },
      { name: "description", content: "Cronograma compartilhado" },
    ],
  }),
});

const CORES_GRUPO = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#d946ef",
  "#eab308",
  "#64748b",
  "#0ea5e9",
];

function obterCorGrupo(grupo: string, cache: Map<string, string>): string {
  if (cache.has(grupo)) return cache.get(grupo)!;
  const idx = cache.size % CORES_GRUPO.length;
  const cor = CORES_GRUPO[idx];
  cache.set(grupo, cor);
  return cor;
}

function formatDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
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

function grupoLabel(grupo: string, label: string): string {
  return grupo || `(sem ${label.toLowerCase()})`;
}

function PublicoCronogramaPage() {
  const { token } = Route.useParams();
  const [projeto, setProjeto] = useState<CronogramaProjeto | null>(null);
  const [itens, setItens] = useState<CronogramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [zoom, setZoom] = useState<"semana" | "mes">("mes");

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

  function exportarPDF() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  if (erro || !projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900 p-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
            Cronograma não encontrado
          </h2>
          <p className="text-sm text-slate-400">{erro || "O link pode ter sido revogado."}</p>
        </div>
      </div>
    );
  }

  const cacheCores = new Map<string, string>();
  const grupos = [...new Set(itens.map((i) => i.grupo))].sort();
  const totalDias = itens.reduce(
    (sum, i) => sum + (i.duracao_dias ?? projeto.duracao_padrao_dias),
    0,
  );
  const dataConclusao = itens.length > 0 ? itens[itens.length - 1]?.data_termino_calculada : null;
  const statusCount = {
    nao_iniciado: itens.filter((i) => i.status === "nao_iniciado").length,
    em_andamento: itens.filter((i) => i.status === "em_andamento").length,
    concluido: itens.filter((i) => i.status === "concluido").length,
    atrasado: itens.filter((i) => i.status === "atrasado").length,
  };

  const dataMin =
    itens.length > 0
      ? itens.reduce(
          (min, i) =>
            i.data_inicio_calculada && i.data_inicio_calculada < min
              ? i.data_inicio_calculada
              : min,
          itens[0]?.data_inicio_calculada || "",
        )
      : projeto.data_inicio_base;
  const dataMax =
    itens.length > 0
      ? itens.reduce(
          (max, i) =>
            i.data_termino_calculada && i.data_termino_calculada > max
              ? i.data_termino_calculada
              : max,
          itens[0]?.data_termino_calculada || "",
        )
      : addDays(projeto.data_inicio_base, projeto.duracao_padrao_dias);

  const diasTotais = dataMin && dataMax ? diffDays(dataMin, dataMax) + 1 : 1;
  const colWidth = zoom === "semana" ? 32 : 16;
  const ganttWidth = Math.max(diasTotais * colWidth, 600);

  function diaOffset(data: string): number {
    return dataMin ? diffDays(dataMin, data) : 0;
  }

  function renderHeader() {
    if (!dataMin) return null;
    const inicio = new Date(dataMin + "T12:00:00");
    const fim = new Date(dataMax + "T12:00:00");
    const dias: string[] = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      dias.push(d.toISOString().slice(0, 10));
    }

    if (zoom === "semana") {
      let currentWeek: string[] = [];
      const weeks: string[][] = [];
      dias.forEach((d) => {
        currentWeek.push(d);
        if (new Date(d + "T12:00:00").getDay() === 6) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });
      if (currentWeek.length > 0) weeks.push(currentWeek);
      return weeks.map((week, wi) => (
        <div key={wi} className="flex" style={{ minWidth: week.length * colWidth }}>
          {week.map((d) => (
            <div
              key={d}
              className="flex-shrink-0 text-[10px] text-center leading-tight border-r border-slate-200 dark:border-slate-700"
              style={{ width: colWidth, paddingTop: 2 }}
            >
              <div>{new Date(d + "T12:00:00").getDate()}</div>
            </div>
          ))}
        </div>
      ));
    }

    const months: { label: string; days: string[] }[] = [];
    let currentMonth = "";
    let currentDays: string[] = [];
    dias.forEach((d) => {
      const m = d.slice(0, 7);
      if (m !== currentMonth) {
        if (currentDays.length > 0) months.push({ label: currentMonth, days: currentDays });
        currentMonth = m;
        currentDays = [];
      }
      currentDays.push(d);
    });
    if (currentDays.length > 0) months.push({ label: currentMonth, days: currentDays });

    return months.map((m, mi) => {
      const dt = new Date(m.days[0] + "T12:00:00");
      const label = dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      return (
        <div key={mi} className="flex" style={{ minWidth: m.days.length * colWidth }}>
          {m.days.map((d) => (
            <div
              key={d}
              className="flex-shrink-0 text-[10px] text-center leading-tight border-r border-slate-200 dark:border-slate-700"
              style={{ width: colWidth, paddingTop: 2 }}
            >
              <div>{new Date(d + "T12:00:00").getDate()}</div>
              {new Date(d + "T12:00:00").getDate() === 1 && (
                <div className="text-[9px] text-slate-400">{label}</div>
              )}
            </div>
          ))}
        </div>
      );
    });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 print:bg-white">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-lg print:bg-[#002d74]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <CalendarRange className="h-6 w-6 text-white" />
            </div>
            <div className="text-white flex-1">
              <h1 className="text-lg font-bold">{projeto.nome}</h1>
              <p className="text-sm text-cyan-50/80">
                {projeto.criado_por_nome ? `Criado por ${projeto.criado_por_nome}` : ""}
                {projeto.descricao ? ` · ${projeto.descricao}` : ""}
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => setZoom(zoom === "mes" ? "semana" : "mes")}
                className="rounded-md bg-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/30 transition"
              >
                {zoom === "mes" ? "Semana" : "Mês"}
              </button>
              <button
                onClick={exportarPDF}
                className="inline-flex items-center gap-1 rounded-md bg-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/30 transition"
              >
                <Download className="h-3 w-3" /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <p className="text-xs text-slate-400">Total de itens</p>
            <p className="text-xl font-bold text-[#0b3a73] dark:text-white">{itens.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <p className="text-xs text-slate-400">Total de dias</p>
            <p className="text-xl font-bold text-[#0b3a73] dark:text-white">{totalDias}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <p className="text-xs text-slate-400">Previsão de conclusão</p>
            <p className="text-lg font-bold text-[#0b3a73] dark:text-white">
              {formatDate(dataConclusao)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <p className="text-xs text-slate-400">Distribuição</p>
            <p className="text-lg font-bold text-[#0b3a73] dark:text-white">
              <span className="text-green-600">{statusCount.concluido}</span>/
              <span className="text-blue-600">{statusCount.em_andamento}</span>/
              <span className="text-red-600">{statusCount.atrasado}</span>/
              <span className="text-slate-400">{statusCount.nao_iniciado}</span>
            </p>
          </div>
        </div>

        {/* Legenda */}
        <div className="mb-3 flex flex-wrap gap-2">
          {grupos.map((g) => {
            const cor = obterCorGrupo(g, cacheCores);
            return (
              <div
                key={g}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs"
              >
                <div className="h-3 w-3 rounded" style={{ backgroundColor: cor }} />
                <span className="text-slate-600 dark:text-slate-300">
                  {grupoLabel(g, projeto.campo_agrupamento_label)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Gantt */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="sticky top-0 z-10 flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="flex-shrink-0 w-[280px] p-2 text-xs font-semibold text-slate-500 uppercase border-r border-slate-200 dark:border-slate-700">
              Item
            </div>
            <div className="flex overflow-hidden" style={{ minWidth: ganttWidth }}>
              {renderHeader()}
            </div>
          </div>

          {grupos.map((grupo) => {
            const itensGrupo = itens.filter((i) => i.grupo === grupo);
            if (itensGrupo.length === 0) return null;
            const corGrupo = obterCorGrupo(grupo, cacheCores);
            return (
              <div key={grupo}>
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50">
                  <div className="flex-shrink-0 w-[280px] p-2 text-xs font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: corGrupo }} />
                    {grupoLabel(grupo, projeto.campo_agrupamento_label)}
                  </div>
                  <div className="flex-1" style={{ minWidth: ganttWidth }} />
                </div>

                {itensGrupo.map((item) => {
                  const inicio = item.data_inicio_calculada || projeto.data_inicio_base;
                  const termino =
                    item.data_termino_calculada ||
                    addDays(inicio, (item.duracao_dias ?? projeto.duracao_padrao_dias) - 1);
                  const offset = diaOffset(inicio);
                  const duracao = diffDays(inicio, termino) + 1;
                  const barWidth = duracao * colWidth;
                  const cor = item.cor_grupo || corGrupo;
                  const corStatus = STATUS_CORES[item.status];

                  return (
                    <div
                      key={item.id}
                      className="flex border-b border-slate-100 dark:border-slate-700/50"
                    >
                      <div className="flex-shrink-0 w-[280px] p-2 border-r border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500">{item.grupo}</span>
                          <Badge variant="outline" className={`text-[10px] ${corStatus.text}`}>
                            {STATUS_OPCOES.find((s) => s.value === item.status)?.label}
                          </Badge>
                          <span className="text-[10px] text-slate-400">
                            {item.duracao_dias ?? projeto.duracao_padrao_dias}d
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatDate(inicio)} → {formatDate(termino)}
                        </div>
                      </div>
                      <div className="relative flex-1" style={{ minWidth: ganttWidth, height: 56 }}>
                        <div
                          className="absolute top-2 rounded h-[40px]"
                          style={{
                            left: offset * colWidth,
                            width: barWidth,
                            backgroundColor: cor + "33",
                            borderLeft: `3px solid ${cor}`,
                          }}
                        >
                          <div className="h-full flex items-center px-2 truncate">
                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">
                              {item.nome}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 print:hidden">
          <Eye className="h-3 w-3 inline mr-1" />
          Modo apresentação · link público
        </div>
      </div>
    </div>
  );
}

export default PublicoCronogramaPage;
