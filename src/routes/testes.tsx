import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import logoAsset from "@/assets/logo-eletromecanica.png.asset.json";
import rawData from "@/data/testes.json";

export const Route = createFileRoute("/testes")({
  head: () => ({
    meta: [
      { title: "Eletromecânica · Testes e Aferições" },
      {
        name: "description",
        content:
          "Painel de testes e aferições dos ativos: serviços, equipes e parâmetros operacionais.",
      },
    ],
  }),
  component: TestesPage,
});

type Row = {
  Id: number | null;
  "Hora de início": string | null;
  "Hora de conclusão": string | null;
  Email: string | null;
  Nome: string | null;
  "Data do Teste": string | null;
  "Tipo de Serviço": string | null;
  Elevatória: string | null;
  Grupo: string | number | null;
  "Tensão ( V )": string | null;
  "Corrente ( A )": string | null;
  Retaguarda: string | null;
  Recalque: string | null;
  "Corrente ShutOff": string | null;
  "Retaguarda ShutOff": string | null;
  "Recalque ShutOff": string | null;
  "Impossibilidade:": string | null;
  "Serviço Executado:": string | null;
  "Nome dos Colaboradores:": string | null;
  "Observação:": string | null;
  "Na Chegada": string | null;
  "Na saida": string | null;
  Status: string | null;
};

const DATA = rawData as Row[];
const STORAGE_KEY = "testes_data_v1";

const BLUE = "#1f7ad6";
const BLUE_DARK = "#0b3a73";
const BLUE_LIGHT = "#9ec8ee";

function parseNumeric(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(",", ".");
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function monthKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function TestesPage() {
  const [data, setData] = useState<Row[]>(DATA);
  const [hasCustomData, setHasCustomData] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Row[];
        if (Array.isArray(parsed) && parsed.length) {
          setData(parsed);
          setHasCustomData(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const TIPOS = useMemo(
    () =>
      Array.from(new Set(data.map((d) => d["Tipo de Serviço"]).filter(Boolean))) as string[],
    [data],
  );
  const GRUPOS = useMemo(
    () =>
      Array.from(new Set(data.map((d) => (d.Grupo ? String(d.Grupo) : null)).filter(Boolean)))
        .sort() as string[],
    [data],
  );
  const ELEVS = useMemo(
    () => Array.from(new Set(data.map((d) => d.Elevatória).filter(Boolean))).sort() as string[],
    [data],
  );

  const [tipo, setTipo] = useState<string>("TODOS");
  const [grupo, setGrupo] = useState<string>("TODOS");
  const [elev, setElev] = useState<string>("TODOS");
  const [statusF, setStatusF] = useState<string>("TODOS");
  const [search, setSearch] = useState<string>("");
  const [tableExpanded, setTableExpanded] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () =>
      data.filter((d) => {
        if (tipo !== "TODOS" && d["Tipo de Serviço"] !== tipo) return false;
        if (grupo !== "TODOS" && String(d.Grupo ?? "") !== grupo) return false;
        if (elev !== "TODOS" && d.Elevatória !== elev) return false;
        if (statusF !== "TODOS") {
          const s = (d.Status ?? "").toLowerCase();
          if (statusF === "AUTO" && !s.startsWith("autom")) return false;
          if (statusF === "MAN" && !s.startsWith("man")) return false;
        }
        return true;
      }),
    [data, tipo, grupo, elev, statusF],
  );

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.Elevatória,
        r["Tipo de Serviço"],
        r["Nome dos Colaboradores:"],
        r["Serviço Executado:"],
        r["Observação:"],
        r.Nome,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  // KPIs
  const total = rows.length;
  const ativosUnicos = new Set(rows.map((r) => r.Elevatória).filter(Boolean)).size;
  const automaticos = rows.filter((r) => (r.Status ?? "").toLowerCase().startsWith("autom"))
    .length;
  const manuais = rows.filter((r) => (r.Status ?? "").toLowerCase().startsWith("man")).length;
  const totalStatus = automaticos + manuais;
  const autoPct = totalStatus ? Math.round((automaticos / totalStatus) * 100) : 0;
  const manualPct = totalStatus ? 100 - autoPct : 0;
  const impossiveis = rows.filter((r) => r["Impossibilidade:"] && String(r["Impossibilidade:"]).trim()).length;
  const impossPct = total ? Math.round((impossiveis / total) * 100) : 0;

  // Evolução temporal
  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = monthKey(r["Data do Teste"]);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));
  }, [rows]);

  // Por tipo de serviço
  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = r["Tipo de Serviço"];
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [rows]);

  // Top elevatórias
  const topElev = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (!r.Elevatória) continue;
      m.set(r.Elevatória, (m.get(r.Elevatória) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [rows]);

  // Status pie
  const statusData = [
    { name: "Automático", value: automaticos, color: BLUE_DARK },
    { name: "Manual", value: manuais, color: BLUE },
    { name: "Sem status", value: rows.length - automaticos - manuais, color: BLUE_LIGHT },
  ].filter((s) => s.value > 0);

  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      if (!json.length) {
        alert("Planilha vazia ou inválida.");
        return;
      }
      // normalize header for "Corrente ShutOff\n"
      const norm = json.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          const nk = k.replace(/\n/g, "").trim();
          let nv: unknown = v;
          if (v instanceof Date) nv = v.toISOString();
          out[nk] = nv;
        }
        return out;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(norm));
      setData(norm as Row[]);
      setHasCustomData(true);
      alert(`Planilha atualizada com ${norm.length} registros.`);
    } catch (err) {
      console.error(err);
      alert("Falha ao ler a planilha.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header com logo */}
      <div className="mb-4 overflow-hidden rounded-md shadow">
        <img
          src={logoAsset.url}
          alt="Águas do Rio - Eletromecânica"
          className="w-full object-cover"
          width={1024}
          height={160}
          loading="eager"
        />
      </div>
      <h1 className="mb-3 text-lg font-bold text-[#0b3a73]">Testes & Aferições de Ativos</h1>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Kpi label="Total de Testes" value={total} />
        <Kpi label="Ativos Atendidos" value={ativosUnicos} />
        <Kpi label="Automáticos" value={`${automaticos} (${autoPct}%)`} />
        <Kpi label="Manuais" value={`${manuais} (${manualPct}%)`} />
        <Kpi
          label="Índice de Impossibilidade"
          value={`${impossPct}%`}
          progress={{ pct: impossPct, meta: 5, lowerIsBetter: true }}
        />
        <Kpi label="Testes com Impossibilidade" value={impossiveis} />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect label="TIPO DE SERVIÇO" value={tipo} onChange={setTipo} options={TIPOS} />
        <FilterSelect label="GRUPO" value={grupo} onChange={setGrupo} options={GRUPOS} />
        <FilterSelect label="ELEVATÓRIA" value={elev} onChange={setElev} options={ELEVS} />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">STATUS</label>
          <select
            value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            <option value="TODOS">Todos</option>
            <option value="AUTO">Automático</option>
            <option value="MAN">Manual</option>
          </select>
        </div>
        {(tipo !== "TODOS" || grupo !== "TODOS" || elev !== "TODOS" || statusF !== "TODOS") && (
          <button
            type="button"
            onClick={() => {
              setTipo("TODOS");
              setGrupo("TODOS");
              setElev("TODOS");
              setStatusF("TODOS");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Evolução de testes ao longo do tempo">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={porMes} margin={{ left: 10, right: 20, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={BLUE}
                strokeWidth={2.5}
                dot={{ r: 4, fill: BLUE_DARK }}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: 11, fontWeight: 700, fill: BLUE_DARK }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Total por tipo de serviço">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porTipo} margin={{ left: 10, right: 20, top: 16, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={BLUE}>
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: 14, fontWeight: 700, fill: BLUE_DARK }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Manual vs Automático">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                label={(d: { value: number }) =>
                  totalStatus ? `${d.value} (${Math.round((d.value / (rows.length || 1)) * 100)}%)` : d.value
                }
              >
                {statusData.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 — Top elevatórias */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Top 10 elevatórias com mais intervenções">
          <ResponsiveContainer width="100%" height={Math.max(320, topElev.length * 32)}>
            <BarChart data={topElev} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill={BLUE}>
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 13, fontWeight: 700, fill: BLUE_DARK }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Parâmetros: Operação Normal × Shut-Off">
          <div className="max-h-[340px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-2 py-1.5">Elevatória</th>
                  <th className="px-2 py-1.5">Tensão (V)</th>
                  <th className="px-2 py-1.5">Corrente (A)</th>
                  <th className="px-2 py-1.5">Corr. ShutOff</th>
                  <th className="px-2 py-1.5">Retaguarda</th>
                  <th className="px-2 py-1.5">Ret. ShutOff</th>
                  <th className="px-2 py-1.5">Recalque</th>
                  <th className="px-2 py-1.5">Rec. ShutOff</th>
                </tr>
              </thead>
              <tbody>
                {tableRows
                  .filter(
                    (r) =>
                      r["Tensão ( V )"] ||
                      r["Corrente ( A )"] ||
                      r.Retaguarda ||
                      r.Recalque ||
                      r["Corrente ShutOff"] ||
                      r["Retaguarda ShutOff"] ||
                      r["Recalque ShutOff"],
                  )
                  .map((r, i) => {
                    const corr = parseNumeric(r["Corrente ( A )"]);
                    const corrSO = parseNumeric(r["Corrente ShutOff"]);
                    const corrAlert = corr !== null && corrSO !== null && corr >= corrSO;
                    return (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-1 font-medium">{r.Elevatória}</td>
                        <td className="px-2 py-1">{r["Tensão ( V )"] ?? ""}</td>
                        <td className={`px-2 py-1 ${corrAlert ? "text-rose-600 font-semibold" : ""}`}>
                          {r["Corrente ( A )"] ?? ""}
                        </td>
                        <td className="px-2 py-1">{r["Corrente ShutOff"] ?? ""}</td>
                        <td className="px-2 py-1">{r.Retaguarda ?? ""}</td>
                        <td className="px-2 py-1">{r["Retaguarda ShutOff"] ?? ""}</td>
                        <td className="px-2 py-1">{r.Recalque ?? ""}</td>
                        <td className="px-2 py-1">{r["Recalque ShutOff"] ?? ""}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Tabela detalhada — equipes e serviços */}
      <div className="mb-4">
        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Controle de Equipes e Serviços
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar elevatória, colaborador, serviço..."
                className="w-72 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-sm focus:border-blue-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setTableExpanded((v) => !v)}
                title={tableExpanded ? "Recolher tabela" : "Expandir tabela"}
                aria-label={tableExpanded ? "Recolher tabela" : "Expandir tabela"}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {tableExpanded ? (
                    <>
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </>
                  ) : (
                    <>
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
          <div className="mb-2 text-xs text-slate-500">
            Mostrando {tableRows.length} de {data.length} testes
          </div>
          <div className={`${tableExpanded ? "max-h-[70vh]" : "max-h-[380px]"} overflow-auto`}>
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-2 py-1.5">Data</th>
                  <th className="px-2 py-1.5">Elevatória</th>
                  <th className="px-2 py-1.5">Grupo</th>
                  <th className="px-2 py-1.5">Tipo</th>
                  <th className="px-2 py-1.5">Colaboradores</th>
                  <th className="px-2 py-1.5">Serviço Executado</th>
                  <th className="px-2 py-1.5">Observação</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-2 py-1 whitespace-nowrap">
                      {r["Data do Teste"] ? new Date(r["Data do Teste"]).toLocaleDateString("pt-BR") : ""}
                    </td>
                    <td className="px-2 py-1">{r.Elevatória}</td>
                    <td className="px-2 py-1">{r.Grupo}</td>
                    <td className="px-2 py-1">{r["Tipo de Serviço"]}</td>
                    <td className="px-2 py-1">{r["Nome dos Colaboradores:"]}</td>
                    <td className="px-2 py-1 max-w-xs">{r["Serviço Executado:"]}</td>
                    <td className="px-2 py-1 max-w-xs">{r["Observação:"]}</td>
                    <td className="px-2 py-1">{r.Status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Fonte: Testes & Aferições de Ativos · {data.length} registros
      </p>

      {/* Hidden upload trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="Atualizar planilha"
        aria-label="Atualizar planilha"
        className="fixed bottom-2 right-2 h-3 w-3 rounded-full bg-slate-300/30 opacity-30 transition hover:scale-150 hover:bg-blue-500 hover:opacity-100"
      />
      {hasCustomData && (
        <button
          type="button"
          onClick={() => {
            window.localStorage.removeItem(STORAGE_KEY);
            setData(DATA);
            setHasCustomData(false);
          }}
          title="Restaurar planilha original"
          className="fixed bottom-2 right-7 rounded bg-white/80 px-2 py-0.5 text-[10px] text-slate-500 shadow-sm hover:bg-white"
        >
          restaurar
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[260px] truncate rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
      >
        <option value="TODOS">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Kpi({
  label,
  value,
  progress,
}: {
  label: string;
  value: string | number;
  progress?: { pct: number; meta: number; lowerIsBetter?: boolean };
}) {
  const status = progress
    ? progress.lowerIsBetter
      ? progress.pct <= progress.meta
        ? "ok"
        : progress.pct <= progress.meta * 1.5
          ? "warn"
          : "bad"
      : progress.pct >= progress.meta
        ? "ok"
        : progress.pct >= progress.meta * 0.7
          ? "warn"
          : "bad"
    : null;
  const statusColor =
    status === "ok"
      ? "bg-emerald-500"
      : status === "warn"
        ? "bg-amber-500"
        : status === "bad"
          ? "bg-rose-500"
          : "bg-slate-300";
  const valueColor =
    status === "ok"
      ? "text-emerald-700"
      : status === "warn"
        ? "text-amber-700"
        : status === "bad"
          ? "text-rose-700"
          : "text-[#0b3a73]";
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      {progress && (
        <div className="mt-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full ${statusColor}`}
              style={{ width: `${Math.min(100, progress.pct)}%` }}
            />
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            Meta: {progress.lowerIsBetter ? "≤ " : ""}
            {progress.meta}%
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm ${className ?? ""}`}>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}