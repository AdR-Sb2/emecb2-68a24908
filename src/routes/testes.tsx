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

  const total = rows.length;
  const ativosUnicos = new Set(rows.map((r) => r.ElevatóriaThe user wants a simplified version of the `testes.tsx` page, removing alerts, comparisons with shutoff, etc., and keeping only:
1. Average voltage per pump station (excluding zeros)
2. Average current per pump station (excluding zeros)
3. Something simple and easy.

I need to fix the corrupted `src/routes/testes.tsx` file first. The previous `code--write` attempt failed because the content was truncated. I need to rewrite the entire file correctly.

Key requirements:
- Remove all alert logic (computeAlerts, thresholds, alert chips, alert charts, alert KPIs, alert filters).
- Remove shutoff comparisons.
- Keep: total tests, unique assets, average voltage per station, average current per station.
- Keep basic filters: Type of Service, Group, Pump Station.
- Keep simple temporal evolution chart (tests per month).
- Keep detailed table but remove alert columns and shutoff columns.
- Keep upload functionality.
- Make it simple.

I will write the full file content to `src/routes/testes.tsx`.
