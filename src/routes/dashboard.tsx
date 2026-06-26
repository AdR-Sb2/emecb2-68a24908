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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import logoAsset from "@/assets/logo-eletromecanica.png.asset.json";
import rawData from "@/data/elevatorias.json";

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
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Row[];
        if (Array.isArray(parsed) && parsed.length) setData(parsed);
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
      data.filter(
        (d) => {
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
        },
      ),
    [data, tipo, municipio, aguardandoFilter, sensorFilter],
  );

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.ELEVATORIAS,
        r.PLANTA,
        r.MUNICIPIO,
        r["TIPO CONSTRUTIVO DA ELEVATORIA"],
      ]
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
      alert(`Planilha atualizada com ${json.length} registros.`);
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

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Kpi label="Total de Ativos" value={total} />
        <Kpi label="Com PA" value={comPA} />
        <Kpi label="Com PCP" value={comPCP} />
        <Kpi
          label="Com Sensores"
          value={comSensores}
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

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">TIPO</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
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
          <label className="text-sm font-medium text-slate-700">MUNICÍPIO</label>
          <select
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
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
          <label className="text-sm font-medium text-slate-700">AGUARDANDO COMISSIONAMENTO</label>
          <select
            value={aguardandoFilter}
            onChange={(e) => setAguardandoFilter(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            <option value="TODOS">Todos</option>
            <option value="SIM">Sim</option>
            <option value="NAO">Não</option>
          </select>
        </div>
        {(tipo !== "TODOS" || municipio !== "TODOS" || aguardandoFilter !== "TODOS") && (
          <button
            type="button"
            onClick={() => {
              setTipo("TODOS");
              setMunicipio("TODOS");
              setAguardandoFilter("TODOS");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-100"
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
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Tabela de Elevatórias" className="lg:col-span-2">
          <div className="mb-2 text-xs text-slate-500">
            Mostrando {rows.length} de {DATA.length} ativos
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-2 py-1.5">Elevatória</th>
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
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1">{r.ELEVATORIAS}</td>
                    <td className="px-2 py-1">{r.PLANTA}</td>
                    <td className="px-2 py-1">{r.MUNICIPIO}</td>
                    <td className="px-2 py-1">{r["TIPO CONSTRUTIVO DA ELEVATORIA"]}</td>
                    <td className="px-2 py-1">{r["TEM CLP?"] ?? ""}</td>
                    <td className="px-2 py-1">{r["TEM PCP?"] ?? ""}</td>
                    <td className="px-2 py-1">{r.SENSORES ?? ""}</td>
                    <td className="px-2 py-1">{r.ELIPSE ?? ""}</td>
                    <td className="px-2 py-1">{r["TEM SENSOR?"] ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

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
      </div>

      <p className="text-center text-xs text-slate-500">
        Fonte: Relação Automação de Elevatórias · {DATA.length} registros · TIPO: {tipo} ·
        MUNICÍPIO: {municipio}
      </p>
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
          <div className="mt-0.5 text-[9px] text-slate-400">Meta: {progress.meta}%</div>
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