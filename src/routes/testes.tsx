import { createFileRoute, Link } from "@tanstack/react-router";
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
import logoHeader from "@/assets/logo-branca.png";
import rawData from "@/data/testes.json";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Maximize2,
  X,
  Home,
  SlidersHorizontal,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

type SortMode = "az" | "za" | "desc" | "asc";
type TableSort = "recent" | "oldest" | "az" | "za";
type HydroTab = "eletrica" | "hidraulica";
type Metric = "tensao" | "corrente" | "recalque" | "retaguarda";
const METRIC_META: Record<Metric, { label: string; unit: string; decimals: number }> = {
  tensao: { label: "Tensão", unit: "V", decimals: 1 },
  corrente: { label: "Corrente", unit: "A", decimals: 2 },
  recalque: { label: "Recalque", unit: "mca", decimals: 1 },
  retaguarda: { label: "Retaguarda", unit: "mca", decimals: 1 },
};

const METRIC_COLORS: Record<Metric, string> = {
  tensao: "#1f7ad6",
  corrente: "#f59e0b",
  recalque: "#10b981",
  retaguarda: "#8b5cf6",
};
const METRIC_ORDER: Metric[] = ["tensao", "corrente", "recalque", "retaguarda"];

type MetricPoint = {
  t: number;
  date: string;
  tensao: number | null;
  corrente: number | null;
  recalque: number | null;
  retaguarda: number | null;
};

function parseAvg(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/,/g, ".");
  const nums = s.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return null;
  const arr = nums.map((n) => parseFloat(n)).filter((n) => Number.isFinite(n) && n !== 0);
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Extrai um único valor numérico (ex.: "7mca", "08mca" → 7, 8).
// Trata 0/00/vazio como dado ausente (teste não aferido).
function parseHydro(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(",", "."));
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

const OBSTR_RE = /(obstru|sem tomada|imposs[íi]vel|n[ãa]o foi poss[íi]vel|sem press[ãa]o)/i;

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
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function TestesPage() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCustomData, setHasCustomData] = useState(false);

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    novos: number;
    atualizados: number;
    ignorados: number;
    erros: { linha: number; motivo: string }[];
    rows: Row[];
  } | null>(null);
  const [importConfirming, setImportConfirming] = useState(false);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: supabaseData, error } = await supabase
          .from("testes_afericoes")
          .select("*")
          .order("data_teste", { ascending: false });

        if (error) {
          console.error("Erro ao buscar dados:", error);
          // Fallback to local data
          setData(DATA);
        } else if (supabaseData && supabaseData.length > 0) {
          // Convert from Supabase format to Row format
          const mappedData = (supabaseData as Array<Record<string, unknown>>).map((row) => {
            const r: Row = {
              Id: typeof row.id === "number" ? row.id : row.id ? Number(row.id) : null,
              "Hora de início": (row.hora_inicio as string) ?? null,
              "Hora de conclusão": (row.hora_conclusao as string) ?? null,
              Email: (row.email as string) ?? null,
              Nome: (row.nome as string) ?? null,
              "Data do Teste": (row.data_teste as string) ?? null,
              "Tipo de Serviço": (row.tipo_servico as string) ?? null,
              Elevatória: (row.elevatoria as string) ?? null,
              Grupo: (row.grupo as string) ?? null,
              "Tensão ( V )": (row.tensao_v as string) ?? null,
              "Corrente ( A )": (row.corrente_a as string) ?? null,
              Retaguarda: (row.retaguarda as string) ?? null,
              Recalque: (row.recalque as string) ?? null,
              "Corrente ShutOff": (row.corrente_shutoff as string) ?? null,
              "Retaguarda ShutOff": (row.retaguarda_shutoff as string) ?? null,
              "Recalque ShutOff": (row.recalque_shutoff as string) ?? null,
              "Impossibilidade:": (row.impossibilidade as string) ?? null,
              "Serviço Executado:": (row.servico_executado as string) ?? null,
              "Nome dos Colaboradores:": (row.nome_colaboradores as string) ?? null,
              "Observação:": (row.observacao as string) ?? null,
              "Na Chegada": (row.na_chegada as string) ?? null,
              "Na saida": (row.na_saida as string) ?? null,
              Status: (row.status as string) ?? null,
            };
            return r;
          });
          setData(mappedData);
        } else {
          setData(DATA);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setData(DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check for localStorage data as fallback
  useEffect(() => {
    if (!loading) return;
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
  }, [loading]);

  const TIPOS = useMemo(
    () =>
      (Array.from(new Set(data.map((d) => d["Tipo de Serviço"]).filter(Boolean))) as string[]).sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [data],
  );
  const GRUPOS = useMemo(() => {
    const nonEmpty = Array.from(
      new Set(data.map((d) => (d.Grupo ? String(d.Grupo) : null)).filter(Boolean)),
    ).sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true })) as string[];
    const hasEmpty = data.some((d) => !d.Grupo);
    return hasEmpty ? [...nonEmpty, "__VAZIO__"] : nonEmpty;
  }, [data]);
  const ELEVS = useMemo(
    () =>
      (Array.from(new Set(data.map((d) => d.Elevatória).filter(Boolean))) as string[]).sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [data],
  );
  const MESES_DISPONIVEIS = useMemo(() => {
    const s = new Set<string>();
    for (const d of data) {
      const k = monthKey(d["Data do Teste"]);
      if (k) s.add(k);
    }
    return Array.from(s).sort();
  }, [data]);

  const [tipo, setTipo] = useState<string>("TODOS");
  const [grupo, setGrupo] = useState<string>("TODOS");
  const [elev, setElev] = useState<string>("TODOS");
  const [mesIni, setMesIni] = useState<string>("TODOS");
  const [mesFim, setMesFim] = useState<string>("TODOS");
  // Cross-filters (Power BI style): temporary highlights from chart clicks
  const [crossElev, setCrossElev] = useState<string | null>(null);
  const [crossMes, setCrossMes] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [tableSort, setTableSort] = useState<TableSort>("recent");
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [hydroTab, setHydroTab] = useState<HydroTab>("eletrica");
  const [tableExpanded, setTableExpanded] = useState(false);
  const [obstrOnly, setObstrOnly] = useState(false);
  const [evoMetrics, setEvoMetrics] = useState<Metric[]>(["tensao"]);
  // Pré-selecionar métrica ao trocar de aba (garante ao menos uma da aba atual)
  useEffect(() => {
    setEvoMetrics((cur) => {
      const elet = cur.some((m) => m === "tensao" || m === "corrente");
      const hidr = cur.some((m) => m === "recalque" || m === "retaguarda");
      if (hydroTab === "eletrica" && !elet) return [...cur, "tensao"];
      if (hydroTab === "hidraulica" && !hidr) return [...cur, "recalque"];
      return cur;
    });
  }, [hydroTab]);
  const [zoomChart, setZoomChart] = useState<null | {
    title: string;
    data: { name: string; media: number; testes: number }[];
    unit: string;
  }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () =>
      data.filter((d) => {
        if (tipo !== "TODOS" && d["Tipo de Serviço"] !== tipo) return false;
        if (grupo !== "TODOS") {
          if (grupo === "__VAZIO__") {
            if (d.Grupo) return false;
          } else if (String(d.Grupo ?? "") !== grupo) {
            return false;
          }
        }
        if (elev !== "TODOS" && d.Elevatória !== elev) return false;
        const mk = monthKey(d["Data do Teste"]);
        if (mesIni !== "TODOS" && (!mk || mk < mesIni)) return false;
        if (mesFim !== "TODOS" && (!mk || mk > mesFim)) return false;
        if (crossElev && d.Elevatória !== crossElev) return false;
        if (crossMes && mk !== crossMes) return false;
        if (obstrOnly) {
          const t = `${d["Observação:"] ?? ""} ${d["Impossibilidade:"] ?? ""} ${d.Recalque ?? ""} ${d.Retaguarda ?? ""}`;
          if (!OBSTR_RE.test(t)) return false;
        }
        return true;
      }),
    [data, tipo, grupo, elev, mesIni, mesFim, crossElev, crossMes, obstrOnly],
  );

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? rows
      : rows.filter((r) =>
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
    const sorted = [...filtered];
    const dt = (r: Row) => (r["Data do Teste"] ? new Date(r["Data do Teste"]).getTime() : 0);
    switch (tableSort) {
      case "recent":
        sorted.sort((a, b) => dt(b) - dt(a));
        break;
      case "oldest":
        sorted.sort((a, b) => dt(a) - dt(b));
        break;
      case "az":
        sorted.sort((a, b) => (a.Elevatória ?? "").localeCompare(b.Elevatória ?? "", "pt-BR"));
        break;
      case "za":
        sorted.sort((a, b) => (b.Elevatória ?? "").localeCompare(a.Elevatória ?? "", "pt-BR"));
        break;
    }
    return sorted;
  }, [rows, search, tableSort]);

  const total = rows.length;
  const ativosUnicos = new Set(rows.map((r) => r.Elevatória).filter(Boolean)).size;

  // Enriquece cada linha com tensão/corrente numéricas e classe BT/MT.
  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const tensao = parseAvg(r["Tensão ( V )"]);
        const corrente = parseAvg(r["Corrente ( A )"]);
        return {
          r,
          tensao,
          corrente,
          classe: classifyTensao(tensao),
          recalque: parseHydro(r.Recalque),
          retaguarda: parseHydro(r.Retaguarda),
          recalqueSO: parseHydro(r["Recalque ShutOff"]),
          retaguardaSO: parseHydro(r["Retaguarda ShutOff"]),
        };
      }),
    [rows],
  );

  const mediaBy = (key: "tensao" | "corrente", classe: "BT" | "MT") => {
    const vals = enriched
      .filter((e) => e.classe === classe)
      .map((e) => e[key])
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(key === "tensao" ? 1 : 2);
  };

  const mediaTensaoBT = useMemo(() => mediaBy("tensao", "BT"), [enriched]);
  const mediaTensaoMT = useMemo(() => mediaBy("tensao", "MT"), [enriched]);
  const mediaCorrenteBT = useMemo(() => mediaBy("corrente", "BT"), [enriched]);
  const mediaCorrenteMT = useMemo(() => mediaBy("corrente", "MT"), [enriched]);

  const mediaHydro = (key: "recalque" | "retaguarda" | "recalqueSO" | "retaguardaSO") => {
    const vals = enriched.map((e) => e[key]).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };
  const mediaRecalque = useMemo(() => mediaHydro("recalque"), [enriched]);
  const mediaRetaguarda = useMemo(() => mediaHydro("retaguarda"), [enriched]);
  const mediaRecalqueSO = useMemo(() => mediaHydro("recalqueSO"), [enriched]);
  const mediaRetaguardaSO = useMemo(() => mediaHydro("retaguardaSO"), [enriched]);

  const aggHydroPorElev = (key: "recalque" | "retaguarda") => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const e of enriched) {
      const v = e[key];
      if (v === null || !e.r.Elevatória) continue;
      const cur = m.get(e.r.Elevatória) ?? { sum: 0, n: 0 };
      cur.sum += v;
      cur.n += 1;
      m.set(e.r.Elevatória, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, media: +(v.sum / v.n).toFixed(1), testes: v.n }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  };
  const recalquePorElev = useMemo(() => aggHydroPorElev("recalque"), [enriched]);
  const retaguardaPorElev = useMemo(() => aggHydroPorElev("retaguarda"), [enriched]);

  const obstrCount = useMemo(
    () =>
      rows.filter((r) => {
        const t = `${r["Observação:"] ?? ""} ${r["Impossibilidade:"] ?? ""} ${r.Recalque ?? ""} ${r.Retaguarda ?? ""}`;
        return OBSTR_RE.test(t);
      }).length,
    [rows],
  );

  // Elevatória "focada" (filtro fixo OU cross-filter)
  const focusedElev = elev !== "TODOS" ? elev : crossElev;

  // Série da métrica selecionada para a elevatória focada (respeita filtros de período)
  const metricSeries = useMemo(() => {
    if (!focusedElev) return [] as MetricPoint[];
    const out: MetricPoint[] = [];
    for (const r of rows) {
      if (r.Elevatória !== focusedElev) continue;
      const iso = r["Data do Teste"];
      if (!iso) continue;
      const d = new Date(iso);
      if (isNaN(d.getTime())) continue;
      out.push({
        t: d.getTime(),
        date: fmtDate(iso),
        tensao: parseAvg(r["Tensão ( V )"]),
        corrente: parseAvg(r["Corrente ( A )"]),
        recalque: parseHydro(r.Recalque),
        retaguarda: parseHydro(r.Retaguarda),
      });
    }
    return out.sort((a, b) => a.t - b.t);
  }, [rows, focusedElev]);

  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = monthKey(r["Data do Teste"]);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, testes]) => ({ name, testes, label: labelMes(name) }));
  }, [rows]);

  const aggPorElev = (key: "tensao" | "corrente", classe: "BT" | "MT", decimals: number) => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const e of enriched) {
      if (e.classe !== classe) continue;
      const v = e[key];
      if (v === null || !e.r.Elevatória) continue;
      const cur = m.get(e.r.Elevatória) ?? { sum: 0, n: 0 };
      cur.sum += v;
      cur.n += 1;
      m.set(e.r.Elevatória, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, media: +(v.sum / v.n).toFixed(decimals), testes: v.n }))
      .sort((a, b) => b.media - a.media);
  };

  const tensaoBTPorElev = useMemo(() => aggPorElev("tensao", "BT", 1), [enriched]);
  const tensaoMTPorElev = useMemo(() => aggPorElev("tensao", "MT", 1), [enriched]);
  const correnteBTPorElev = useMemo(() => aggPorElev("corrente", "BT", 2), [enriched]);
  const correnteMTPorElev = useMemo(() => aggPorElev("corrente", "MT", 2), [enriched]);

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

  // --- Import from Microsoft Forms Excel ---
  const COLUNAS_ESPERADAS = [
    "ID",
    "Hora de início",
    "Hora de conclusão",
    "Email",
    "Nome",
    "Hora da última modificação",
    "Data do Teste",
    "Tipo de Serviço",
    "Elevatória",
    "Grupo",
    "Tensão ( V )",
    "Corrente ( A )",
    "Retaguarda",
    "Recalque",
    "Corrente ShutOff",
    "Retaguarda ShutOff",
    "Recalque ShutOff",
    "Impossibilidade:",
    "Serviço Executado:",
    "Nome dos Colaboradores:",
    "Observação:",
    "Na Chegada",
    "Na saida",
    "Status",
  ];

  const COLUNA_MAP: Record<string, keyof Row> = {
    ID: "Id",
    "Hora de início": "Hora de início",
    "Hora de conclusão": "Hora de conclusão",
    Email: "Email",
    Nome: "Nome",
    "Data do Teste": "Data do Teste",
    "Tipo de Serviço": "Tipo de Serviço",
    Elevatória: "Elevatória",
    Grupo: "Grupo",
    "Tensão ( V )": "Tensão ( V )",
    "Corrente ( A )": "Corrente ( A )",
    Retaguarda: "Retaguarda",
    Recalque: "Recalque",
    "Corrente ShutOff": "Corrente ShutOff",
    "Retaguarda ShutOff": "Retaguarda ShutOff",
    "Recalque ShutOff": "Recalque ShutOff",
    "Impossibilidade:": "Impossibilidade:",
    "Serviço Executado:": "Serviço Executado:",
    "Nome dos Colaboradores:": "Nome dos Colaboradores:",
    "Observação:": "Observação:",
    "Na Chegada": "Na Chegada",
    "Na saida": "Na saida",
    Status: "Status",
  };

  function linhaVazia(row: Record<string, unknown>): boolean {
    const camposTeste = [
      "Data do Teste",
      "Tipo de Serviço",
      "Elevatória",
      "Grupo",
      "Tensão ( V )",
      "Corrente ( A )",
      "Retaguarda",
      "Recalque",
      "Corrente ShutOff",
      "Retaguarda ShutOff",
      "Recalque ShutOff",
      "Impossibilidade:",
      "Serviço Executado:",
      "Nome dos Colaboradores:",
      "Observação:",
      "Na Chegada",
      "Na saida",
      "Status",
    ];
    return camposTeste.every((c) => {
      const v = row[c];
      return v === null || v === undefined || String(v).trim() === "";
    });
  }

  function mapearLinha(row: Record<string, unknown>): Row {
    const out: Record<string, unknown> = {};
    for (const [colForms, colInternal] of Object.entries(COLUNA_MAP)) {
      const v = row[colForms];
      if (v !== null && v !== undefined) {
        if (v instanceof Date) {
          out[colInternal] = v.toISOString();
        } else {
          out[colInternal] = v;
        }
      }
    }
    if (out.Id !== undefined && out.Id !== null) {
      out.Id = Number(out.Id);
    }
    return out as unknown as Row;
  }

  async function carregarIdsExistentes(): Promise<Set<number>> {
    try {
      const { data, error } = await supabase.from("testes_afericoes").select("id");
      if (error) throw error;
      return new Set((data || []).map((r) => Number(r.id)));
    } catch {
      return new Set();
    }
  }

  async function upsertTestes(rows: Row[]): Promise<{
    inseridos: number;
    atualizados: number;
    erros: { linha: number; motivo: string }[];
  }> {
    const idsExistentes = await carregarIdsExistentes();
    let inseridos = 0;
    let atualizados = 0;
    const erros: { linha: number; motivo: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = row.Id;
      if (!id || isNaN(id)) {
        erros.push({ linha: i + 2, motivo: "ID inválido ou ausente" });
        continue;
      }

      const payload = {
        id: id,
        hora_inicio: row["Hora de início"] || null,
        hora_conclusao: row["Hora de conclusão"] || null,
        email: row.Email || null,
        nome: row.Nome || null,
        data_teste: row["Data do Teste"]
          ? new Date(row["Data do Teste"]).toISOString().split("T")[0]
          : null,
        tipo_servico: row["Tipo de Serviço"] || null,
        elevatoria: row.Elevatória || null,
        grupo: row.Grupo ? String(row.Grupo) : null,
        tensao_v: row["Tensão ( V )"] || null,
        corrente_a: row["Corrente ( A )"] || null,
        retaguarda: row.Retaguarda || null,
        recalque: row.Recalque || null,
        corrente_shutoff: row["Corrente ShutOff"] || null,
        retaguarda_shutoff: row["Retaguarda ShutOff"] || null,
        recalque_shutoff: row["Recalque ShutOff"] || null,
        impossibilidade: row["Impossibilidade:"] || null,
        servico_executado: row["Serviço Executado:"] || null,
        nome_colaboradores: row["Nome dos Colaboradores:"] || null,
        observacao: row["Observação:"] || null,
        na_chegada: row["Na Chegada"] || null,
        na_saida: row["Na saida"] || null,
        status: row.Status || null,
        criado_por: "IMPORTACAO_PLANILHA",
        atualizado_em: new Date().toISOString(),
      };

      try {
        const { error } = await supabase
          .from("testes_afericoes")
          .upsert(payload, { onConflict: "id" });

        if (error) throw error;

        if (idsExistentes.has(id)) {
          atualizados++;
        } else {
          inseridos++;
          idsExistentes.add(id);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        erros.push({ linha: i + 2, motivo: message });
      }
    }

    return { inseridos, atualizados, erros };
  }

  const handleImportFileSelect = async (file: File) => {
    setImportFile(file);
    setImportPreview(null);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

      if (!json.length) {
        alert("Planilha vazia ou inválida.");
        return;
      }

      // Normalize column names
      const normalized = json.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          const nk = k.replace(/\n/g, "").trim();
          let nv: unknown = v;
          if (v instanceof Date) nv = v.toISOString();
          out[nk] = nv;
        }
        return out;
      });

      // Check columns
      const firstRow = normalized[0];
      const cols = Object.keys(firstRow);
      const missing = COLUNAS_ESPERADAS.filter((c) => !cols.includes(c));
      if (missing.length > 0) {
        alert(
          `Formato de planilha não reconhecido. Colunas faltando: ${missing.join(", ")}. Verifique se é a exportação padrão do Microsoft Forms.`,
        );
        return;
      }

      // Process rows
      let ignorados = 0;
      const erros: { linha: number; motivo: string }[] = [];
      const rowsParaImportar: Row[] = [];

      for (let i = 0; i < normalized.length; i++) {
        const row = normalized[i];

        // Skip empty rows (only metadata filled)
        if (linhaVazia(row)) {
          ignorados++;
          continue;
        }

        const id = row["ID"];
        if (!id || isNaN(Number(id))) {
          erros.push({ linha: i + 2, motivo: "ID inválido ou ausente" });
          continue;
        }

        const mapped = mapearLinha(row);
        rowsParaImportar.push(mapped);
      }

      // Show preview
      setImportPreview({
        novos: rowsParaImportar.filter((r) => !data.some((d) => d.Id === r.Id)).length,
        atualizados: rowsParaImportar.filter((r) => data.some((d) => d.Id === r.Id)).length,
        ignorados,
        erros,
        rows: rowsParaImportar,
      });
      setImportModalOpen(true);
    } catch (err) {
      console.error(err);
      alert("Falha ao ler a planilha.");
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;

    setImportConfirming(true);
    try {
      const resultado = await upsertTestes(importPreview.rows);

      // Reload data from Supabase
      const { data: supabaseData, error } = await supabase
        .from("testes_afericoes")
        .select("*")
        .order("data_teste", { ascending: false });

      if (!error && supabaseData) {
        const mappedData = (supabaseData as Array<Record<string, unknown>>).map((row) => {
          const r: Row = {
            Id: typeof row.id === "number" ? row.id : row.id ? Number(row.id) : null,
            "Hora de início": (row.hora_inicio as string) ?? null,
            "Hora de conclusão": (row.hora_conclusao as string) ?? null,
            Email: (row.email as string) ?? null,
            Nome: (row.nome as string) ?? null,
            "Data do Teste": (row.data_teste as string) ?? null,
            "Tipo de Serviço": (row.tipo_servico as string) ?? null,
            Elevatória: (row.elevatoria as string) ?? null,
            Grupo: (row.grupo as string) ?? null,
            "Tensão ( V )": (row.tensao_v as string) ?? null,
            "Corrente ( A )": (row.corrente_a as string) ?? null,
            Retaguarda: (row.retaguarda as string) ?? null,
            Recalque: (row.recalque as string) ?? null,
            "Corrente ShutOff": (row.corrente_shutoff as string) ?? null,
            "Retaguarda ShutOff": (row.retaguarda_shutoff as string) ?? null,
            "Recalque ShutOff": (row.recalque_shutoff as string) ?? null,
            "Impossibilidade:": (row.impossibilidade as string) ?? null,
            "Serviço Executado:": (row.servico_executado as string) ?? null,
            "Nome dos Colaboradores:": (row.nome_colaboradores as string) ?? null,
            "Observação:": (row.observacao as string) ?? null,
            "Na Chegada": (row.na_chegada as string) ?? null,
            "Na saida": (row.na_saida as string) ?? null,
            Status: (row.status as string) ?? null,
          };
          return r;
        });
        setData(mappedData);
      }

      setImportModalOpen(false);
      setImportPreview(null);
      setImportFile(null);

      const msg = `${resultado.inseridos} registros importados, ${resultado.atualizados} atualizados${resultado.erros.length > 0 ? `, ${resultado.erros.length} erros` : ""}`;
      alert(msg);
    } catch (err) {
      console.error(err);
      alert("Erro ao importar dados.");
    } finally {
      setImportConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
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
              <p className="truncate text-sm text-cyan-50/90">
                Eletromecânica · Testes e aferições
              </p>
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
      <h1 className="mb-3 text-base font-bold text-[#0b3a73] sm:text-lg dark:text-white">
        Testes & Aferições de Ativos
      </h1>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Kpi label="Total de Testes" value={total} />
        <Kpi label="Ativos Atendidos" value={ativosUnicos} />
      </div>

      <details className="mb-4 rounded-md border border-slate-200 bg-white shadow-sm sm:hidden dark:border-slate-700 dark:bg-slate-800">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0b3a73] dark:text-white" />
            Filtros
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-400">toque para expandir</span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-slate-100 p-3 dark:border-slate-700">
          <FilterSelect
            label="TIPO DE SERVIÇO"
            value={tipo}
            onChange={setTipo}
            options={TIPOS}
            block
          />
          <FilterSelect
            label="GRUPO"
            value={grupo}
            onChange={setGrupo}
            options={GRUPOS}
            renderOption={(v) => (v === "__VAZIO__" ? "(Vazio)" : v)}
            block
          />
          <SearchableSelect
            label="ELEVATÓRIA"
            value={elev}
            onChange={setElev}
            options={ELEVS}
            placeholder="Buscar elevatória..."
            block
          />
          <FilterSelect
            label="MÊS INICIAL"
            value={mesIni}
            onChange={setMesIni}
            options={MESES_DISPONIVEIS}
            renderOption={labelMes}
            block
          />
          <FilterSelect
            label="MÊS FINAL"
            value={mesFim}
            onChange={setMesFim}
            options={MESES_DISPONIVEIS}
            renderOption={labelMes}
            block
          />
          {(tipo !== "TODOS" ||
            grupo !== "TODOS" ||
            elev !== "TODOS" ||
            mesIni !== "TODOS" ||
            mesFim !== "TODOS") && (
            <button
              type="button"
              onClick={() => {
                setTipo("TODOS");
                setGrupo("TODOS");
                setElev("TODOS");
                setMesIni("TODOS");
                setMesFim("TODOS");
              }}
              className="min-h-11 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Limpar filtros
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="min-h-11 inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <Upload className="h-4 w-4" />
            Importar
          </button>
        </div>
      </details>

      <div className="mb-4 hidden flex-wrap items-center gap-3 sm:flex">
        <FilterSelect label="TIPO DE SERVIÇO" value={tipo} onChange={setTipo} options={TIPOS} />
        <FilterSelect
          label="GRUPO"
          value={grupo}
          onChange={setGrupo}
          options={GRUPOS}
          renderOption={(v) => (v === "__VAZIO__" ? "(Vazio)" : v)}
        />
        <SearchableSelect
          label="ELEVATÓRIA"
          value={elev}
          onChange={setElev}
          options={ELEVS}
          placeholder="Buscar elevatória..."
        />
        <FilterSelect
          label="MÊS INICIAL"
          value={mesIni}
          onChange={setMesIni}
          options={MESES_DISPONIVEIS}
          renderOption={labelMes}
        />
        <FilterSelect
          label="MÊS FINAL"
          value={mesFim}
          onChange={setMesFim}
          options={MESES_DISPONIVEIS}
          renderOption={labelMes}
        />
        {(tipo !== "TODOS" ||
          grupo !== "TODOS" ||
          elev !== "TODOS" ||
          mesIni !== "TODOS" ||
          mesFim !== "TODOS") && (
          <button
            type="button"
            onClick={() => {
              setTipo("TODOS");
              setGrupo("TODOS");
              setElev("TODOS");
              setMesIni("TODOS");
              setMesFim("TODOS");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            Limpar filtros
          </button>
        )}
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="ml-2 inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <Upload className="h-4 w-4" />
          Importar
        </button>
      </div>

      {(crossElev || crossMes) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Cross-filter ativo:
          </span>
          {crossElev && (
            <CrossChip label={`Elevatória: ${crossElev}`} onClear={() => setCrossElev(null)} />
          )}
          {crossMes && (
            <CrossChip label={`Mês: ${labelMes(crossMes)}`} onClear={() => setCrossMes(null)} />
          )}
          <button
            type="button"
            onClick={() => {
              setCrossElev(null);
              setCrossMes(null);
            }}
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400"
          >
            limpar todos
          </button>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Evolução mensal de testes" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={porMes}
              margin={{ left: 10, right: 20, top: 10 }}
              onClick={(e: any) => {
                const p = e?.activePayload?.[0]?.payload;
                if (!p?.name) return;
                setCrossMes((cur) => (cur === p.name ? null : p.name));
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [v, "Testes"]}
                labelFormatter={(l) => `Mês: ${l}`}
              />
              <Legend />
              <Line
                type="monotone"
                name="Testes"
                dataKey="testes"
                stroke={BLUE}
                strokeWidth={2.5}
                dot={(props: any) => {
                  const active = crossMes === props.payload?.name;
                  return (
                    <circle
                      key={props.key ?? `${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={active ? 6 : 3}
                      fill={active ? "#e11d48" : BLUE_DARK}
                      stroke={active ? "#fff" : "none"}
                      strokeWidth={active ? 2 : 0}
                      style={{ cursor: "pointer" }}
                    />
                  );
                }}
                activeDot={{ r: 6, style: { cursor: "pointer" } }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-400">
            Clique em um ponto para filtrar pelo mês.
          </p>
        </Card>
        <MetricEvolutionChart
          className="lg:col-span-3"
          series={metricSeries}
          metrics={evoMetrics}
          onMetricsChange={setEvoMetrics}
          elevName={focusedElev}
        />
      </div>

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-700">
          <button
            type="button"
            onClick={() => setHydroTab("eletrica")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition ${
              hydroTab === "eletrica"
                ? "bg-[#0b3a73] text-white shadow"
                : "text-slate-600 hover:text-[#0b3a73] dark:text-slate-400"
            }`}
          >
            ⚡ Elétrica
          </button>
          <button
            type="button"
            onClick={() => setHydroTab("hidraulica")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition ${
              hydroTab === "hidraulica"
                ? "bg-[#0b3a73] text-white shadow"
                : "text-slate-600 hover:text-[#0b3a73] dark:text-slate-400"
            }`}
          >
            💧 Hidráulica
          </button>
        </div>

        {hydroTab === "eletrica" ? (
          <div className="animate-in fade-in duration-200">
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi
                label="Média de Tensão (BT)"
                value={mediaTensaoBT !== null ? `${mediaTensaoBT} V` : "—"}
                hint="≤ 300 V"
              />
              <Kpi
                label="Média de Tensão (MT)"
                value={mediaTensaoMT !== null ? `${mediaTensaoMT} V` : "—"}
                hint="≥ 380 V"
              />
              <Kpi
                label="Média de Corrente (BT)"
                value={mediaCorrenteBT !== null ? `${mediaCorrenteBT} A` : "—"}
                hint="≤ 300 V"
              />
              <Kpi
                label="Média de Corrente (MT)"
                value={mediaCorrenteMT !== null ? `${mediaCorrenteMT} A` : "—"}
                hint="≥ 380 V"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ScrollChart
                title="Média de Tensão por Elevatória — BT"
                data={tensaoBTPorElev}
                unit="V"
                activeName={crossElev}
                onBarClick={(name) => setCrossElev((cur) => (cur === name ? null : name))}
                onExpand={() =>
                  setZoomChart({
                    title: "Média de Tensão por Elevatória — BT",
                    data: tensaoBTPorElev,
                    unit: "V",
                  })
                }
              />
              <ScrollChart
                title="Média de Tensão por Elevatória — MT"
                data={tensaoMTPorElev}
                unit="V"
                activeName={crossElev}
                onBarClick={(name) => setCrossElev((cur) => (cur === name ? null : name))}
                onExpand={() =>
                  setZoomChart({
                    title: "Média de Tensão por Elevatória — MT",
                    data: tensaoMTPorElev,
                    unit: "V",
                  })
                }
              />
              <ScrollChart
                title="Média de Corrente por Elevatória — BT"
                data={correnteBTPorElev}
                unit="A"
                activeName={crossElev}
                onBarClick={(name) => setCrossElev((cur) => (cur === name ? null : name))}
                onExpand={() =>
                  setZoomChart({
                    title: "Média de Corrente por Elevatória — BT",
                    data: correnteBTPorElev,
                    unit: "A",
                  })
                }
              />
              <ScrollChart
                title="Média de Corrente por Elevatória — MT"
                data={correnteMTPorElev}
                unit="A"
                activeName={crossElev}
                onBarClick={(name) => setCrossElev((cur) => (cur === name ? null : name))}
                onExpand={() =>
                  setZoomChart({
                    title: "Média de Corrente por Elevatória — MT",
                    data: correnteMTPorElev,
                    unit: "A",
                  })
                }
              />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi
                label="Média de Recalque"
                value={mediaRecalque !== null ? `${mediaRecalque} mca` : "—"}
                hint="pressão de saída"
              />
              <Kpi
                label="Média de Retaguarda"
                value={mediaRetaguarda !== null ? `${mediaRetaguarda} mca` : "—"}
                hint="pressão de entrada"
              />
              <Kpi
                label="Média Recalque SHUTOFF"
                value={mediaRecalqueSO !== null ? `${mediaRecalqueSO} mca` : "—"}
                hint="pressão fechada"
              />
              <Kpi
                label="Média Retaguarda SHUTOFF"
                value={mediaRetaguardaSO !== null ? `${mediaRetaguardaSO} mca` : "—"}
                hint="pressão fechada"
              />
            </div>
            {obstrCount > 0 && (
              <button
                type="button"
                onClick={() => setObstrOnly((v) => !v)}
                title={
                  obstrOnly
                    ? "Remover filtro de obstrução"
                    : "Filtrar apenas registros com obstrução"
                }
                className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  obstrOnly
                    ? "border-amber-500 bg-amber-500 text-white shadow"
                    : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                ⚠ {obstrCount} registro{obstrCount > 1 ? "s" : ""} com obstrução / impossibilidade
                de aferir recalque ou retaguarda
                {obstrOnly && <X className="h-3 w-3" />}
              </button>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <ScrollChart
                title="Média de Recalque por Elevatória"
                data={recalquePorElev}
                unit="mca"
                activeName={crossElev}
                onBarClick={(name) => setCrossElev((cur) => (cur === name ? null : name))}
                onExpand={() =>
                  setZoomChart({
                    title: "Média de Recalque por Elevatória",
                    data: recalquePorElev,
                    unit: "mca",
                  })
                }
              />
              <ScrollChart
                title="Média de Retaguarda por Elevatória"
                data={retaguardaPorElev}
                unit="mca"
                activeName={crossElev}
                onBarClick={(name) => setCrossElev((cur) => (cur === name ? null : name))}
                onExpand={() =>
                  setZoomChart({
                    title: "Média de Retaguarda por Elevatória",
                    data: retaguardaPorElev,
                    unit: "mca",
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Registros</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tableSort}
              onChange={(e) => setTableSort(e.target.value as TableSort)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="recent">Mais recente → mais antigo</option>
              <option value="oldest">Mais antigo → mais recente</option>
              <option value="az">Elevatória A → Z</option>
              <option value="za">Elevatória Z → A</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar elevatória, colaborador, serviço..."
              className="w-72 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-sm focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
            <button
              type="button"
              onClick={() => setTableExpanded(true)}
              title="Expandir"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] dark:text-slate-400"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Mostrando {tableRows.length} de {data.length} testes
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 dark:bg-slate-700">
                  Data
                </th>
                <th className="px-2 py-1.5">Elevatória</th>
                <th className="px-2 py-1.5">Grupo</th>
                <th className="px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5">Colaboradores</th>
                <th className="px-2 py-1.5">Serviço Executado</th>
                <th className="px-2 py-1.5">Observação</th>
                <th className="px-2 py-1.5">Tensão (V)</th>
                <th className="px-2 py-1.5">Corrente (A)</th>
                <th className="px-2 py-1.5">Recalque</th>
                <th className="px-2 py-1.5">Retaguarda</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const rowKey = `${r.Id ?? "row"}-${i}`;
                return (
                  <tr
                    key={rowKey}
                    className="border-t border-slate-100 hover:bg-slate-50 align-top dark:border-slate-700"
                  >
                    <td className="sticky left-0 z-10 bg-white px-2 py-1 whitespace-nowrap shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:bg-slate-800">
                      {fmtDate(r["Data do Teste"])}
                    </td>
                    <td className="px-2 py-1 dark:border-slate-700">{r.Elevatória}</td>
                    <td className="px-2 py-1 dark:border-slate-700">{r.Grupo}</td>
                    <td className="px-2 py-1 dark:border-slate-700">{r["Tipo de Serviço"]}</td>
                    <td className="px-2 py-1 dark:border-slate-700">
                      {r["Nome dos Colaboradores:"]}
                    </td>
                    <ExpandableCell
                      value={r["Serviço Executado:"]}
                      cellKey={`${rowKey}-serv`}
                      expandedKey={expandedCell}
                      onToggle={setExpandedCell}
                    />
                    <ExpandableCell
                      value={r["Observação:"]}
                      cellKey={`${rowKey}-obs`}
                      expandedKey={expandedCell}
                      onToggle={setExpandedCell}
                    />
                    <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                      {r["Tensão ( V )"] ?? ""}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                      {r["Corrente ( A )"] ?? ""}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                      {r.Recalque ?? ""}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                      {r.Retaguarda ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
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
          className="fixed bottom-2 right-7 rounded bg-white/80 px-2 py-0.5 text-[10px] text-slate-500 shadow-sm hover:bg-white dark:text-slate-400"
        >
          restaurar
        </button>
      )}
      <Dialog open={!!zoomChart} onOpenChange={(o) => !o && setZoomChart(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{zoomChart?.title}</DialogTitle>
          </DialogHeader>
          {zoomChart && (
            <ExpandedBarChart
              data={zoomChart.data}
              unit={zoomChart.unit}
              activeName={crossElev}
              onBarClick={(name) => setCrossElev((cur) => (cur === name ? null : name))}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={tableExpanded} onOpenChange={setTableExpanded}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              Registros — {tableRows.length} de {data.length} testes
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
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
                  <th className="px-2 py-1.5">Recalque</th>
                  <th className="px-2 py-1.5">Retaguarda</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => {
                  const rowKey = `exp-${r.Id ?? "row"}-${i}`;
                  return (
                    <tr
                      key={rowKey}
                      className="border-t border-slate-100 hover:bg-slate-50 align-top dark:border-slate-700"
                    >
                      <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                        {fmtDate(r["Data do Teste"])}
                      </td>
                      <td className="px-2 py-1 dark:border-slate-700">{r.Elevatória}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r.Grupo}</td>
                      <td className="px-2 py-1 dark:border-slate-700">{r["Tipo de Serviço"]}</td>
                      <td className="px-2 py-1 dark:border-slate-700">
                        {r["Nome dos Colaboradores:"]}
                      </td>
                      <td className="px-2 py-1 whitespace-normal dark:border-slate-700">
                        {r["Serviço Executado:"]}
                      </td>
                      <td className="px-2 py-1 whitespace-normal dark:border-slate-700">
                        {r["Observação:"]}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                        {r["Tensão ( V )"] ?? ""}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                        {r["Corrente ( A )"] ?? ""}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                        {r.Recalque ?? ""}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap dark:border-slate-700">
                        {r.Retaguarda ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal - File Selection */}
      <Dialog open={importModalOpen && !importPreview} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Planilha (Excel)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="mb-2">
              Envie a planilha exportada do Microsoft Forms no formato padrão (mesmas colunas do
              formulário de Testes & Aferições).
            </p>
            <p className="mb-4 text-xs text-slate-400">
              O arquivo deve conter as colunas: ID, Hora de início, Hora de conclusão, Email, Nome,
              Hora da última modificação, Data do Teste, Tipo de Serviço, Elevatória, Grupo, Tensão
              ( V ), Corrente ( A ), Retaguarda, Recalque, Corrente ShutOff, Retaguarda ShutOff,
              Recalque ShutOff, Impossibilidade:, Serviço Executado:, Nome dos Colaboradores:,
              Observação:, Na Chegada, Na saida, Status
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFileSelect(f);
                e.target.value = "";
              }}
              className="block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-[#0b3a73] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#1f7ad6]"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal - Preview/Confirm */}
      <Dialog
        open={importPreview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImportPreview(null);
            setImportFile(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Confirmar Importação
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {importPreview ? (
              <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {importPreview.novos}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Novos</div>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {importPreview.atualizados}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Atualizados</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {importPreview.ignorados}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Ignorados (vazios)</div>
                </div>
              </div>

              {importPreview.erros.length > 0 && (
                <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                  <h4 className="mb-2 text-sm font-medium text-red-700 dark:text-red-400">
                    Erros de validação ({importPreview.erros.length}):
                  </h4>
                  <ul className="text-xs text-red-600 dark:text-red-400 max-h-32 overflow-auto">
                    {importPreview.erros.map((e, i) => (
                      <li key={i}>
                        Linha {e.linha}: {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportPreview(null);
                    setImportFile(null);
                  }}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importConfirming}
                  className="rounded bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
                >
                  {importConfirming ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </span>
                  ) : (
                    "Confirmar importação"
                  )}
                </button>
              </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center">Abrindo...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  renderOption,
  block,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  renderOption?: (v: string) => string;
  block?: boolean;
}) {
  return (
    <div className={block ? "flex flex-col gap-1" : "flex items-center gap-2"}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal sm:text-slate-700 dark:text-slate-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${block ? "w-full" : "max-w-[260px]"} min-h-11 truncate rounded border border-slate-300 bg-white px-3 py-1.5 text-base shadow-sm sm:min-h-0 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}
      >
        <option value="TODOS">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CrossChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-[#0b3a73] dark:bg-blue-900/40 dark:text-white">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 hover:bg-blue-200"
        aria-label="Remover"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ExpandableCell({
  value,
  cellKey,
  expandedKey,
  onToggle,
}: {
  value: string | null;
  cellKey: string;
  expandedKey: string | null;
  onToggle: (k: string | null) => void;
}) {
  const v = value ?? "";
  const isExpanded = expandedKey === cellKey;
  const long = v.length > 60;
  if (!v) return <td className="px-2 py-1" />;
  if (!long) return <td className="px-2 py-1">{v}</td>;
  return (
    <td className="px-2 py-1 max-w-[260px]">
      <button
        type="button"
        title={v}
        onClick={() => onToggle(isExpanded ? null : cellKey)}
        className={`text-left w-full ${isExpanded ? "whitespace-normal" : "truncate line-clamp-1"} cursor-pointer text-slate-700 hover:text-[#0b3a73] dark:text-slate-200`}
      >
        {isExpanded ? v : v.slice(0, 60) + "…"}
      </button>
    </td>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="text-xl font-bold text-[#0b3a73] dark:text-white">{value}</div>
      {hint && <div className="text-[10px] text-slate-400 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  block,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const display = value === "TODOS" ? "Todos" : value;
  return (
    <div className={block ? "flex flex-col gap-1" : "flex items-center gap-2"}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal sm:text-slate-700 dark:text-slate-400">
        {label}
      </label>
      <div ref={ref} className={`relative ${block ? "w-full" : ""}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`${block ? "w-full" : "w-[260px]"} min-h-11 truncate rounded border border-slate-300 bg-white px-3 py-1.5 text-left text-base shadow-sm hover:bg-slate-50 sm:min-h-0 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}
        >
          {display}
        </button>
        {open && (
          <div
            className={`absolute z-20 mt-1 rounded-md border border-slate-200 bg-white shadow-lg ${block ? "w-full" : "w-[300px]"} dark:border-slate-700 dark:bg-slate-800`}
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder ?? "Buscar..."}
              className="w-full rounded-t-md border-b border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <ul className="max-h-64 overflow-auto py-1 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange("TODOS");
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-3 py-1 text-left hover:bg-blue-50 ${value === "TODOS" ? "bg-blue-50 font-semibold text-[#0b3a73]" : ""} dark:hover:bg-blue-900/30 dark:text-slate-200`}
                >
                  Todos
                </button>
              </li>
              {filtered.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`block w-full px-3 py-1 text-left hover:bg-blue-50 ${value === o ? "bg-blue-50 font-semibold text-[#0b3a73]" : ""} dark:hover:bg-blue-900/30 dark:text-slate-200`}
                  >
                    {o}
                  </button>
                </li>
              ))}
              {!filtered.length && (
                <li className="px-3 py-2 text-xs text-slate-400 dark:text-slate-400">
                  Nenhum resultado
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function labelMes(yyyymm: string) {
  const [y, m] = yyyymm.split("-").map(Number);
  if (!y || !m) return yyyymm;
  return `${MONTH_LABELS[m - 1]}/${String(y).slice(2)}`;
}

function sortChartData(data: { name: string; media: number; testes: number }[], mode: SortMode) {
  const arr = [...data];
  switch (mode) {
    case "az":
      arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      break;
    case "za":
      arr.sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
      break;
    case "desc":
      arr.sort((a, b) => b.media - a.media);
      break;
    case "asc":
      arr.sort((a, b) => a.media - b.media);
      break;
  }
  return arr;
}

function SortSelect({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortMode)}
      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
    >
      <option value="az">A → Z</option>
      <option value="za">Z → A</option>
      <option value="desc">Maior → Menor</option>
      <option value="asc">Menor → Maior</option>
    </select>
  );
}

function ScrollChart({
  title,
  data,
  unit,
  activeName,
  onBarClick,
  onExpand,
}: {
  title: string;
  data: { name: string; media: number; testes: number }[];
  unit: string;
  activeName?: string | null;
  onBarClick?: (name: string) => void;
  onExpand?: () => void;
}) {
  const [sort, setSort] = useState<SortMode>("az");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? data.filter((d) => d.name.toLowerCase().includes(q)) : data;
  }, [data, query]);
  const sorted = useMemo(() => sortChartData(filtered, sort), [filtered, sort]);
  const ROW = 30;
  const innerHeight = Math.max(sorted.length * ROW + 40, 160);
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="h-7 w-36 rounded border border-slate-200 bg-white px-2 text-xs focus:border-[#0b3a73] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <SortSelect value={sort} onChange={setSort} />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {sorted.length} ativos
          </span>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              title="Expandir"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] dark:text-slate-400"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-xs text-slate-400 dark:text-slate-400">
          Sem dados para esta classe de tensão.
        </div>
      ) : (
        <div className="max-h-[360px] overflow-y-auto pr-1">
          <div style={{ height: innerHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ left: 0, right: 60, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={260}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <Tooltip formatter={(v: number) => [`${v} ${unit}`, "Média"]} />
                <Bar
                  dataKey="media"
                  fill={BLUE}
                  barSize={16}
                  radius={[0, 4, 4, 0]}
                  onClick={(d: any) => onBarClick?.(d?.name)}
                  style={{ cursor: onBarClick ? "pointer" : "default" }}
                  shape={(props: any) => {
                    const active = activeName && props.payload?.name === activeName;
                    return (
                      <rect
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                        rx={2}
                        fill={active ? "#e11d48" : BLUE}
                        opacity={activeName && !active ? 0.35 : 1}
                      />
                    );
                  }}
                >
                  <LabelList
                    dataKey="media"
                    position="right"
                    style={{ fontSize: 10, fontWeight: 700, fill: BLUE_DARK }}
                    formatter={(v: number) => `${v} ${unit}`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpandedBarChart({
  data,
  unit,
  activeName,
  onBarClick,
}: {
  data: { name: string; media: number; testes: number }[];
  unit: string;
  activeName?: string | null;
  onBarClick?: (name: string) => void;
}) {
  const [sort, setSort] = useState<SortMode>("desc");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? data.filter((d) => d.name.toLowerCase().includes(q)) : data;
  }, [data, query]);
  const sorted = useMemo(() => sortChartData(filtered, sort), [filtered, sort]);
  const ROW = 30;
  const innerHeight = Math.max(sorted.length * ROW + 40, 260);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar elevatória..."
            className="h-8 w-56 rounded border border-slate-200 bg-white px-2 text-xs focus:border-[#0b3a73] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <SortSelect value={sort} onChange={setSort} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{sorted.length} ativos</span>
      </div>
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        <div style={{ height: innerHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ left: 10, right: 70, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={260}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <Tooltip formatter={(v: number) => [`${v} ${unit}`, "Média"]} />
              <Bar
                dataKey="media"
                fill={BLUE}
                barSize={18}
                radius={[0, 4, 4, 0]}
                onClick={(d: any) => onBarClick?.(d?.name)}
                style={{ cursor: onBarClick ? "pointer" : "default" }}
                shape={(props: any) => {
                  const active = activeName && props.payload?.name === activeName;
                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      rx={2}
                      fill={active ? "#e11d48" : BLUE}
                      opacity={activeName && !active ? 0.35 : 1}
                    />
                  );
                }}
              >
                <LabelList
                  dataKey="media"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: BLUE_DARK }}
                  formatter={(v: number) => `${v} ${unit}`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
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
    <div
      className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className ?? ""}`}
    >
      <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      {children}
    </div>
  );
}

function MetricEvolutionChart({
  className,
  series,
  metrics,
  onMetricsChange,
  elevName,
}: {
  className?: string;
  series: MetricPoint[];
  metrics: Metric[];
  onMetricsChange: (m: Metric[]) => void;
  elevName: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = METRIC_ORDER.filter((m) => metrics.includes(m));

  // Agrupar unidades → yAxisIds (máx 2 eixos)
  const units = Array.from(new Set(selected.map((m) => METRIC_META[m].unit)));
  const axisForUnit: Record<string, "left" | "right"> = {};
  units.slice(0, 2).forEach((u, i) => (axisForUnit[u] = i === 0 ? "left" : "right"));
  const multiUnitWarn = units.length > 2;

  const title = elevName
    ? `Evolução de Métricas — ${elevName}`
    : "Evolução de Métricas por Elevatória";

  const toggle = (m: Metric) => {
    if (metrics.includes(m)) {
      if (metrics.length === 1) return; // manter ao menos 1
      onMetricsChange(metrics.filter((x) => x !== m));
    } else {
      onMetricsChange([...metrics, m]);
    }
  };

  return (
    <div
      className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className ?? ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        <div className="relative flex items-center gap-2">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Métricas
          </label>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm hover:border-[#0b3a73] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {selected.length} selecionada{selected.length > 1 ? "s" : ""}
            <span className="text-slate-400 dark:text-slate-400">▾</span>
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {METRIC_ORDER.map((m) => {
                  const checked = metrics.includes(m);
                  return (
                    <label
                      key={m}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(m)}
                        className="h-3.5 w-3.5"
                      />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ background: METRIC_COLORS[m] }}
                      />
                      <span>
                        {METRIC_META[m].label} ({METRIC_META[m].unit})
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      {!elevName ? (
        <div className="flex h-[240px] items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          Selecione uma elevatória (no filtro ou clicando em uma barra) para ver a
          <br />
          evolução de métricas técnicas.
        </div>
      ) : series.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-xs text-slate-400 dark:text-slate-400">
          Sem leituras para esta elevatória no período.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ left: 10, right: 20, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              {units.slice(0, 2).map((u, i) => {
                const side = i === 0 ? "left" : "right";
                const stroke =
                  METRIC_COLORS[selected.find((m) => METRIC_META[m].unit === u) as Metric];
                return (
                  <YAxis
                    key={u}
                    yAxisId={side}
                    orientation={side as "left" | "right"}
                    tick={{ fontSize: 11, fill: stroke }}
                    stroke={stroke}
                    label={{
                      value: u,
                      angle: -90,
                      position: side === "left" ? "insideLeft" : "insideRight",
                      fontSize: 11,
                      fill: stroke,
                    }}
                  />
                );
              })}
              <Tooltip
                formatter={(v: any, n: any) => {
                  const name = String(n);
                  if (v === null || v === undefined) return ["—", name];
                  const meta = METRIC_META[name as Metric];
                  if (!meta) return [v as any, name];
                  return [`${v} ${meta.unit}`, meta.label];
                }}
                labelFormatter={(l) => `Data: ${l}`}
              />
              <Legend
                formatter={(value: string) => {
                  const meta = METRIC_META[value as Metric];
                  return meta ? meta.label : value;
                }}
              />
              {selected.map((m) => {
                const yId = axisForUnit[METRIC_META[m].unit] ?? "left";
                const color = METRIC_COLORS[m];
                return (
                  <Line
                    key={m}
                    type="monotone"
                    name={m}
                    dataKey={m}
                    yAxisId={yId}
                    stroke={color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 space-y-0.5 text-[10px] text-slate-400 dark:text-slate-400">
            <p>
              {series.length} ponto{series.length > 1 ? "s" : ""}
            </p>
            {multiUnitWarn && (
              <p className="text-amber-600">
                Métricas com unidades diferentes agrupadas por eixo (máx 2 eixos exibidos).
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Import Modal
function ImportModal({
  open,
  onOpenChange,
  onFileSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0b3a73] flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importar Planilha do Microsoft Forms
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Envie a planilha exportada do Microsoft Forms no formato padrão (mesmas colunas do
            formulário de Testes & Aferições).
          </p>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-slate-300 dark:border-slate-600"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Arraste e solte ou clique para selecionar
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Arquivo .xlsx ou .xls</p>
            {file && (
              <p className="mt-2 text-sm font-medium text-[#0b3a73] dark:text-blue-300">
                {file.name}
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                onOpenChange(false);
              }}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Import Preview Modal
function ImportPreviewModal({
  open,
  onOpenChange,
  preview,
  onConfirm,
  confirming,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    novos: number;
    atualizados: number;
    ignorados: number;
    erros: { linha: number; motivo: string }[];
  } | null;
  onConfirm: () => void;
  confirming: boolean;
}) {
  if (!preview) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0b3a73]">Confirmar Importação</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {preview.novos}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Novos registros</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {preview.atualizados}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Atualizados</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {preview.ignorados}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400">Ignorados (vazios)</div>
            </div>
          </div>

          {preview.erros.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
              <h4 className="mb-2 text-sm font-medium text-rose-700 dark:text-rose-400">
                Erros encontrados ({preview.erros.length}):
              </h4>
              <ul className="space-y-1 text-xs text-rose-600 dark:text-rose-400 max-h-40 overflow-auto">
                {preview.erros.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Linha {e.linha}: {e.motivo}
                  </li>
                ))}
                {preview.erros.length > 20 && <li>... e mais {preview.erros.length - 20} erros</li>}
              </ul>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className="rounded bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Importando...
                </span>
              ) : (
                "Confirmar importação"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
