import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Printer, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";

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
};

type PontoTendencia = {
  mes: string;
  preventiva: number;
  corretiva: number;
};

const JANELAS = [3, 6, 12, 24];

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
};

const ORDEM_STATUS: Record<string, number> = {
  critico_so_emergencial: 0,
  parado: 1,
  atrasado: 2,
  normal: 3,
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
];

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
    default:
      return "";
  }
}

export function AnaliticoManutencao() {
  const [janelaMeses, setJanelaMeses] = useState<number>(12);
  const [dados, setDados] = useState<LinhaAnalitico[]>([]);
  const [tendencia, setTendencia] = useState<PontoTendencia[]>([]);
  const [emergenciais30dias, setEmergenciais30dias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);
  const [exportando, setExportando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [res, tend, emerg] = await Promise.all([
        supabase.rpc("analitico_manutencao", { janela_meses: janelaMeses }),
        supabase.rpc("analitico_tendencia_mensal", { ultimos_meses: 24 }),
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
  }, [janelaMeses]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const contagemStatus = useMemo(() => {
    const c: Record<string, number> = {
      normal: 0,
      atrasado: 0,
      parado: 0,
      critico_so_emergencial: 0,
    };
    for (const d of dados) {
      c[d.status_plano] = (c[d.status_plano] ?? 0) + 1;
    }
    return c;
  }, [dados]);

  const linhasFiltradas = useMemo(() => {
    let list = dados;
    if (statusSelecionados.length) {
      const set = new Set(statusSelecionados);
      list = list.filter((l) => set.has(l.status_plano));
    }
    return [...list].sort((a, b) => {
      const sa = ORDEM_STATUS[a.status_plano] ?? 99;
      const sb = ORDEM_STATUS[b.status_plano] ?? 99;
      if (sa !== sb) return sa - sb;
      const da = a.dias_sem_preventiva_valida ?? Number.MAX_SAFE_INTEGER;
      const db = b.dias_sem_preventiva_valida ?? Number.MAX_SAFE_INTEGER;
      return db - da;
    });
  }, [dados, statusSelecionados]);

  const criticos = useMemo(
    () => linhasFiltradas.filter((l) => l.status_plano === "critico_so_emergencial"),
    [linhasFiltradas],
  );

  const toggleStatus = (s: string) => {
    setStatusSelecionados((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
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
    <div>
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
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
              <BarChart data={tendencia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number | string, name: string) => [
                    String(value),
                    name === "preventiva" ? "Preventiva válida" : "Corretiva",
                  ]}
                />
                <Legend
                  formatter={(value: string) =>
                    value === "preventiva" ? "Preventiva válida" : "Corretiva"
                  }
                />
                <Bar dataKey="preventiva" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="corretiva" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela ranqueada */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40">
                {CABECALHO_COLUNAS.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                  >
                    {col}
                  </th>
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
                      {l.nome || l.planta || `#${l.elevatoria_id}`}
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
    </div>
  );
}

export default AnaliticoManutencao;
