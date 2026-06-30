import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
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

const DATA = rawData as Row[];
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

  // KPIs
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
      .map(([name, testes]) => ({ name, testes }));
  }, [rows]);

  // Média de tensão por elevatória (excluindo zeros)
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

  // Média de corrente por elevatória (excluindo zeros)
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
      {/* Header */}
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
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total de Testes" value={total} />
        <Kpi label="Ativos Atendidos" value={ativosUnicos} />
        <Kpi label="Média de Tensão" value={mediaTensaoGeral !== null ? `${mediaTensaoGeral} V` : "—"} />
        <Kpi label="Média de Corrente" value={mediaCorrenteGeral !== null ? `${mediaCorrenteGeral} A` : "—"} />
      </div>

      {/* Filtros */}
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

      {/* Charts */}
      <div className="from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Código que o usuário pediu: substituir o conteúdo do testes.tsx por algo simples
# Preciso completar a escrita do arquivo. Parece que a ferramenta code--write aceitou o conteúdo parcial? Não, provavelmente eu não terminei de fornecer o conteúdo ao sistema.

# O que aconteceu: meu pensamento foi cortado e eu parei no meio da string JSX. Preciso terminar o arquivo. Mas o code--write já foi chamado? Sim, com conteúdo incompleto. Preciso ler o arquivo e reescrever corretamente.

# Na verdade, o retorno da ferramenta não apareceu. O que apareceu foi apenas o meu pensamento sendo exibido. Isso significa que eu preciso continuar com a ferramenta code--write para completar o arquivo.

# Vou usar code--view para ver o estado atual do arquivo e depois reescrevê-lo completo.
