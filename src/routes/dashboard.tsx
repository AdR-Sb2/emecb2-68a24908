import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import logoHeader from "@/assets/logo-branca.png";
import rawData from "@/data/elevatorias.json";
import { Home, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Eletromecânica · Dashboard de Elevatórias" },
      {
        name: "description",
        content:
          "Painel de automação das elevatórias: sensores, CLP/PCP, ELIPSE e comissionamento por município.",
      },
    ],
  }),
  component: DashboardPage,
});

type Row = {
  ELEVATORIAS: string | null;
  PLANTA: string | null;
  TIPO: string | null;
  MUNICIPIO: string | null;
  "TIPO CONSTRUTIVO DA ELEVATORIA": string | null;
  "TEM CLP?": string | null;
  "TEM PCP?": string | null;
  "TEM CHIP?": string | null;
  SENSORES: number | null;
  ELIPSE: string | null;
  QA: number | null;
  OBS: string | null;
  "TEM SENSOR?": string | null;
};

const DATA = rawData as Row[];
const STORAGE_KEY = "elevatorias_data_v1";

const BLUE = "#1f7ad6";
const BLUE_DARK = "#0b3a73";
const BLUE_LIGHT = "#9ec8ee";

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function countBy<T extends string | number>(rows: Row[], key: (r: Row) => T | null | undefined) {
  const map = new Map<T, number>();
  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined || k === "") continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function DashboardPage() {
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
    () => Array.from(new Set(data.map((d) => d.TIPO).filter(Boolean))) as string[],
    [data],
  );

  const [tipo, setTipo] = useState<string>("EAT");
  const [municipio, setMunicipio] = useState<string>("TODOS");
  const [aguardandoFilter, setAguardandoFilter] = useState<string>("TODOS");
  const [sensorFilter, setSensorFilter] = useState<string>("TODOS");
  const [search, setSearch] = useState<string>("");
  const [tableExpanded, setTableExpanded] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () =>
      data.filter((d) => {
        if (tipo !== "TODOS" && d.TIPO !== tipo) return false;
        if (municipio !== "TODOS" && d.MUNICIPIO !== municipio) return false;
        if (aguardandoFilter !== "TODOS") {
          const isAguardando =
            (d["TEM CLP?"] === "SIM" || d["TEM SENSOR?"] === "SIM") && d.ELIPSE !== "SIM";
          if (aguardandoFilter === "SIM" && !isAguardando) return false;
          if (aguardandoFilter === "NAO" && isAguardando) return false;
        }
        if (sensorFilter !== "TODOS") {
          const has = d["TEM SENSOR?"] === "SIM";
          if (sensorFilter === "SIM" && !has) return false;
          if (sensorFilter === "NAO" && has) return false;
        }
        return true;
      }),
    [data, tipo, municipio, aguardandoFilter, sensorFilter],
  );

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.ELEVATORIAS, r.PLANTA, r.MUNICIPIO, r["TIPO CONSTRUTIVO DA ELEVATORIA"]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const MUNICIPIOS = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .filter((d) => tipo === "TODOS" || d.TIPO === tipo)
            .map((d) => d.MUNICIPIO)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [data, tipo],
  );

  const total = rows.length;
  const comPA = rows.filter((r) => r["TEM CLP?"] === "SIM").length;
  const comPCP = rows.filter((r) => r["TEM PCP?"] === "SIM").length;
  const comSensores = rows.filter((r) => r["TEM SENSOR?"] === "SIM").length;
  const automatizados = rows.filter(
    (r) => r["TEM CLP?"] === "SIM" || r["TEM SENSOR?"] === "SIM",
  ).length;
  const elipseSim = rows.filter((r) => r.ELIPSE === "SIM").length;
  const aguardando = rows.filter(
    (r) => (r["TEM CLP?"] === "SIM" || r["TEM SENSOR?"] === "SIM") && r.ELIPSE !== "SIM",
  ).length;

  // Metas (% alvo de cobertura)
  const METAS = { automatizados: 80, elipse: 70, sensores: 80 } as const;
  const automatizadosPct = total ? Math.round((automatizados / total) * 100) : 0;
  const elipsePct = total ? Math.round((elipseSim / total) * 100) : 0;
  const sensoresPct = total ? Math.round((comSensores / total) * 100) : 0;

  const sensorData = [
    { name: "SIM", value: comSensores, color: BLUE_DARK },
    { name: "NÃO", value: total - comSensores, color: BLUE },
  ];

  const municipios = useMemo(() => {
    const m = countBy(rows, (r) => r.MUNICIPIO);
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const tiposConstr = useMemo(() => {
    const m = countBy(rows, (r) => r["TIPO CONSTRUTIVO DA ELEVATORIA"]);
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const clpPorCidade = useMemo(() => {
    const byCity = new Map<string, { total: number; com: number }>();
    for (const r of rows) {
      if (!r.MUNICIPIO) continue;
      const cur = byCity.get(r.MUNICIPIO) ?? { total: 0, com: 0 };
      cur.total += 1;
      if (r["TEM CLP?"] === "SIM" || r["TEM PCP?"] === "SIM") cur.com += 1;
      byCity.set(r.MUNICIPIO, cur);
    }
    return Array.from(byCity.entries())
      .map(([name, v]) => ({ name, pct: Math.round((v.com / v.total) * 1000) / 10 }))
      .sort((a, b) => b.pct - a.pct);
  }, [rows]);

  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });
      if (!json.length) {
        alert("Planilha vazia ou inválida.");
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
      setData(json);
      setHasCustomData(true);
      alert(`Planilha atualizada com ${json.length} registros.`);
    } catch (err) {
      console.error(err);
      alert("Falha ao ler a planilha.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
      {/* Header com logo */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 shrink-0 items-center justify-center rounded-2xl">
              <img
                src={logoHeader}
                alt="Águas do Rio - Eletromecânica"
                className="h-14 w-auto object-contain"
                loading="eager"
              />
            </div>
            <div className="min-w-0 text-white">
              <p className="truncate text-lg font-semibold">Águas do Rio</p>
              <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Painéis operacionais</p>
            </div>
          </div>
          <Link
            to="/"
            title="Voltar ao Hub"
            aria-label="Voltar ao Hub"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white sm:h-9 sm:w-9"
          >
            <Home className="h-5 w-5 sm:h-4 sm:w-4" />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Kpi label="Total de Ativos" value={total} />
        <Kpi label="Com PA" value={comPA} />
        <Kpi label="Com PCP" value={comPCP} />
        <Kpi
          label="Com Sensores"
          value={`${comSensores} (${sensoresPct}%)`}
          progress={{ pct: sensoresPct, meta: METAS.sensores }}
        />
        <Kpi
          label="Ativos Automatizados (%)"
          value={`${automatizadosPct}%`}
          progress={{ pct: automatizadosPct, meta: METAS.automatizados }}
        />
        <Kpi label="Elevatórias no ELIPSE" value={elipseSim} />
        <Kpi
          label="Elevatórias no Elipse (%)"
          value={`${elipsePct}%`}
          progress={{ pct: elipsePct, meta: METAS.elipse }}
        />
        <Kpi label="Aguardando Comissionamento" value={aguardando} />
      </div>

      {/* Filters — mobile collapsible */}
      <details className="mb-4 rounded-md border border-slate-200 bg-white shadow-sm sm:hidden dark:border-slate-700 dark:bg-slate-800">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0b3a73] dark:text-white" /> Filtros
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-400">toque para expandir</span>
        </summary>
        <div className="grid gap-3 border-t border-slate-100 p-3 dark:border-slate-700">
          {[
            { label: "TIPO", value: tipo, set: setTipo, opts: ["TODOS", ...TIPOS] },
            {
              label: "MUNICÍPIO",
              value: municipio,
              set: setMunicipio,
              opts: ["TODOS", ...MUNICIPIOS],
            },
            {
              label: "AGUARDANDO COMISSIONAMENTO",
              value: aguardandoFilter,
              set: setAguardandoFilter,
              opts: ["TODOS", "SIM", "NAO"],
            },
            {
              label: "TEM SENSOR?",
              value: sensorFilter,
              set: setSensorFilter,
              opts: ["TODOS", "SIM", "NAO"],
            },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                {f.label}
              </label>
              <select
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-base shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {f.opts.map((o) => (
                  <option key={o} value={o}>
                    {o === "TODOS" ? "Todos" : o === "NAO" ? "Não" : o === "SIM" ? "Sim" : o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </details>

      {/* Filters — desktop row */}
      <div className="mb-4 hidden flex-wrap items-center gap-3 sm:flex">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">TIPO</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="TODOS">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">MUNICÍPIO</label>
          <select
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="TODOS">Todos</option>
            {MUNICIPIOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">AGUARDANDO COMISSIONAMENTO</label>
          <select
            value={aguardandoFilter}
            onChange={(e) => setAguardandoFilter(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="TODOS">Todos</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Não</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">TEM SENSOR?</label>
          <select
            value={sensorFilter}
            onChange={(e) => setSensorFilter(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="TODOS">Todos</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Não</option>
          </select>
        </div>
        {(tipo !== "TODOS" ||
          municipio !== "TODOS" ||
          aguardandoFilter !== "TODOS" ||
          sensorFilter !== "TODOS") && (
          <button
            type="button"
            onClick={() => {
              setTipo("TODOS");
              setMunicipio("TODOS");
              setAguardandoFilter("TODOS");
              setSensorFilter("TODOS");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Distribuição de Sensores nas Elevatórias">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={sensorData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                label={(d: { value: number }) => `${d.value} (${pct(d.value, total)})`}
              >
                {sensorData.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Total de elevatórias por município">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={municipios} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={BLUE}>
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 14, fontWeight: 700, fill: "#0b3a73" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Total de elevatórias por tipo construtivo">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tiposConstr} margin={{ left: 10, right: 20, top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={BLUE}>
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: 14, fontWeight: 700, fill: "#0b3a73" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className={`mb-4 grid gap-4 ${tableExpanded ? "" : "lg:grid-cols-3"}`}>
        <div className={tableExpanded ? "" : "lg:col-span-2"}>
          <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tabela de Elevatórias</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar elevatória, planta, município..."
                   className="w-64 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-sm focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setTableExpanded((v) => !v)}
                  title={tableExpanded ? "Recolher tabela" : "Expandir tabela"}
                  aria-label={tableExpanded ? "Recolher tabela" : "Expandir tabela"}
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
            <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Mostrando {tableRows.length} de {data.length} ativos
            </div>
            <div className={`${tableExpanded ? "max-h-[70vh]" : "max-h-[360px]"} overflow-auto`}>
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 dark:bg-slate-700">Elevatória</th>
                    <th className="px-2 py-1.5">Planta</th>
                    <th className="px-2 py-1.5">Município</th>
                    <th className="px-2 py-1.5">Construção</th>
                    <th className="px-2 py-1.5">CLP</th>
                    <th className="px-2 py-1.5">PCP</th>
                    <th className="px-2 py-1.5">Sens.</th>
                    <th className="px-2 py-1.5">Elipse</th>
                    <th className="px-2 py-1.5">Sensor?</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-700">
                      <td className="sticky left-0 z-10 bg-white px-2 py-1 shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:bg-slate-800">
                        {r.ELEVATORIAS}
                      </td>
                      <td className="px-2 py-1 dark:border-slate-700">{r.PLANTA}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r.MUNICIPIO}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r["TIPO CONSTRUTIVO DA ELEVATORIA"]}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r["TEM CLP?"] ?? ""}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r["TEM PCP?"] ?? ""}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r.SENSORES ?? ""}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r.ELIPSE ?? ""}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r["TEM SENSOR?"] ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {!tableExpanded && (
          <Card title="Relação de elevatórias com CLP/PCP por cidade (%)">
            <ResponsiveContainer width="100%" height={Math.max(340, clpPorCidade.length * 28)}>
              <BarChart
                data={clpPorCidade}
                layout="vertical"
                margin={{ left: 10, right: 50, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="pct" fill={BLUE}>
                  <LabelList
                    dataKey="pct"
                    position="right"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontSize: 13, fontWeight: 700, fill: "#0b3a73" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Fonte: Relação Automação de Elevatórias · {data.length} registros · TIPO: {tipo} ·
        MUNICÍPIO: {municipio}
      </p>

      {/* Hidden upload trigger (bottom-right) */}
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
          className="fixed bottom-2 right-7 rounded bg-white/80 px-2 py-0.5 text-[10px] text-slate-500 shadow-sm hover:bg-white dark:text-slate-400"
        >
          restaurar
        </button>
      )}
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
  progress?: { pct: number; meta: number };
}) {
  const status = progress
    ? progress.pct >= progress.meta
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
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      {progress && (
        <div className="mt-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full ${statusColor}`}
              style={{ width: `${Math.min(100, progress.pct)}%` }}
            />
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Meta: {progress.meta}%
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
    <div className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className ?? ""}`}>
      <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      {children}
    </div>
  );
}
