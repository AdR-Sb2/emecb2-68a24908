import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Home,
  SlidersHorizontal,
  Upload,
  Download,
  Copy as CopyIcon,
  AlertTriangle,
  Flame,
  Filter,
  Clock,
  MapPin,
  X,
  Search,
  Maximize2,
  Crosshair,
  Zap,
  TrendingUp,
  Route as RouteIcon,
  Flag,
} from "lucide-react";
import logoAsset from "@/assets/logo-eletromecanica.png.asset.json";
import rawData from "@/data/backlog.json";
import type { RouteStart, RouteStop } from "@/components/backlog-map";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  computeEquipe,
  computeResponsabilidade,
  type Equipe,
  type Responsabilidade,
} from "@/data/responsabilidade-rules";

// Leaflet importa `window` no topo → carrega só no cliente para evitar crash de SSR.
const BacklogMap = lazy(() => import("@/components/backlog-map"));

export const Route = createFileRoute("/backlog")({
  head: () => ({
    meta: [
      { title: "Eletromecânica · Backlog BI" },
      {
        name: "description",
        content:
          "Backlog de Ordens de Manutenção (Field/SAP) com SLA, mapa e programação semanal.",
      },
    ],
  }),
  component: BacklogPage,
});

type Row = {
  "Ordem de Manutenção": string | null;
  NOTA: string | null;
  "Status da Atividade": string | null;
  "Início do SLA": string | null;
  "Fim do SLA": string | null;
  "TEXTO BREVE": string | null;
  "TEXTO LONGO": string | null;
  PLANTA: string | null;
  Endereço: string | null;
  BAIRRO: string | null;
  Cidade: string | null;
  Estado: string | null;
  "Coordenada Y": string | null;
  "Coordenada X": string | null;
  "Bucket de Origem da OS": string | null;
  PRIORIDADE: string | null;
  "DESCRIÇÃO EQUIPAMENTO": string | null;
  "Tipo de Atividade": string | null;
};

const DATA = rawData as unknown as Row[];
const STORAGE_KEY = "backlog_data_v1";
const VIEW_STORAGE_KEY = "backlog_saved_views_v1";

const BLUE = "#1f7ad6";
const BLUE_DARK = "#0b3a73";

// Paleta para o pie de "Tipo de Atividade" — cores nitidamente distintas.
const PIE_COLORS = [
  "#0b3a73", // azul escuro
  "#1f7ad6", // azul médio (marca)
  "#22c1c3", // ciano
  "#8b5cf6", // roxo
  "#10b981", // verde-azulado
  "#f59e0b", // âmbar
  "#ef4444", // vermelho
  "#64748b", // cinza-azulado
  "#ec4899", // rosa
  "#0ea5e9", // azul céu
];

// ---------- parsers ----------

// "DD/MM/YY HH:MM" ou "DD/MM/YYYY HH:MM" → Date (assumido horário local).
function parseFieldDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = String(s)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) {
    const iso = new Date(s);
    return isNaN(iso.getTime()) ? null : iso;
  }
  const dd = +m[1];
  const mm = +m[2];
  let yy = +m[3];
  if (yy < 100) yy += 2000;
  const hh = m[4] ? +m[4] : 0;
  const mi = m[5] ? +m[5] : 0;
  return new Date(yy, mm - 1, dd, hh, mi, 0);
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Latitude: -25 a -20 (RJ). Dados podem vir crus (/100000) ou já corretos.
function parseLat(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  let n = parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (n >= -25 && n <= -20) return n;
  n = n / 100000;
  if (n > -10) n = n * 10;
  if (n >= -25 && n <= -20) return n;
  return null;
}

// Longitude: -45 a -40 (RJ).
function parseLon(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const orig = parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(orig)) return null;
  for (const div of [1, 10, 100, 1000, 10000, 100000]) {
    const v = orig / div;
    if (v >= -45 && v <= -40) return v;
  }
  return null;
}

// ---------- faixa ----------

type Faixa = "0-3 dias" | "4-7 dias" | "8-15 dias" | "15+ dias";
const FAIXAS: Faixa[] = ["0-3 dias", "4-7 dias", "8-15 dias", "15+ dias"];
function toFaixa(diasAberto: number): Faixa {
  if (diasAberto <= 3) return "0-3 dias";
  if (diasAberto <= 7) return "4-7 dias";
  if (diasAberto <= 15) return "8-15 dias";
  return "15+ dias";
}

// ---------- enrichment ----------

type Enriched = {
  r: Row;
  om: string;
  planta: string;
  plantaShort: string;
  fimSla: Date | null;
  inicioSla: Date | null;
  slaStatus: "ATRASADO" | "NO PRAZO" | "—";
  diasAberto: number;
  faixa: Faixa;
  responsabilidade: Responsabilidade;
  equipe: Equipe;
  lat: number | null;
  lon: number | null;
};

function enrich(rows: Row[], now: Date): Enriched[] {
  return rows.map((r) => {
    const planta = r.PLANTA || "";
    const plantaShort = planta.split(" - ")[0].trim() || planta;
    const inicioSla = parseFieldDate(r["Início do SLA"]);
    const fimSla = parseFieldDate(r["Fim do SLA"]);
    const diasAberto = inicioSla
      ? Math.max(0, Math.floor((now.getTime() - inicioSla.getTime()) / 86_400_000))
      : 0;
    const slaStatus: Enriched["slaStatus"] = fimSla
      ? now > fimSla
        ? "ATRASADO"
        : "NO PRAZO"
      : "—";
    const responsabilidade = computeResponsabilidade({
      om: r["Ordem de Manutenção"] || "",
      planta,
      textoBreve: r["TEXTO BREVE"] || "",
    });
    const equipe = computeEquipe({
      responsabilidade,
      descricaoEquipamento: r["DESCRIÇÃO EQUIPAMENTO"] || "",
      om: r["Ordem de Manutenção"] || "",
    });
    return {
      r,
      om: r["Ordem de Manutenção"] || "",
      planta,
      plantaShort,
      inicioSla,
      fimSla,
      slaStatus,
      diasAberto,
      faixa: toFaixa(diasAberto),
      responsabilidade,
      equipe,
      lat: parseLat(r["Coordenada Y"]),
      lon: parseLon(r["Coordenada X"]),
    };
  });
}

// ---------- multi-select simples ----------
function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((v) => v !== o));
    else onChange([...value, o]);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-[15px] shadow-sm hover:border-[#1f7ad6]"
      >
        <span className="truncate">
          <span className="mr-1 text-xs text-slate-500">{label}:</span>
          <span className="font-medium text-slate-800">
            {value.length === 0 ? "Todos" : value.length === 1 ? value[0] : `${value.length} selecionados`}
          </span>
        </span>
        <Filter className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-1 max-h-72 w-full min-w-[220px] overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
            <div className="flex items-center justify-between border-b px-2 py-1 text-xs text-slate-500">
              <span>{value.length} selecionados</span>
              <button className="text-[#1f7ad6] hover:underline" onClick={() => onChange([])}>
                limpar
              </button>
            </div>
            {options.map((o) => (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
              >
                <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
                <span className="truncate">{o}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- combobox com busca (para lista longa de plantas) ----------
function ComboboxSearch({
  label,
  options,
  value,
  onChange,
  allLabel = "Todas",
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;
  const selectedLabel = value === "TODAS" ? allLabel : value;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-[15px] shadow-sm hover:border-[#1f7ad6]"
      >
        <span className="truncate">
          <span className="mr-1 text-xs text-slate-500">{label}:</span>
          <span className="font-medium text-slate-800">{selectedLabel}</span>
        </span>
        <Search className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setQ(""); }} />
          <div className="absolute z-40 mt-1 w-full min-w-[260px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-100 px-2 py-1">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="min-h-9 w-full border-none text-[14px] outline-none"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-auto p-1">
              <button
                onClick={() => { onChange("TODAS"); setOpen(false); setQ(""); }}
                className={`block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-slate-50 ${value === "TODAS" ? "bg-[#eaf3fb] font-semibold text-[#0b3a73]" : ""}`}
              >
                {allLabel}
              </button>
              {filtered.length === 0 && (
                <div className="px-2 py-2 text-xs text-slate-400">Nenhum resultado.</div>
              )}
              {filtered.map((o) => (
                <button
                  key={o}
                  onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                  className={`block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-slate-50 ${value === o ? "bg-[#eaf3fb] font-semibold text-[#0b3a73]" : ""}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- página ----------
function BacklogPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<Row[]>(DATA);
  const [hasCustomData, setHasCustomData] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  // Recalcula "agora" a cada minuto para atualizar SLA/Dias em aberto.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const enriched = useMemo(() => enrich(data, now), [data, now]);

  // ---------- filtros ----------
  const [fPlanta, setFPlanta] = useState<string>("TODAS");
  const [fResp, setFResp] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string>("TODOS");
  const [fEquipe, setFEquipe] = useState<string>("TODAS");
  const [fCidade, setFCidade] = useState<string>("TODAS");
  const [fFaixa, setFFaixa] = useState<string>("TODAS");
  const [onlyLate, setOnlyLate] = useState(false);
  const [onlyEmerg, setOnlyEmerg] = useState(false);
  const [fSlaBefore, setFSlaBefore] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapFitSignal, setMapFitSignal] = useState(0);

  // ---------- filtro em cascata: cada dropdown considera os demais filtros ----------
  type FilterKey = "planta" | "resp" | "status" | "equipe" | "cidade" | "faixa" | "late" | "emerg" | "sla";
  const applyFilters = (rows: Enriched[], skip?: FilterKey) => {
    const slaLimit = fSlaBefore ? new Date(fSlaBefore + "T00:00:00") : null;
    return rows.filter((e) => {
      if (skip !== "planta" && fPlanta !== "TODAS" && e.planta !== fPlanta) return false;
      if (skip !== "resp" && fResp.length && !fResp.includes(e.responsabilidade)) return false;
      if (skip !== "status" && fStatus !== "TODOS" && (e.r["Status da Atividade"] || "").trim() !== fStatus) return false;
      if (skip !== "equipe" && fEquipe !== "TODAS" && e.equipe !== fEquipe) return false;
      if (skip !== "cidade" && fCidade !== "TODAS" && e.r.Cidade !== fCidade) return false;
      if (skip !== "faixa" && fFaixa !== "TODAS" && e.faixa !== fFaixa) return false;
      if (skip !== "late" && onlyLate && e.slaStatus !== "ATRASADO") return false;
      if (skip !== "emerg" && onlyEmerg && (e.r.PRIORIDADE || "").toUpperCase() !== "EMERGÊNCIA") return false;
      if (skip !== "sla" && slaLimit && e.fimSla && e.fimSla >= slaLimit) return false;
      return true;
    });
  };
  const filtered = useMemo(() => applyFilters(enriched), [enriched, fPlanta, fResp, fStatus, fEquipe, fCidade, fFaixa, onlyLate, onlyEmerg, fSlaBefore]);

  const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
  const OPT_PLANTA = useMemo(
    () => uniq(applyFilters(enriched, "planta").map((e) => e.planta).filter(Boolean)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched, fResp, fStatus, fEquipe, fCidade, fFaixa, onlyLate, onlyEmerg, fSlaBefore],
  );
  const OPT_RESP = useMemo(
    () => uniq(applyFilters(enriched, "resp").map((e) => e.responsabilidade)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched, fPlanta, fStatus, fEquipe, fCidade, fFaixa, onlyLate, onlyEmerg, fSlaBefore],
  );
  const OPT_STATUS = useMemo(
    () => uniq(
      applyFilters(enriched, "status")
        .map((e) => (e.r["Status da Atividade"] || "").trim())
        .filter(Boolean),
    ).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched, fPlanta, fResp, fEquipe, fCidade, fFaixa, onlyLate, onlyEmerg, fSlaBefore],
  );
  const OPT_EQUIPE = useMemo(
    () => uniq(applyFilters(enriched, "equipe").map((e) => e.equipe)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched, fPlanta, fResp, fStatus, fCidade, fFaixa, onlyLate, onlyEmerg, fSlaBefore],
  );
  const OPT_CIDADE = useMemo(
    () => uniq(applyFilters(enriched, "cidade").map((e) => e.r.Cidade).filter(Boolean)).sort() as string[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched, fPlanta, fResp, fStatus, fEquipe, fFaixa, onlyLate, onlyEmerg, fSlaBefore],
  );
  const OPT_FAIXA = useMemo(
    () => FAIXAS.filter((f) => applyFilters(enriched, "faixa").some((e) => e.faixa === f)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched, fPlanta, fResp, fStatus, fEquipe, fCidade, onlyLate, onlyEmerg, fSlaBefore],
  );

  // ---------- KPIs ----------
  const kTotal = filtered.length;
  const kLate = filtered.filter((e) => e.slaStatus === "ATRASADO").length;
  const kEmerg = filtered.filter((e) => (e.r.PRIORIDADE || "").toUpperCase() === "EMERGÊNCIA").length;
  const kPct = kTotal ? Math.round((kLate / kTotal) * 100) : 0;

  // ---------- charts data ----------
  const dataFaixa = useMemo(
    () =>
      FAIXAS.map((f) => ({
        name: f,
        value: filtered.filter((e) => e.faixa === f).length,
      })),
    [filtered],
  );

  const dataTipoAtividade = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filtered) {
      const k = e.r["Tipo de Atividade"] || "—";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const dataCidade = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filtered) {
      const k = e.r.Cidade || "—";
      m.set(k, (m.get(k) || 0) + 1);
    }
    const sorted = Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const TOP = 10;
    if (sorted.length <= TOP) return sorted;
    const top = sorted.slice(0, TOP);
    const outras = sorted.slice(TOP).reduce((s, x) => s + x.value, 0);
    return [...top, { name: "Outras", value: outras }];
  }, [filtered]);

  // ---------- mapa: 1 marker por PLANTA única ----------
  const mapMarkers = useMemo(() => {
    const m = new Map<string, { lat: number; lon: number; planta: string; count: number; late: number; emerg: number }>();
    for (const e of filtered) {
      if (e.lat === null || e.lon === null) continue;
      const key = e.planta;
      const isEmerg = (e.r["Tipo de Atividade"] || "").toUpperCase().includes("MANUTENÇÃO CORRETIVA EMERGENCIAL");
      const cur = m.get(key);
      if (cur) {
        cur.count += 1;
        if (e.slaStatus === "ATRASADO") cur.late += 1;
        if (isEmerg) cur.emerg += 1;
      } else {
        m.set(key, {
          lat: e.lat,
          lon: e.lon,
          planta: e.planta,
          count: 1,
          late: e.slaStatus === "ATRASADO" ? 1 : 0,
          emerg: isEmerg ? 1 : 0,
        });
      }
    }
    return Array.from(m.values());
  }, [filtered]);

  // Toggle: clicar de novo na mesma planta desfaz o filtro.
  const togglePlanta = (planta: string) =>
    setFPlanta((cur) => (cur === planta ? "TODAS" : planta));

  // ---------- Ações recomendadas ----------
  const emergSemProgramacao = useMemo(
    () => filtered.filter(
      (e) => (e.r.PRIORIDADE || "").toUpperCase() === "EMERGÊNCIA"
        && (e.r["Status da Atividade"] || "").toLowerCase().includes("pendente"),
    ).length,
    [filtered],
  );
  const topPlantasBacklog = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filtered) if (e.faixa === "15+ dias") m.set(e.planta, (m.get(e.planta) || 0) + 1);
    return Array.from(m.entries())
      .map(([planta, count]) => ({ planta, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filtered]);
  const applyEmergPendente = () => {
    setOnlyEmerg(true);
    setFStatus(OPT_STATUS.find((s) => s.toLowerCase().includes("pendente")) || "TODOS");
  };

  // ---------- ordenação da tabela ----------
  type SortKey = "om" | "textoBreve" | "planta" | "inicioSla" | "tipo";
  const [sortKey, setSortKey] = useState<SortKey>("inicioSla");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const sortedRows = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "om":
          av = a.om; bv = b.om; break;
        case "textoBreve":
          av = a.r["TEXTO BREVE"] || ""; bv = b.r["TEXTO BREVE"] || ""; break;
        case "planta":
          av = a.planta; bv = b.planta; break;
        case "inicioSla":
          av = a.inicioSla ? a.inicioSla.getTime() : 0;
          bv = b.inicioSla ? b.inicioSla.getTime() : 0;
          break;
        case "tipo":
          av = a.r["Tipo de Atividade"] || ""; bv = b.r["Tipo de Atividade"] || ""; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  // ---------- upload ----------
  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      if (!json.length) { alert("Planilha vazia ou inválida."); return; }
      const norm = json.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          out[k.replace(/\n/g, "").trim()] = v instanceof Date ? v.toISOString() : v;
        }
        return out;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(norm));
      setData(norm as Row[]);
      setHasCustomData(true);
      alert(`Bucket atualizado com ${norm.length} registros.`);
    } catch (err) {
      console.error(err);
      alert("Falha ao ler o arquivo.");
    }
  };

  // ---------- exportar CSV ----------
  const exportCSV = () => {
    const headers = ["Ordem", "Nota", "Planta", "Cidade", "Prioridade", "Status", "Tipo", "Início SLA", "Fim SLA", "Dias Aberto", "SLA", "Responsabilidade", "Equipe", "TEXTO BREVE"];
    const rows = sortedRows.map((e) => [
      e.om, e.r.NOTA ?? "", e.planta, e.r.Cidade ?? "", e.r.PRIORIDADE ?? "",
      e.r["Status da Atividade"] ?? "", e.r["Tipo de Atividade"] ?? "",
      fmtDate(e.inicioSla), fmtDate(e.fimSla), String(e.diasAberto),
      e.slaStatus, e.responsabilidade, e.equipe, e.r["TEXTO BREVE"] ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backlog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyResumo = async () => {
    const txt =
      `📊 *Backlog BI*\n` +
      `Total: ${kTotal} O.S.\n` +
      `Atrasadas: ${kLate} (${kPct}%)\n` +
      `Emergenciais: ${kEmerg}\n\n` +
      `Por faixa:\n${dataFaixa.map((d) => `• ${d.name}: ${d.value}`).join("\n")}\n\n` +
      `Top cidades:\n${dataCidade.slice(0, 5).map((d) => `• ${d.name}: ${d.value}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(txt);
      alert("Resumo copiado! Cole no WhatsApp.");
    } catch {
      alert("Não foi possível copiar.");
    }
  };

  // ---------- views salvas ----------
  const saveView = () => {
    const name = prompt("Nome da view:");
    if (!name) return;
    const v = { name, fPlanta, fResp, fStatus, fEquipe, fCidade, fFaixa, onlyLate, onlyEmerg, fSlaBefore };
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    const list: Array<typeof v> = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((x) => x.name === name);
    if (idx >= 0) list[idx] = v; else list.push(v);
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(list));
    alert("View salva.");
  };
  const [savedViews, setSavedViews] = useState<Array<{ name: string; fPlanta: string; fResp: string[]; fStatus: string; fEquipe: string; fCidade: string; fFaixa: string; onlyLate: boolean; onlyEmerg: boolean; fSlaBefore: string }>>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIEW_STORAGE_KEY);
      if (raw) setSavedViews(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [now]);
  const loadView = (n: string) => {
    const v = savedViews.find((x) => x.name === n);
    if (!v) return;
    setFPlanta(v.fPlanta); setFResp(v.fResp); setFStatus(v.fStatus);
    setFEquipe(v.fEquipe); setFCidade(v.fCidade); setFFaixa(v.fFaixa);
    setOnlyLate(v.onlyLate); setOnlyEmerg(v.onlyEmerg); setFSlaBefore(v.fSlaBefore);
  };

  const clearAllFilters = () => {
    setFPlanta("TODAS"); setFResp([]); setFStatus("TODOS");
    setFEquipe("TODAS"); setFCidade("TODAS"); setFFaixa("TODAS");
    setOnlyLate(false); setOnlyEmerg(false); setFSlaBefore("");
  };

  // ============================================================
  // Route Builder — Montador Automático de Rota
  // ============================================================
  const DEFAULT_START_HINT = "PL-RJB-EAT1005";
  const AVG_KMH = 38;
  const URGENCY_WEIGHT_KM_PER_DAY = 0.35;
  const findDefaultStart = () =>
    enriched.find((e) => e.planta.toUpperCase().includes(DEFAULT_START_HINT))?.planta || "";

  const allTipos = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.r["Tipo de Atividade"] || "").filter(Boolean))).sort(),
    [enriched],
  );
  const allResps = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.responsabilidade))).sort(),
    [enriched],
  );
  const allPlantas = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.planta).filter(Boolean))).sort(),
    [enriched],
  );
  const allCidades = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.r.Cidade || "").filter(Boolean))).sort() as string[],
    [enriched],
  );

  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [rbSlaBefore, setRbSlaBefore] = useState<string>("");
  const [rbTipos, setRbTipos] = useState<string[]>([]);
  const [rbResps, setRbResps] = useState<string[]>(["Baixada 2"]);
  const [rbStart, setRbStart] = useState<string>("");
  const [rbMaxStops, setRbMaxStops] = useState<number>(20);
  const [rbTolerance, setRbTolerance] = useState<number>(3);
  const [rbElevatorias, setRbElevatorias] = useState<string[]>([]);
  const [rbCidades, setRbCidades] = useState<string[]>([]);
  const [routeError, setRouteError] = useState<string>("");

  useEffect(() => {
    if (!rbStart && allPlantas.length) setRbStart(findDefaultStart() || allPlantas[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlantas.length]);

  type GeneratedRoute = {
    start: RouteStart;
    stops: RouteStop[];
    details: Array<{
      ordem: number;
      planta: string;
      plantaShort: string;
      cidade: string;
      distKm: number;
      cumKm: number;
      oss: Enriched[];
      oldestFimSla: Date | null;
    }>;
    totalKm: number;
    etaMin: number;
    totalOs: number;
    limitConfig: { max: number; tolerance: number };
  };
  const [generatedRoute, setGeneratedRoute] = useState<GeneratedRoute | null>(null);

  function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  const generateRoute = () => {
    setRouteError("");
    if (!rbSlaBefore) { setRouteError("Informe a data/hora limite do Fim do SLA."); return; }
    if (!rbStart) { setRouteError("Selecione o ponto de partida."); return; }
    if (!rbMaxStops || rbMaxStops < 1) { setRouteError("Máximo de paradas deve ser ≥ 1."); return; }

    const slaLimit = new Date(rbSlaBefore);
    if (isNaN(slaLimit.getTime())) { setRouteError("Data/hora limite inválida."); return; }

    // 1) candidatos
    const candidates = enriched.filter((e) => {
      if (!e.fimSla || e.fimSla >= slaLimit) return false;
      if (rbTipos.length && !rbTipos.includes(e.r["Tipo de Atividade"] || "")) return false;
      if (rbResps.length && !rbResps.includes(e.responsabilidade)) return false;
      if (rbElevatorias.length && !rbElevatorias.includes(e.planta)) return false;
      if (rbCidades.length && !rbCidades.includes(e.r.Cidade || "")) return false;
      if (e.lat === null || e.lon === null) return false;
      return true;
    });
    if (!candidates.length) { setRouteError("Nenhuma O.S. atende aos critérios informados."); return; }

    // 2) agrupa por planta
    type Group = { planta: string; lat: number; lon: number; oss: Enriched[]; oldestFimSla: Date };
    const groupMap = new Map<string, Group>();
    for (const e of candidates) {
      const cur = groupMap.get(e.planta);
      if (!cur) {
        groupMap.set(e.planta, {
          planta: e.planta, lat: e.lat!, lon: e.lon!, oss: [e], oldestFimSla: e.fimSla!,
        });
      } else {
        cur.oss.push(e);
        if (e.fimSla! < cur.oldestFimSla) cur.oldestFimSla = e.fimSla!;
      }
    }
    const groups = Array.from(groupMap.values());

    // 3) ponto de partida
    const startRow = enriched.find((e) => e.planta === rbStart && e.lat !== null && e.lon !== null);
    if (!startRow) { setRouteError("Ponto de partida não possui coordenadas."); return; }
    const startPt = { lat: startRow.lat!, lon: startRow.lon!, planta: rbStart };

    // 4) Nearest-neighbor com urgência
    const maxDaysAtraso = Math.max(
      1,
      ...groups.map((g) => Math.max(0, (slaLimit.getTime() - g.oldestFimSla.getTime()) / 86_400_000)),
    );
    const remaining = new Set(groups.map((g) => g.planta));
    const orderedGroups: Group[] = [];
    let cursor: { lat: number; lon: number } = startPt;
    while (remaining.size) {
      let best: Group | null = null;
      let bestScore = Infinity;
      for (const g of groups) {
        if (!remaining.has(g.planta)) continue;
        const d = haversineKm(cursor, g);
        const days = Math.max(0, (slaLimit.getTime() - g.oldestFimSla.getTime()) / 86_400_000);
        const norm = days / maxDaysAtraso;
        const score = d - URGENCY_WEIGHT_KM_PER_DAY * norm * 10;
        if (score < bestScore) { bestScore = score; best = g; }
      }
      if (!best) break;
      orderedGroups.push(best);
      remaining.delete(best.planta);
      cursor = { lat: best.lat, lon: best.lon };
    }

    // 5) Corte pelo máximo de paradas (com tolerância)
    const chosen: Group[] = [];
    let acc = 0;
    for (const g of orderedGroups) {
      if (acc >= rbMaxStops) break;
      const next = acc + g.oss.length;
      if (next <= rbMaxStops) {
        chosen.push(g);
        acc = next;
      } else {
        const overflow = next - rbMaxStops;
        if (overflow <= rbTolerance) {
          chosen.push(g);
          acc = next;
        }
        break;
      }
    }
    if (!chosen.length) { setRouteError("Máximo de paradas insuficiente até para o primeiro grupo."); return; }

    // 6) monta stops + distâncias
    let cumKm = 0;
    let prev: { lat: number; lon: number } = startPt;
    const details: GeneratedRoute["details"] = [];
    const stops: RouteStop[] = [];
    let totalOs = 0;
    chosen.forEach((g, idx) => {
      const d = haversineKm(prev, g);
      cumKm += d;
      const ordem = idx + 1;
      details.push({
        ordem,
        planta: g.planta,
        plantaShort: g.planta.split(" - ")[0] || g.planta,
        cidade: g.oss[0]?.r.Cidade || "",
        distKm: d,
        cumKm,
        oss: g.oss,
        oldestFimSla: g.oldestFimSla,
      });
      stops.push({ planta: g.planta, lat: g.lat, lon: g.lon, ordem, osCount: g.oss.length });
      totalOs += g.oss.length;
      prev = { lat: g.lat, lon: g.lon };
    });

    const totalKm = cumKm;
    const etaMin = Math.round((totalKm / AVG_KMH) * 60);

    setGeneratedRoute({
      start: { lat: startPt.lat, lon: startPt.lon, label: rbStart },
      stops,
      details,
      totalKm,
      etaMin,
      totalOs,
      limitConfig: { max: rbMaxStops, tolerance: rbTolerance },
    });
    setRouteDialogOpen(false);
    setTimeout(() => setMapFitSignal((n) => n + 1), 100);
  };

  const clearRoute = () => setGeneratedRoute(null);

  const exportRouteCSV = () => {
    if (!generatedRoute) return;
    const headers = ["Parada", "Planta", "Cidade", "Distância (km)", "Acumulado (km)", "Ordem", "Nota", "Fim SLA", "Prioridade", "Tipo", "TEXTO BREVE"];
    const rows: string[][] = [];
    for (const d of generatedRoute.details) {
      for (const os of d.oss) {
        rows.push([
          String(d.ordem), d.planta, d.cidade,
          d.distKm.toFixed(2), d.cumKm.toFixed(2),
          os.om, os.r.NOTA ?? "", fmtDate(os.fimSla),
          os.r.PRIORIDADE ?? "", os.r["Tipo de Atividade"] ?? "",
          os.r["TEXTO BREVE"] ?? "",
        ]);
      }
    }
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rota-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyRouteResumo = async () => {
    if (!generatedRoute) return;
    const lines = [
      `🗺️ *Rota programada* — ${generatedRoute.totalOs} O.S. em ${generatedRoute.stops.length} paradas`,
      `📏 ${generatedRoute.totalKm.toFixed(1)} km · ⏱️ ~${generatedRoute.etaMin} min de deslocamento`,
      `🚩 Partida: ${generatedRoute.start.label.split(" - ")[0]}`,
      "",
      ...generatedRoute.details.map(
        (d) => `${d.ordem}. ${d.plantaShort} (${d.oss.length} O.S., +${d.distKm.toFixed(1)} km)`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("Rota copiada! Cole no WhatsApp.");
    } catch { alert("Não foi possível copiar."); }
  };

  const mapCard = (heightPx: number, showToolbar = true) => (
    <>
      {showToolbar && (
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-[#0b3a73]">
            <MapPin className="mr-1 inline h-4 w-4" /> Mapa de elevatórias ({mapMarkers.length})
          </div>
          <div className="flex items-center gap-1">
            {fPlanta !== "TODAS" && (
              <button
                onClick={() => setFPlanta("TODAS")}
                className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
              >
                Limpar planta
              </button>
            )}
            <button
              onClick={() => setMapFitSignal((n) => n + 1)}
              title="Centralizar nas plantas visíveis"
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Crosshair className="h-3.5 w-3.5" /> Centralizar
            </button>
            <button
              onClick={() => setMapOpen(true)}
              title="Expandir mapa"
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Expandir
            </button>
          </div>
        </div>
      )}
      <div style={{ height: heightPx, width: "100%" }} className="overflow-hidden rounded-md bg-slate-100">
        {mounted ? (
          <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-slate-400">Carregando mapa…</div>}>
            <BacklogMap
              markers={mapMarkers}
              onSelect={togglePlanta}
              selectedPlanta={fPlanta === "TODAS" ? null : fPlanta}
              fitSignal={mapFitSignal}
              route={generatedRoute}
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Carregando mapa…
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      {/* Header */}
      <div className="relative mb-4 overflow-hidden rounded-md shadow">
        <img
          src={logoAsset.url}
          alt="Águas do Rio - Eletromecânica"
          className="h-20 w-full object-cover object-center sm:h-auto"
          width={1024}
          height={160}
          loading="eager"
        />
        <Link
          to="/"
          title="Voltar ao Hub"
          aria-label="Voltar ao Hub"
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:bg-white hover:scale-105 sm:h-9 sm:w-9 sm:right-3 sm:top-3"
        >
          <Home className="h-5 w-5 sm:h-4 sm:w-4" />
        </Link>
      </div>

      {/* Title + actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0b3a73] sm:text-2xl">Backlog BI</h1>
          <p className="text-xs text-slate-500">
            Bucket Field/SAP · {data.length} O.S. · atualizado {fmtDate(now)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white shadow hover:bg-[#1f7ad6]"
          >
            <Upload className="h-4 w-4" /> Importar bucket do Field
          </button>
          {hasCustomData && (
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setData(DATA);
                setHasCustomData(false);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              restaurar exemplo
            </button>
          )}
          <button
            onClick={exportCSV}
            className="inline-flex min-h-11 items-center gap-1 rounded-md border border-[#1f7ad6] bg-white px-3 py-2 text-[13px] font-semibold text-[#0b3a73] hover:bg-[#eaf3fb]"
          >
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={copyResumo}
            className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <CopyIcon className="h-4 w-4" /> Copiar resumo
          </button>
          <button
            onClick={saveView}
            className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Salvar view
          </button>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh SLA
          </label>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={clearAllFilters}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1f7ad6] hover:shadow-md"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">O.S. no bucket</div>
          <div className="mt-1 text-3xl font-bold text-[#0b3a73]">{kTotal}</div>
          <div className="text-[11px] text-slate-400">clique para limpar filtros</div>
        </button>
        <button
          onClick={() => setOnlyLate((v) => !v)}
          className={`relative rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${onlyLate ? "border-red-500 bg-red-50" : "border-slate-200 bg-white hover:border-red-400"}`}
        >
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AlertTriangle className="h-3 w-3" /> O.S. Atrasadas
          </div>
          <div className="mt-1 text-3xl font-bold text-red-600">{kLate}</div>
          {kLate > 0 && (
            <span className="absolute right-3 top-3 inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
          )}
        </button>
        <button
          onClick={() => setOnlyEmerg((v) => !v)}
          className={`relative rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${onlyEmerg ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-orange-400"}`}
        >
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Flame className="h-3 w-3" /> Emergenciais
          </div>
          <div className="mt-1 text-3xl font-bold text-orange-600">{kEmerg}</div>
          {kEmerg > 0 && (
            <span className="absolute right-3 top-3 inline-flex h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          )}
        </button>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">% SLA Atrasado</div>
          <div className="mt-1 text-3xl font-bold text-[#1f7ad6]">{kPct}%</div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1f7ad6] to-red-500"
              style={{ width: `${kPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-[#0b3a73] sm:hidden"
        >
          <span className="flex items-center gap-1">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </span>
          <span>{showFilters ? "ocultar" : "mostrar"}</span>
        </button>
        <div className={`${showFilters ? "grid" : "hidden"} gap-2 sm:!grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`}>
          <ComboboxSearch label="Elevatória" options={OPT_PLANTA} value={fPlanta} onChange={setFPlanta} allLabel="Todas" />
          <MultiSelect label="Responsabilidade" options={OPT_RESP} value={fResp} onChange={setFResp} />
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[15px] shadow-sm">
            <option value="TODOS">Status: Todos</option>
            {OPT_STATUS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fEquipe} onChange={(e) => setFEquipe(e.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[15px] shadow-sm">
            <option value="TODAS">Equipe: Todas</option>
            {OPT_EQUIPE.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fCidade} onChange={(e) => setFCidade(e.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[15px] shadow-sm">
            <option value="TODAS">Cidade: Todas</option>
            {OPT_CIDADE.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fFaixa} onChange={(e) => setFFaixa(e.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[15px] shadow-sm">
            <option value="TODAS">Faixa: Todas</option>
            {OPT_FAIXA.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-2 text-[13px] shadow-sm">
            <Clock className="h-4 w-4 text-slate-400" />
            Fim SLA anterior a:
            <input type="date" value={fSlaBefore} onChange={(e) => setFSlaBefore(e.target.value)} className="ml-auto min-h-9 rounded border-none text-[13px] outline-none" />
          </label>
          {savedViews.length > 0 && (
            <select onChange={(e) => e.target.value && loadView(e.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[15px] shadow-sm" defaultValue="">
              <option value="">Views salvas…</option>
              {savedViews.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          )}
          <button onClick={clearAllFilters} className="min-h-11 rounded-md border border-slate-300 bg-slate-50 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100">
            Limpar filtros
          </button>
        </div>
        {fPlanta !== "TODAS" && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#eaf3fb] px-3 py-1 text-xs text-[#0b3a73]">
            Filtrando por planta: <strong>{fPlanta}</strong>
            <button onClick={() => setFPlanta("TODAS")}><X className="h-3 w-3" /></button>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        {/* Faixa */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-[#0b3a73]">Backlog por Tempo em Aberto</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dataFaixa} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill={BLUE} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 12, fill: BLUE_DARK, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie tipo atividade */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-[#0b3a73]">O.S. por Tipo de Atividade</div>
          {(() => {
            const totalTipo = dataTipoAtividade.reduce((s, d) => s + d.value, 0);
            return (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                <div className="relative sm:col-span-2" style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataTipoAtividade}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={1}
                        stroke="#fff"
                        strokeWidth={2}
                        startAngle={90}
                        endAngle={-270}
                        isAnimationActive={false}
                      >
                        {dataTipoAtividade.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, n: string) => [`${v} (${totalTipo ? Math.round((v / totalTipo) * 100) : 0}%)`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</div>
                    <div className="text-2xl font-bold text-[#0b3a73]">{totalTipo}</div>
                  </div>
                </div>
                <ul className="sm:col-span-3 grid grid-cols-1 gap-1 self-center text-[11px] xl:grid-cols-2">
                  {dataTipoAtividade.map((d, i) => {
                    const pct = totalTipo ? Math.round((d.value / totalTipo) * 100) : 0;
                    return (
                      <li key={d.name} className="flex items-center gap-2 truncate">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate text-slate-700" title={d.name}>{d.name}</span>
                        <span className="ml-auto shrink-0 font-semibold text-[#0b3a73]">{d.value} · {pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}
        </div>

        {/* Cidade */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-[#0b3a73]">Distribuição por Cidade</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dataCidade} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={BLUE_DARK} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: BLUE_DARK, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mapa + Programar */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {mapCard(240)}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#0b3a73]">
            <Zap className="h-4 w-4" /> Ações recomendadas
          </div>

          <button
            onClick={applyEmergPendente}
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-left transition hover:border-red-400 hover:bg-red-100"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase text-red-700">Emergenciais pendentes</div>
              <div className="text-2xl font-bold text-red-600">{emergSemProgramacao}</div>
              <div className="text-[10px] text-red-500">clique para filtrar</div>
            </div>
            <Flame className="h-8 w-8 text-red-400" />
          </button>

          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500">
            <TrendingUp className="h-3 w-3" /> Top plantas (15+ dias)
          </div>
          <ul className="space-y-1 text-xs">
            {topPlantasBacklog.length === 0 && (
              <li className="text-slate-400">Nenhuma planta com backlog crítico.</li>
            )}
            {topPlantasBacklog.map((p) => (
              <li key={p.planta}>
                <button
                  onClick={() => togglePlanta(p.planta)}
                  className={`flex w-full items-center justify-between rounded border p-2 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb] ${fPlanta === p.planta ? "border-[#1f7ad6] bg-[#eaf3fb]" : "border-slate-100"}`}
                >
                  <span className="truncate font-medium text-[#0b3a73]">{p.planta.split(" - ")[0]}</span>
                  <span className="ml-2 shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                    {p.count} O.S.
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <MapPin className="mr-1 inline h-4 w-4" /> Mapa de elevatórias ({mapMarkers.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-end gap-1 pb-2">
            {fPlanta !== "TODAS" && (
              <button
                onClick={() => setFPlanta("TODAS")}
                className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
              >
                Limpar planta
              </button>
            )}
            <button
              onClick={() => setMapFitSignal((n) => n + 1)}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Crosshair className="h-3.5 w-3.5" /> Centralizar
            </button>
          </div>
          <div style={{ height: "70vh", width: "100%" }} className="overflow-hidden rounded-md bg-slate-100">
            {mapOpen && mounted && (
              <BacklogMap
                markers={mapMarkers}
                onSelect={togglePlanta}
                selectedPlanta={fPlanta === "TODAS" ? null : fPlanta}
                fitSignal={mapFitSignal}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-3 text-sm font-semibold text-[#0b3a73]">
          O.S. filtradas ({sortedRows.length})
        </div>
        <div className="max-h-[500px] overflow-auto">
          <table className="min-w-[900px] w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-[#eaf3fb] text-[12px] text-[#0b3a73]">
              <tr>
                {([
                  ["om", "Ordem"],
                  ["textoBreve", "Texto Breve"],
                  ["planta", "Planta"],
                  ["inicioSla", "Início SLA"],
                  ["tipo", "Tipo de Atividade"],
                ] as Array<[SortKey, string]>).map(([k, label]) => (
                  <th
                    key={k}
                    className="cursor-pointer whitespace-nowrap px-2 py-2 font-semibold hover:underline"
                    onClick={() => toggleSort(k)}
                  >
                    {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                ))}
                <th className="px-2 py-2 font-semibold">SLA</th>
                <th className="px-2 py-2 font-semibold">Resp.</th>
                <th className="px-2 py-2 font-semibold">Equipe</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((e, i) => (
                <tr key={`${e.om}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-2 py-1 font-mono text-[12px]">{e.om}</td>
                  <td className="px-2 py-1">{e.r["TEXTO BREVE"]}</td>
                  <td className="whitespace-nowrap px-2 py-1">{e.plantaShort}</td>
                  <td className="whitespace-nowrap px-2 py-1">{fmtDate(e.inicioSla)}</td>
                  <td className="px-2 py-1">{e.r["Tipo de Atividade"]}</td>
                  <td className="whitespace-nowrap px-2 py-1">
                    <span className={`rounded px-1 text-[11px] font-semibold ${e.slaStatus === "ATRASADO" ? "bg-red-100 text-red-700" : e.slaStatus === "NO PRAZO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {e.slaStatus}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-[12px]">{e.responsabilidade}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-[12px]">{e.equipe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />

      <p className="mt-4 text-center text-xs text-slate-500">
        Águas do Rio · Eletromecânica · Backlog Field/SAP
      </p>
    </div>
  );
}