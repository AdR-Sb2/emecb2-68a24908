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

function parseAvg(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/,/g, ".");
  const nums = s.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return null;
  const arr = nums.map((n) => parseFloat(n)).filter((n) => Number.isFinite(n));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Operating thresholds
const V_NOMINAL = 220;
const V_TOL = 0.1; // ±10% → 198–242 V
const V_MIN = V_NOMINAL * (1 - V_TOL);
const V_MAX = V_NOMINAL * (1 + V_TOL);
const I_ALERT_RATIO = 0.9; // corrente ≥ 90% do ShutOff = alerta
const RET_MIN = 3; // mca — risco de cavitação / sucção de ar
const RET_RATIO = 0.85; // retaguarda ≥ 85% ShutOff = alerta
const REC_RATIO = 0.95; // recalque ≥ 95% ShutOff = alerta

type Alerts = {
  tensao: boolean;
  corrente: boolean;
  retaguarda: boolean;
  recalque: boolean;
  tensaoLow?: boolean;
  tensaoHigh?: boolean;
};

function computeAlerts(r: Row): Alerts {
  const v = parseAvg(r["Tensão ( V )"]);
  const i = parseAvg(r["Corrente ( A )"]);
  const iSO = parseAvg(r["Corrente ShutOff"]);
  const ret = parseAvg(r.Retaguarda);
  const retSO = parseAvg(r["Retaguarda ShutOff"]);
  const rec = parseAvg(r.Recalque);
  const recSO = parseAvg(r["Recalque ShutOff"]);
  const tensaoLow = v !== null && v > 0 && v < V_MIN;
  const tensaoHigh = v !== null && v > V_MAX;
  return {
    tensao: !!(tensaoLow || tensaoHigh),
    tensaoLow,
    tensaoHigh,
    corrente: i !== null && iSO !== null && iSO > 0 && i >= iSO * I_ALERT_RATIO,
    retaguarda:
      (ret !== null && ret > 0 && ret < RET_MIN) ||
      (ret !== null && retSO !== null && retSO > 0 && ret >= retSO * RET_RATIO),
    recalque: rec !== null && recSO !== null && recSO > 0 && rec >= recSO * REC_RATIO,
  };
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
  const [alertF, setAlertF] = useState<string>("TODOS");
  const [search, setSearch] = useState<string>("");
  const [tableExpanded, setTableExpanded] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () =>
      data.filter((d) => {
        if (tipo !== "TODOS" && d["Tipo de Serviço"] !== tipo) return false;
        if (grupo !== "TODOS" && String(d.Grupo ?? "") !== grupo) return false;
        if (elev !== "TODOS" && d.Elevatória !== elev) return false;
        if (alertF !== "TODOS") {
          const a = computeAlerts(d);
          if (alertF === "TENSAO" && !a.tensao) return false;
          if (alertF === "CORRENTE" && !a.corrente) return false;
          if (alertF === "RETAGUARDA" && !a.retaguarda) return false;
          if (alertF === "RECALQUE" && !a.recalque) return false;
          if (alertF === "QUALQUER" && !(a.tensao || a.corrente || a.retaguarda || a.recalque))
            return false;
        }
        return true;
      }),
    [data, tipo, grupo, elev, alertF],
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

  // Alerts cache
  const rowAlerts = useMemo(() => rows.map((r) => ({ r, a: computeAlerts(r) })), [rows]);

  // KPIs
  const total = rows.length;
  const ativosUnicos = new Set(rows.map((r) => r.Elevatória).filter(Boolean)).size;
  const aTensao = rowAlerts.filter((x) => x.a.tensao).length;
  const aCorrente = rowAlerts.filter((x) => x.a.corrente).length;
  const aRetag = rowAlerts.filter((x) => x.a.retaguarda).length;
  const aRecal = rowAlerts.filter((x) => x.a.recalque).length;
  const aQualquer = rowAlerts.filter(
    (x) => x.a.tensao || x.a.corrente || x.a.retaguarda || x.a.recalque,
  ).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const impossiveis = rows.filter(
    (r) =>
      r["Impossibilidade:"] &&
      String(r["Impossibilidade:"]).trim() &&
      !/^(n\/?a|nenhuma)/i.test(String(r["Impossibilidade:"]).trim()),
  ).length;
  const impossPct = pct(impossiveis);

  // Evolução temporal: testes vs alertas
  const porMes = useMemo(() => {
    const m = new Map<string, { testes: number; alertas: number }>();
    for (const x of rowAlerts) {
      const k = monthKey(x.r["Data do Teste"]);
      if (!k) continue;
      const cur = m.get(k) ?? { testes: 0, alertas: 0 };
      cur.testes += 1;
      if (x.a.tensao || x.a.corrente || x.a.retaguarda || x.a.recalque) cur.alertas += 1;
      m.set(k, cur);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, v]) => ({ name, ...v }));
  }, [rowAlerts]);

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

  // Top elevatórias com mais alertas
  const topElevAlertas = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of rowAlerts) {
      if (!x.r.Elevatória) continue;
      const has = x.a.tensao || x.a.corrente || x.a.retaguarda || x.a.recalque;
      if (!has) continue;
      m.set(x.r.Elevatória, (m.get(x.r.Elevatória) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [rowAlerts]);

  // Distribuição por tipo de alerta
  const alertasPie = [
    { name: "Tensão fora da faixa", value: aTensao, color: "#dc2626" },
    { name: "Corrente perto ShutOff", value: aCorrente, color: "#ea580c" },
    { name: "Retaguarda anômala", value: aRetag, color: "#ca8a04" },
    { name: "Recalque perto ShutOff", value: aRecal, color: "#7c3aed" },
  ].filter((s) => s.value > 0);

  // Tensão média por top elevatórias (para visualizar dispersão vs nominal)
  const tensaoPorElev = useMemo(() => {
    const m = new Map<string, { sum: number; n: number; min: number; max: number }>();
    for (const r of rows) {
      const v = parseAvg(r["Tensão ( V )"]);
      if (v === null || v <= 0 || !r.Elevatória) continue;
      const cur = m.get(r.Elevatória) ?? { sum: 0, n: 0, min: Infinity, max: -Infinity };
      cur.sum += v;
      cur.n += 1;
      cur.min = Math.min(cur.min, v);
      cur.max = Math.max(cur.max, v);
      m.set(r.Elevatória, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({
        name,
        media: +(v.sum / v.n).toFixed(1),
        min: +v.min.toFixed(1),
        max: +v.max.toFixed(1),
      }))
      .sort((a, b) => Math.abs(b.media - V_NOMINAL) - Math.abs(a.media - V_NOMINAL))
      .slice(0, 12);
  }, [rows]);

  // Retaguarda média por top elevatórias
  const retagPorElev = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      const v = parseAvg(r.Retaguarda);
      if (v === null || !r.Elevatória) continue;
      const cur = m.get(r.Elevatória) ?? { sum: 0, n: 0 };
      cur.sum += v;
      cur.n += 1;
      m.set(r.Elevatória, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, media: +(v.sum / v.n).toFixed(2) }))
      .sort((a, b) => a.media - b.media)
      .slice(0, 12);
  }, [rows]);

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
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Total de Testes" value={total} />
        <Kpi label="Ativos Atendidos" value={ativosUnicos} />
        <Kpi
          label="Alertas de Tensão"
          value={`${aTensao} (${pct(aTensao)}%)`}
          progress={{ pct: pct(aTensao), meta: 5, lowerIsBetter: true }}
        />
        <Kpi
          label="Corrente ≥ ShutOff"
          value={`${aCorrente} (${pct(aCorrente)}%)`}
          progress={{ pct: pct(aCorrente), meta: 5, lowerIsBetter: true }}
        />
        <Kpi
          label="Retaguarda Anômala"
          value={`${aRetag} (${pct(aRetag)}%)`}
          progress={{ pct: pct(aRetag), meta: 10, lowerIsBetter: true }}
        />
        <Kpi
          label="Testes com Alerta"
          value={`${aQualquer} (${pct(aQualquer)}%)`}
          progress={{ pct: pct(aQualquer), meta: 15, lowerIsBetter: true }}
        />
        <Kpi
          label="Impossibilidade"
          value={`${impossiveis} (${impossPct}%)`}
          progress={{ pct: impossPct, meta: 5, lowerIsBetter: true }}
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect label="TIPO DE SERVIÇO" value={tipo} onChange={setTipo} options={TIPOS} />
        <FilterSelect label="GRUPO" value={grupo} onChange={setGrupo} options={GRUPOS} />
        <FilterSelect label="ELEVATÓRIA" value={elev} onChange={setElev} options={ELEVS} />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">ALERTA</label>
          <select
            value={alertF}
            onChange={(e) => setAlertF(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            <option value="TODOS">Todos</option>
            <option value="QUALQUER">Qualquer alerta</option>
            <option value="TENSAO">Tensão fora faixa</option>
            <option value="CORRENTE">Corrente ≥ ShutOff</option>
            <option value="RETAGUARDA">Retaguarda anômala</option>
            <option value="RECALQUE">Recalque crítico</option>
          </select>
        </div>
        {(tipo !== "TODOS" || grupo !== "TODOS" || elev !== "TODOS" || alertF !== "TODOS") && (
          <button
            type="button"
            onClick={() => {
              setTipo("TODOS");
              setGrupo("TODOS");
              setElev("TODOS");
              setAlertF("TODOS");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Evolução: testes × alertas">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={porMes} margin={{ left: 10, right: 20, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                name="Testes"
                dataKey="testes"
                stroke={BLUE}
                strokeWidth={2.5}
                dot={{ r: 3, fill: BLUE_DARK }}
              />
              <Line
                type="monotone"
                name="Alertas"
                dataKey="alertas"
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#dc2626" }}
              />
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

        <Card title="Distribuição de Alertas">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={alertasPie}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                label={(d: { value: number }) => `${d.value} (${pct(d.value)}%)`}
              >
                {alertasPie.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 — análise por elevatória */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Top 10 elevatórias com mais ALERTAS">
          <ResponsiveContainer width="100%" height={Math.max(320, topElevAlertas.length * 32)}>
            <BarChart data={topElevAlertas} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626">
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 13, fontWeight: 700, fill: "#7f1d1d" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title={`Tensão média por elevatória (nominal ${V_NOMINAL}V · faixa ${V_MIN}-${V_MAX}V)`}>
          <ResponsiveContainer width="100%" height={Math.max(320, tensaoPorElev.length * 28)}>
            <BarChart data={tensaoPorElev} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[180, 250]} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="media">
                {tensaoPorElev.map((d) => (
                  <Cell
                    key={d.name}
                    fill={d.media < V_MIN || d.media > V_MAX ? "#dc2626" : BLUE}
                  />
                ))}
                <LabelList
                  dataKey="media"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: BLUE_DARK }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 3 — retaguarda e tabela de parâmetros */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title={`Menores retaguardas médias (alerta < ${RET_MIN} mca)`}>
          <ResponsiveContainer width="100%" height={Math.max(320, retagPorElev.length * 28)}>
            <BarChart data={retagPorElev} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="media">
                {retagPorElev.map((d) => (
                  <Cell key={d.name} fill={d.media < RET_MIN ? "#dc2626" : BLUE} />
                ))}
                <LabelList
                  dataKey="media"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: BLUE_DARK }}
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
                    const a = computeAlerts(r);
                    return (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-1 font-medium">{r.Elevatória}</td>
                        <td className={`px-2 py-1 ${a.tensao ? "bg-rose-50 text-rose-700 font-semibold" : ""}`} title={a.tensaoLow ? "Tensão abaixo do mínimo" : a.tensaoHigh ? "Tensão acima do máximo" : ""}>
                          {r["Tensão ( V )"] ?? ""}
                        </td>
                        <td className={`px-2 py-1 ${a.corrente ? "bg-rose-50 text-rose-700 font-semibold" : ""}`}>
                          {r["Corrente ( A )"] ?? ""}
                        </td>
                        <td className="px-2 py-1">{r["Corrente ShutOff"] ?? ""}</td>
                        <td className={`px-2 py-1 ${a.retaguarda ? "bg-amber-50 text-amber-700 font-semibold" : ""}`}>
                          {r.Retaguarda ?? ""}
                        </td>
                        <td className="px-2 py-1">{r["Retaguarda ShutOff"] ?? ""}</td>
                        <td className={`px-2 py-1 ${a.recalque ? "bg-violet-50 text-violet-700 font-semibold" : ""}`}>
                          {r.Recalque ?? ""}
                        </td>
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
                  <th className="px-2 py-1.5">Alertas</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => {
                  const a = computeAlerts(r);
                  const chips: { label: string; cls: string }[] = [];
                  if (a.tensao) chips.push({ label: "Tensão", cls: "bg-rose-100 text-rose-700" });
                  if (a.corrente) chips.push({ label: "Corrente", cls: "bg-orange-100 text-orange-700" });
                  if (a.retaguarda) chips.push({ label: "Retaguarda", cls: "bg-amber-100 text-amber-700" });
                  if (a.recalque) chips.push({ label: "Recalque", cls: "bg-violet-100 text-violet-700" });
                  return (
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
                    <td className="px-2 py-1">
                      <div className="flex flex-wrap gap-1">
                        {chips.length === 0 ? (
                          <span className="text-emerald-600 text-[10px] font-semibold">OK</span>
                        ) : (
                          chips.map((c) => (
                            <span key={c.label} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.cls}`}>
                              {c.label}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
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