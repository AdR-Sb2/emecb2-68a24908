import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Legend,
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
          "Painel de testes e aferições dos ativos: média de tensão e corrente por elevatória.",
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

const DATA = rawData as unknown as Row[];
const STORAGE_KEY = "testes_data_v1";

const BLUE = "#1f7ad6";
const BLUE_DARK = "#0b3a73";

function parseAvg(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/,/g, ".");
  const nums = s.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return null;
  const arr = nums.map((n) => parseFloat(n)).filter((n) => Number.isFinite(n) && n !== 0);
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Brazilian pump-station convention used here:
// BT (baixa tensão) → tensões nominais até ~300 V (220/240 V)
// MT (média tensão) → 380 V em diante (380/440/460 V)
function classifyTensao(v: number | null): "BT" | "MT" | null {
  if (v === null) return null;
  return v < 300 ? "BT" : "MT";
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
  const [search, setSearch] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () =>
      data.filter((d) => {
        if (tipo !== "TODOS" && d["Tipo de Serviço"] !== tipo) return false;
        if (grupo !== "TODOS" && String(d.Grupo ?? "") !== grupo) return false;
        if (elev !== "TODOS" && d.Elevatória !== elev) return false;
        return true;
      }),
    [data, tipo, grupo, elev],
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

  const total = rows.length;
  const ativosUnicos = new Set(rows.map((r) => r.Elevatória).filter(Boolean)).size;

  const mediaTensaoGeral = useMemo(() => {
    const vals = rows.map((r) => parseAvg(r["Tensão ( V )"])).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [rows]);

  const mediaCorrenteGeral = useMemo(() => {
    const vals = rows.map((r) => parseAvg(r["Corrente ( A )"])).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  }, [rows]);

  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = monthKey(r["Data do Teste"]);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, testes]) => ({ name, testes }));
  }, [rows]);

  const tensaoPorElev = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      const v = parseAvg(r["Tensão ( V )"]);
      if (v === null || !r.Elevatória) continue;
      const cur = m.get(r.Elevatória) ?? { sum: 0, n: 0 };
      cur.sum += v;
      cur.n += 1;
      m.set(r.Elevatória, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, media: +(v.sum / v.n).toFixed(1), testes: v.n }))
      .sort((a, b) => b.media - a.media);
  }, [rows]);

  const correntePorElev = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      const v = parseAvg(r["Corrente ( A )"]);
      if (v === null || !r.Elevatória) continue;
      const cur = m.get(r.Elevatória) ?? { sum: 0, n: 0 };
      cur.sum += v;
      cur.n += 1;
      m.set(r.Elevatória, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, media: +(v.sum / v.n).toFixed(2), testes: v.n }))
      .sort((a, b) => b.media - a.media);
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

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total de Testes" value={total} />
        <Kpi label="Ativos Atendidos" value={ativosUnicos} />
        <Kpi label="Média de Tensão" value={mediaTensaoGeral !== null ? `${mediaTensaoGeral} V` : "—"} />
        <Kpi label="Média de Corrente" value={mediaCorrenteGeral !== null ? `${mediaCorrenteGeral} A` : "—"} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect label="TIPO DE SERVIÇO" value={tipo} onChange={setTipo} options={TIPOS} />
        <FilterSelect label="GRUPO" value={grupo} onChange={setGrupo} options={GRUPOS} />
        <FilterSelect label="ELEVATÓRIA" value={elev} onChange={setElev} options={ELEVS} />
        {(tipo !== "TODOS" || grupo !== "TODOS" || elev !== "TODOS") && (
          <button
            type="button"
            onClick={() => {
              setTipo("TODOS");
              setGrupo("TODOS");
              setElev("TODOS");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Evolução mensal de testes" className="lg:col-span-1">
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
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Média de Tensão por Elevatória">
          <ResponsiveContainer width="100%" height={Math.max(260, tensaoPorElev.length * 24)}>
            <BarChart data={tensaoPorElev} layout="vertical" margin={{ left: 10, right: 60 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} V`, "Média"]} />
              <Bar dataKey="media" fill={BLUE}>
                <LabelList
                  dataKey="media"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: BLUE_DARK }}
                  formatter={(v: number) => `${v} V`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Média de Corrente por Elevatória">
          <ResponsiveContainer width="100%" height={Math.max(260, correntePorElev.length * 24)}>
            <BarChart data={correntePorElev} layout="vertical" margin={{ left: 10, right: 60 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} A`, "Média"]} />
              <Bar dataKey="media" fill={BLUE}>
                <LabelList
                  dataKey="media"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: BLUE_DARK }}
                  formatter={(v: number) => `${v} A`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Registros</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar elevatória, colaborador, serviço..."
            className="w-72 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="mb-2 text-xs text-slate-500">
          Mostrando {tableRows.length} de {data.length} testes
        </div>
        <div className="max-h-[60vh] overflow-auto">
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
                <th className="px-2 py-1.5">Tensão (V)</th>
                <th className="px-2 py-1.5">Corrente (A)</th>
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
                  <td className="px-2 py-1">{r["Tensão ( V )"] ?? ""}</td>
                  <td className="px-2 py-1">{r["Corrente ( A )"] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Fonte: Testes & Aferições de Ativos · {data.length} registros
      </p>

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

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xl font-bold text-[#0b3a73]">{value}</div>
    </div>
  );
}

function Card({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm ${className ?? ""}`}>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}
