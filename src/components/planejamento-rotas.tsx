import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  LayoutTemplate,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Route as RouteIcon,
  Save,
  Search,
  Settings,
  Trash2,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type BacklogOS = {
  "Ordem de Manutenção"?: string | null;
  NOTA?: string | null;
  "Status da Atividade"?: string | null;
  "Início do SLA"?: string | null;
  "Fim do SLA"?: string | null;
  "TEXTO BREVE"?: string | null;
  PLANTA?: string | null;
  "Tipo de Atividade"?: string | null;
  PRIORIDADE?: string | null;
  "DESCRIÇÃO EQUIPAMENTO"?: string | null;
};

type Criticidade = "critica" | "importante" | "padrao";

type Elevatoria = {
  id: number;
  nome: string;
  planta: string | null;
  lat: number;
  lon: number;
  criticidade: Criticidade;
};

type ElevatoriaBasica = {
  id: number;
  nome: string;
  planta: string | null;
  criticidade: Criticidade;
};

type AlertaConfig = {
  id: number;
  elevatoria_id: number | null;
  criticidade: Criticidade | null;
  prazo_dias: number;
  atualizado_por: string | null;
  atualizado_em: string | null;
};

type AlertaItem = {
  el: Elevatoria;
  dias: number | null;
  ultima: string | null;
  ordem: string | null;
  prazo: number;
  personalizado: boolean;
  nivel: "excedido" | "proximo";
};

type OsInfo = {
  origem: "sistema" | "livre" | "nova" | "vazio";
  om?: string;
  tipo?: string;
  texto_breve?: string;
  planta?: string;
  equipamento?: string;
  prioridade?: string;
  observacao?: string;
};

type Parada = {
  id: string;
  elevatoria_id: number | null;
  elevatoria_nome: string;
  planta?: string | null;
  lat: number | null;
  lon: number | null;
  oss: OsInfo[];
};

type Planejamento = {
  id: number;
  nome: string;
  autor_nome: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  paradas: Parada[];
};

type OsModelo = {
  id: number;
  uid: string;
  nome: string;
  tipo_ordem: string;
  planta: string | null;
  equipamento: string | null;
  prioridade: string | null;
  texto_breve: string | null;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type OsModeloDados = {
  nome: string;
  tipo_ordem: string;
  planta: string;
  equipamento: string;
  prioridade: string;
  texto_breve: string;
  observacoes: string;
};

const ossDeParada = (p: { oss?: OsInfo[]; os?: OsInfo }): OsInfo[] => {
  if (Array.isArray(p.oss)) return p.oss;
  if (p.os) return [p.os];
  return [];
};

const normalizarParadas = (items: unknown[]): Parada[] =>
  items.map((x) => {
    const p = x as Parada & { os?: OsInfo };
    return {
      id: p.id || uuid(),
      elevatoria_id: p.elevatoria_id ?? null,
      elevatoria_nome: p.elevatoria_nome,
      planta: p.planta,
      lat: p.lat ?? null,
      lon: p.lon ?? null,
      oss: ossDeParada(p),
    };
  });

const TIPOS_OS = [
  "Preventiva por Frequência",
  "Preditiva",
  "Preventiva por Condição",
  "Corretiva Emergencial",
  "Corretiva Programada",
  "Serviços",
  "Engenharia",
  "Controle Operacional",
  "Outro",
];

// "Tipo de Atividade" do Field/SAP → categoria exibida na tabela.
const TIPO_ATIVIDADE_MAP: Record<string, string> = {
  "MANUTENÇÃO PREVENTIVA POR FREQUÊNCIA": "Preventiva por Frequência",
  "MANUTENÇÃO PREVENTIVA POR CONDIÇÃO": "Preventiva por Condição",
  "MANUTENÇÃO CORRETIVA EMERGENCIAL": "Corretiva Emergencial",
  "MANUTENÇÃO CORRETIVA PROGRAMADA": "Corretiva Programada",
  "MANUTENÇÃO PREDITIVA": "Preditiva",
  "ENGENHARIA DE MANUTENÇÃO": "Engenharia",
  "CONTROLE OPERACIONAL": "Controle Operacional",
  SERVIÇOS: "Serviços",
};

const normalizaTipoOS = (raw: string | null | undefined): string | undefined => {
  const v = String(raw || "").trim();
  if (!v) return undefined;
  return TIPO_ATIVIDADE_MAP[v] || v;
};

// "DD/MM/YY HH:MM" ou "DD/MM/YYYY HH:MM" → Date (horário local), igual ao backlog.
const parseDataSla = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const m = String(s)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) {
    const iso = new Date(s);
    return isNaN(iso.getTime()) ? null : iso;
  }
  let dd = +m[1];
  let mm = +m[2];
  let yy = +m[3];
  if (yy < 100) yy += 2000;
  if (mm > 12 && dd <= 12) [dd, mm] = [mm, dd];
  const hh = m[4] ? +m[4] : 0;
  const mi = m[5] ? +m[5] : 0;
  return new Date(yy, mm - 1, dd, hh, mi, 0);
};

// "PL-RJB-EAT0832 - NOME" → "PL-RJB-EAT0832"
const codigoPlanta = (s: string | null | undefined): string =>
  String(s || "")
    .split(" - ")[0]
    .trim()
    .toUpperCase();

const fmtDataSla = (d: Date | null): string => {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const LS_KEY = "backlog_planejamentos_v1";
const PEND_LS = "backlog_pendentes_v1";
const MODELOS_LS = "planejamento_os_modelos_v1";

const PRAZO_DEFAULTS: Record<Criticidade, number> = { critica: 30, importante: 45, padrao: 60 };
const CRITICIDADES: Criticidade[] = ["critica", "importante", "padrao"];
const CRITICIDADE_META: Record<
  Criticidade,
  { label: string; emoji: string; badgeCls: string; dotCls: string }
> = {
  critica: {
    label: "Crítica",
    emoji: "🔴",
    badgeCls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    dotCls: "bg-red-500",
  },
  importante: {
    label: "Importante",
    emoji: "🟡",
    badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dotCls: "bg-amber-500",
  },
  padrao: {
    label: "Padrão",
    emoji: "🟢",
    badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dotCls: "bg-emerald-500",
  },
};

const fmtDateBR = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const distKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const IS_RELATION_MISSING_RE = /relation .*does not exist|42P01|PGRST205/i;

const isRelationMissing = (err: { message?: string } | null): boolean =>
  !err || IS_RELATION_MISSING_RE.test(err.message || "");

const erroParaMensagem = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
};

const novaParada = (el: Elevatoria): Parada => ({
  id: uuid(),
  elevatoria_id: el.id,
  elevatoria_nome: el.nome,
  planta: el.planta,
  lat: el.lat,
  lon: el.lon,
  oss: [],
});

const statusDaOS = (os: OsInfo): { label: string; cls: string } => {
  if (os.origem === "sistema")
    return { label: "Existente", cls: "bg-emerald-100 text-emerald-700" };
  if (os.origem === "nova")
    return { label: "Pendente criação", cls: "bg-amber-100 text-amber-700" };
  if (os.origem === "livre") return { label: "Nº livre", cls: "bg-sky-100 text-sky-700" };
  return { label: "Sem O.S.", cls: "bg-slate-100 text-slate-500" };
};

function FitBounds({ points, signal }: { points: Array<[number, number]>; signal: number }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
  }, [points, signal, map]);
  return null;
}

function numberedIcon(n: number) {
  return L.divIcon({
    className: "planejamento-stop",
    html: `<div style="background:#0b3a73;color:#fff;border:2.5px solid #fff;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;box-shadow:0 1px 5px rgba(0,0,0,.4)">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function pulseIcon() {
  return L.divIcon({
    className: "planejamento-pulse",
    html: `
      <div style="position:relative;width:40px;height:40px;">
        <span style="position:absolute;inset:4px;border-radius:9999px;background:rgba(245,158,11,.45);animation:planejRing 1.2s ease-out infinite;"></span>
        <span style="position:absolute;top:12px;left:12px;width:16px;height:16px;border-radius:9999px;background:#f59e0b;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);"></span>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const planejAnimationCss = `
  @keyframes planejRing {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(1.6); opacity: 0; }
  }
`;

function FlyTo({ point, signal }: { point: [number, number] | null; signal: number }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.flyTo(point, 15, { duration: 1 });
  }, [point, signal, map]);
  return null;
}

function PlanejamentoMap({
  elevatorias,
  paradas,
  pendentes,
  onAdd,
  onRemove,
}: {
  elevatorias: Elevatoria[];
  paradas: Parada[];
  pendentes: Elevatoria[];
  onAdd: (el: Elevatoria) => void;
  onRemove: (idx: number) => void;
}) {
  const [fitSignal, setFitSignal] = useState(0);
  const [pesquisa, setPesquisa] = useState("");
  const [mostrandoRes, setMostrandoRes] = useState(false);
  const [mostra, setMostra] = useState({ rota: true, pend: true, resto: true });
  const [destaque, setDestaque] = useState<number | null>(null);
  const [flySig, setFlySig] = useState(0);
  const [flyPonto, setFlyPonto] = useState<[number, number] | null>(null);
  const destaqueTimer = useRef<number | null>(null);

  const routeIds = useMemo(() => new Set(paradas.map((p) => p.elevatoria_id)), [paradas]);
  const pendIds = useMemo(() => new Set(pendentes.map((p) => p.id)), [pendentes]);

  const pontosRota: Array<[number, number]> = useMemo(() => {
    if (!mostra.rota) return [];
    return paradas.filter((p) => p.lat != null && p.lon != null).map((p) => [p.lat!, p.lon!]);
  }, [paradas, mostra.rota]);

  const pontosFit = useMemo(() => {
    if (pontosRota.length) return pontosRota;
    const pts: Array<[number, number]> = [];
    if (mostra.pend) for (const p of pendentes) pts.push([p.lat, p.lon]);
    if (mostra.resto)
      for (const el of elevatorias)
        if (!routeIds.has(el.id) && !pendIds.has(el.id)) pts.push([el.lat, el.lon]);
    return pts;
  }, [pontosRota, mostra.pend, mostra.resto, pendentes, elevatorias, routeIds, pendIds]);

  const q = pesquisa.trim().toLowerCase();
  const resultados = useMemo(() => {
    if (!q) return [];
    return elevatorias.filter((el) => el.nome.toLowerCase().includes(q)).slice(0, 8);
  }, [q, elevatorias]);

  useEffect(
    () => () => {
      if (destaqueTimer.current) window.clearTimeout(destaqueTimer.current);
    },
    [],
  );

  const selecionar = (el: Elevatoria) => {
    setDestaque(el.id);
    setFlyPonto([el.lat, el.lon]);
    setFlySig((n) => n + 1);
    setPesquisa("");
    setMostrandoRes(false);
    if (destaqueTimer.current) window.clearTimeout(destaqueTimer.current);
    destaqueTimer.current = window.setTimeout(() => {
      setDestaque(null);
      destaqueTimer.current = null;
    }, 2600);
  };

  const renderMarcadorRota = (p: Parada, idx: number) => {
    if (!mostra.rota || p.lat == null || p.lon == null) return null;
    return (
      <Marker key={p.id} position={[p.lat, p.lon]} icon={numberedIcon(idx + 1)}>
        <Tooltip>
          <span className="font-semibold">
            {idx + 1}. {p.elevatoria_nome}
          </span>
        </Tooltip>
        <Popup>
          <div className="text-xs">
            <div className="font-semibold text-[#0b3a73]">
              Parada #{idx + 1} · {p.elevatoria_nome}
            </div>
            {ossDeParada(p).length === 0 && (
              <div className="mt-0.5 text-slate-400">Sem O.S. vinculadas</div>
            )}
            {ossDeParada(p).map((o, j) => (
              <div key={j} className="mt-0.5">
                {o.origem === "nova" ? (
                  <span className="font-semibold text-amber-600">● Pendente de criação</span>
                ) : (
                  <span className="font-semibold">{o.om || "O.S. livre"}</span>
                )}
                {o.tipo ? ` · ${o.tipo}` : ""}
              </div>
            ))}
            {ossDeParada(p).length > 0 && (
              <div className="mt-1 text-[10px] text-slate-400">{ossDeParada(p).length} O.S.</div>
            )}
            <button
              className="mt-1 cursor-pointer rounded bg-red-50 px-2 py-0.5 text-[11px] text-red-600"
              onClick={() => onRemove(idx)}
            >
              Remover da rota
            </button>
          </div>
        </Popup>
      </Marker>
    );
  };

  const renderMarcadorPendente = (el: Elevatoria) => {
    if (!mostra.pend || destaque === el.id) return null;
    return (
      <CircleMarker
        key={`pend-${el.id}`}
        center={[el.lat, el.lon]}
        radius={9}
        pathOptions={{ color: "#15803d", fillColor: "#22c55e", fillOpacity: 0.85, weight: 3 }}
        eventHandlers={{ click: () => onAdd(el) }}
      >
        <Tooltip>
          <span className="font-semibold text-emerald-700">● Pendente</span> · {el.nome}
        </Tooltip>
        <Popup>
          <div className="text-xs">
            <div className="font-semibold text-emerald-700">● Pendente</div>
            <div className="font-semibold text-slate-700">{el.nome}</div>
            {el.planta && <div className="text-slate-500">{el.planta}</div>}
            <button
              className="mt-1 cursor-pointer rounded bg-emerald-600 px-2 py-0.5 text-[11px] text-white"
              onClick={() => onAdd(el)}
            >
              + Adicionar à rota
            </button>
          </div>
        </Popup>
      </CircleMarker>
    );
  };

  const renderMarcadorResto = (el: Elevatoria) => {
    if (!mostra.resto || destaque === el.id) return null;
    return (
      <CircleMarker
        key={`resto-${el.id}`}
        center={[el.lat, el.lon]}
        radius={8}
        pathOptions={{ color: "#94a3b8", fillColor: "#cbd5e1", fillOpacity: 0.85, weight: 2 }}
        eventHandlers={{ click: () => onAdd(el) }}
      >
        <Tooltip>{el.nome}</Tooltip>
        <Popup>
          <div className="text-xs">
            <div className="font-semibold text-slate-700">{el.nome}</div>
            {el.planta && <div className="text-slate-500">{el.planta}</div>}
            <button
              className="mt-1 cursor-pointer rounded bg-[#0b3a73] px-2 py-0.5 text-[11px] text-white"
              onClick={() => onAdd(el)}
            >
              + Adicionar à rota
            </button>
          </div>
        </Popup>
      </CircleMarker>
    );
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[#0b3a73] dark:text-white">
          <MapPin className="mr-1 inline h-4 w-4" /> Rota de campo ({paradas.length} parada
          {paradas.length === 1 ? "" : "s"})
          {pendentes.length > 0 && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <button
          onClick={() => setFitSignal((n) => n + 1)}
          className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          Centralizar
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={pesquisa}
            onChange={(e) => {
              setPesquisa(e.target.value);
              setMostrandoRes(true);
            }}
            onFocus={() => setMostrandoRes(true)}
            onBlur={() => setMostrandoRes(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && resultados.length > 0) selecionar(resultados[0]);
            }}
            placeholder="Buscar elevatória..."
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-[12px] focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          {mostrandoRes && q && (
            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
              {resultados.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-slate-400">
                  Nenhuma elevatória encontrada.
                </div>
              ) : (
                resultados.map((el) => (
                  <button
                    key={el.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selecionar(el);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[#eaf3fb] dark:hover:bg-slate-700"
                  >
                    <span className="truncate">{el.nome}</span>
                    {routeIds.has(el.id) && (
                      <span className="shrink-0 rounded bg-[#0b3a73] px-1.5 text-[9px] font-bold text-white">
                        ROTA
                      </span>
                    )}
                    {pendIds.has(el.id) && (
                      <span className="shrink-0 rounded bg-emerald-600 px-1.5 text-[9px] font-bold text-white">
                        PENDENTE
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[#0b3a73]"
              checked={mostra.rota}
              onChange={(e) => setMostra({ ...mostra, rota: e.target.checked })}
            />
            Rota
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-emerald-600"
              checked={mostra.pend}
              onChange={(e) => setMostra({ ...mostra, pend: e.target.checked })}
            />
            Pendentes
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-slate-400"
              checked={mostra.resto}
              onChange={(e) => setMostra({ ...mostra, resto: e.target.checked })}
            />
            Sem associação
          </label>
        </div>
      </div>

      <div className="h-[320px] w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 sm:h-[380px]">
        <MapContainer center={[-22.85, -43.5]} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={pontosFit} signal={fitSignal} />
          <FlyTo point={flyPonto} signal={flySig} />
          <style>{planejAnimationCss}</style>
          {elevatorias.map((el) => {
            if (routeIds.has(el.id)) return null;
            if (pendIds.has(el.id)) return renderMarcadorPendente(el);
            return renderMarcadorResto(el);
          })}
          {pontosRota.length >= 2 && (
            <Polyline
              positions={pontosRota}
              pathOptions={{ color: "#0b3a73", weight: 4, opacity: 0.8, dashArray: "6 6" }}
            />
          )}
          {paradas.map((p, idx) => renderMarcadorRota(p, idx))}
          {destaque != null &&
            (() => {
              const el = elevatorias.find((x) => x.id === destaque);
              if (!el) return null;
              return (
                <Marker
                  key={`pulse-${el.id}`}
                  position={[el.lat, el.lon]}
                  icon={pulseIcon()}
                  zIndexOffset={2000}
                />
              );
            })()}
        </MapContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="font-semibold">Legenda:</span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "#0b3a73", boxShadow: "0 0 0 1px rgba(0,0,0,.12)" }}
          />
          Rota
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "#22c55e", boxShadow: "0 0 0 1px rgba(0,0,0,.12)" }}
          />
          Pendente
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "#cbd5e1", boxShadow: "0 0 0 1px rgba(0,0,0,.12)" }}
          />
          Sem associação
        </span>
      </div>
    </div>
  );
}

export default function PlanejamentoRotas({ backlogOS }: { backlogOS: BacklogOS[] }) {
  const { user, profile } = useAuth();
  const [elevatorias, setElevatorias] = useState<Elevatoria[]>([]);
  const [elevLoading, setElevLoading] = useState(true);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [planejamentoId, setPlanejamentoId] = useState<number | null>(null);
  const [planejamentoNome, setPlanejamentoNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [osDialogAlvo, setOsDialogAlvo] = useState<{ idx: number; osIdx: number | null } | null>(
    null,
  );
  const [removerOsAlvo, setRemoverOsAlvo] = useState<{ idx: number; osIdx: number } | null>(null);
  const [puxarAlvo, setPuxarAlvo] = useState<number | null>(null);
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());
  const [nomeDialogOpen, setNomeDialogOpen] = useState(false);
  const [nomeInput, setNomeInput] = useState("");
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false);
  const [biblioteca, setBiblioteca] = useState<Planejamento[]>([]);
  const [carregandoBiblioteca, setCarregandoBiblioteca] = useState(false);
  const [renomearAlvo, setRenomearAlvo] = useState<Planejamento | null>(null);
  const [renomearInput, setRenomearInput] = useState("");
  const [excluirAlvo, setExcluirAlvo] = useState<Planejamento | null>(null);
  const [pendentes, setPendentes] = useState<Elevatoria[]>([]);
  const [pendModalOpen, setPendModalOpen] = useState(false);
  const usarTabelaPend = useRef<boolean | null>(null);
  const [modelos, setModelos] = useState<OsModelo[]>([]);
  const [gerenciarModelosOpen, setGerenciarModelosOpen] = useState(false);
  const usarTabelaModelos = useRef<boolean | null>(null);
  const [alertaConfig, setAlertaConfig] = useState<AlertaConfig[]>([]);
  const [alertasPreventivas, setAlertasPreventivas] = useState<
    Map<number, { dias: number | null; ultima: string | null; ordem: string | null }>
  >(new Map());
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [alertaFiltro, setAlertaFiltro] = useState<Criticidade | "todas">("todas");
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [alertaConfigOpen, setAlertaConfigOpen] = useState(false);
  const [todasElevatorias, setTodasElevatorias] = useState<ElevatoriaBasica[]>([]);
  const usarTabelaAlerta = useRef<boolean | null>(null);
  const usarRpcAlerta = useRef<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const PASSO = 1000;
      const todas: Array<{
        id: number;
        nome: string;
        planta: string | null;
        lat: number;
        lon: number;
        criticidade: Criticidade;
      }> = [];
      let de = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("elevatorias")
          .select("id, nome, planta, latitude, longitude, criticidade")
          .order("nome", { ascending: true })
          .range(de, de + PASSO - 1);
        if (!alive) return;
        if (error) {
          toast.error("Não deu para carregar as elevatórias do mapa.", {
            description: error.message,
          });
          setElevatorias([]);
          setElevLoading(false);
          return;
        }
        const page = (data as Array<{ [k: string]: unknown }>)
          .filter(
            (el) =>
              el.latitude != null &&
              el.longitude != null &&
              Number.isFinite(Number(el.latitude)) &&
              Number.isFinite(Number(el.longitude)),
          )
          .map((el) => ({
            id: Number(el.id),
            nome: String(el.nome || el.planta || `#${el.id}`),
            planta: el.planta ? String(el.planta) : null,
            lat: Number(el.latitude),
            lon: Number(el.longitude),
            criticidade: (CRITICIDADES.includes(el.criticidade as Criticidade)
              ? el.criticidade
              : "padrao") as Criticidade,
          }));
        todas.push(...page);
        if (!data || data.length < PASSO) break;
        de += PASSO;
      }
      if (!alive) return;
      setElevatorias(todas);
      setElevLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void carregarPendentesGlobais();
    void carregarModelos();
    void carregarAlertaConfig();
    void carregarAlertasPreventivas();
    void carregarTodasElevatorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const defaultMap = new Map(
      alertaConfig
        .filter((c) => c.elevatoria_id === null && c.criticidade)
        .map((c) => [c.criticidade as Criticidade, c.prazo_dias]),
    );
    const overrideMap = new Map(
      alertaConfig
        .filter((c) => c.elevatoria_id !== null)
        .map((c) => [c.elevatoria_id as number, c.prazo_dias]),
    );
    const itens: AlertaItem[] = [];
    for (const el of elevatorias) {
      const personalizado = overrideMap.has(el.id);
      const prazo =
        overrideMap.get(el.id) ?? defaultMap.get(el.criticidade) ?? PRAZO_DEFAULTS[el.criticidade];
      const prev = alertasPreventivas.get(el.id);
      const dias = prev?.dias ?? null;
      if (dias !== null && dias < prazo * 0.8) continue;
      itens.push({
        el,
        dias,
        ultima: prev?.ultima ?? null,
        ordem: prev?.ordem ?? null,
        prazo,
        personalizado,
        nivel: dias === null || dias >= prazo ? "excedido" : "proximo",
      });
    }
    itens.sort((a, b) => {
      const ad = a.dias ?? Number.MAX_SAFE_INTEGER;
      const bd = b.dias ?? Number.MAX_SAFE_INTEGER;
      return bd - ad || a.el.nome.localeCompare(b.el.nome);
    });
    setAlertas(itens);
  }, [alertaConfig, alertasPreventivas, elevatorias]);

  const routeIds = useMemo(() => new Set(paradas.map((p) => p.elevatoria_id)), [paradas]);

  const tabelaModelosDisponivel = async () => {
    if (usarTabelaModelos.current === true) return true;
    const { error } = await supabase.from("planejamento_os_modelos").select("id").limit(1);
    usarTabelaModelos.current = !error || !isRelationMissing(error);
    return usarTabelaModelos.current;
  };

  const lerModelosLocais = (): OsModelo[] => {
    try {
      const raw = localStorage.getItem(MODELOS_LS);
      const items = raw ? (JSON.parse(raw) as Array<Partial<OsModelo>>) : [];
      return items.map((m) => ({
        id: typeof m.id === "number" ? m.id : -(Date.now() + Math.floor(Math.random() * 999)),
        uid: m.uid || uuid(),
        nome: String(m.nome || ""),
        tipo_ordem: String(m.tipo_ordem || ""),
        planta: m.planta ? String(m.planta) : null,
        equipamento: m.equipamento ? String(m.equipamento) : null,
        prioridade: m.prioridade ? String(m.prioridade) : null,
        texto_breve: m.texto_breve ? String(m.texto_breve) : null,
        observacoes: m.observacoes ? String(m.observacoes) : null,
        criado_por: m.criado_por ? String(m.criado_por) : null,
        criado_em: m.criado_em ? String(m.criado_em) : null,
        atualizado_em: m.atualizado_em ? String(m.atualizado_em) : null,
      }));
    } catch {
      return [];
    }
  };

  const gravarModelosLocais = (items: OsModelo[]) => {
    try {
      localStorage.setItem(MODELOS_LS, JSON.stringify(items));
    } catch {
      // sem storage disponível (modo privado/SR) — ignora
    }
  };

  const carregarModelos = async () => {
    const comTabela = await tabelaModelosDisponivel();
    if (!comTabela) {
      setModelos(lerModelosLocais());
      return;
    }
    const { data, error } = await supabase
      .from("planejamento_os_modelos")
      .select(
        "uid, id, nome, tipo_ordem, planta, equipamento, prioridade, texto_breve, observacoes, criado_por, criado_em, atualizado_em",
      )
      .order("nome", { ascending: true });
    if (error) {
      console.warn("planejamento: falha ao ler modelos de O.S.", error);
      setModelos(lerModelosLocais());
      return;
    }
    const globais = (data ?? []).map((r) => ({
      uid: String(r.uid || `legacy-${r.id}`),
      id: Number(r.id),
      nome: String(r.nome || ""),
      tipo_ordem: String(r.tipo_ordem || ""),
      planta: r.planta ? String(r.planta) : null,
      equipamento: r.equipamento ? String(r.equipamento) : null,
      prioridade: r.prioridade ? String(r.prioridade) : null,
      texto_breve: r.texto_breve ? String(r.texto_breve) : null,
      observacoes: r.observacoes ? String(r.observacoes) : null,
      criado_por: r.criado_por ? String(r.criado_por) : null,
      criado_em: r.criado_em ? String(r.criado_em) : null,
      atualizado_em: r.atualizado_em ? String(r.atualizado_em) : null,
    })) as OsModelo[];
    // auto-cura: modelos que ficaram só no localStorage (criados enquanto a
    // tabela não existia) são unidos aos globais e gravados no DB.
    const locais = lerModelosLocais().filter((l) => !globais.some((g) => g.uid === l.uid));
    const merged = globais.concat(locais);
    setModelos(merged);
    if (locais.length > 0) void sincronizarModelos(merged);
  };

  const sincronizarModelos = async (lista: OsModelo[]) => {
    const comTabela = await tabelaModelosDisponivel();
    if (!comTabela) {
      gravarModelosLocais(lista);
      return;
    }
    try {
      const { data: atuais } = await supabase.from("planejamento_os_modelos").select("uid");
      const emDb = new Set((atuais ?? []).map((r) => String(r.uid)));
      if (lista.length > 0) {
        const { error: upsErr } = await supabase.from("planejamento_os_modelos").upsert(
          lista.map((m) => ({
            uid: m.uid,
            nome: m.nome,
            tipo_ordem: m.tipo_ordem,
            planta: m.planta,
            equipamento: m.equipamento,
            prioridade: m.prioridade,
            texto_breve: m.texto_breve,
            observacoes: m.observacoes,
            criado_por: user?.id ?? null,
            criado_em: m.criado_em ?? new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          })),
          { onConflict: "uid" },
        );
        if (upsErr) throw upsErr;
      }
      const remover = [...emDb].filter((uid) => !lista.some((m) => m.uid === uid));
      if (remover.length > 0) {
        const { error: delErr } = await supabase
          .from("planejamento_os_modelos")
          .delete()
          .in("uid", remover);
        if (delErr) throw delErr;
      }
      gravarModelosLocais(lista);
    } catch (err) {
      console.warn("planejamento: modelos salvos apenas localmente.", err);
      gravarModelosLocais(lista);
    }
  };

  const criarModelo = (dados: OsModeloDados) => {
    const novo: OsModelo = {
      id: -Date.now(),
      uid: uuid(),
      nome: dados.nome.trim(),
      tipo_ordem: dados.tipo_ordem,
      planta: dados.planta.trim() || null,
      equipamento: dados.equipamento.trim() || null,
      prioridade: dados.prioridade || null,
      texto_breve: dados.texto_breve.trim() || null,
      observacoes: dados.observacoes.trim() || null,
      criado_por: user?.id ?? null,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
    const lista = [...modelos, novo];
    setModelos(lista);
    void sincronizarModelos(lista);
    toast.success("Modelo criado.");
  };

  const atualizarModelo = (modelo: OsModelo) => {
    const lista = modelos.map((m) =>
      m.id === modelo.id ? { ...modelo, atualizado_em: new Date().toISOString() } : m,
    );
    setModelos(lista);
    void sincronizarModelos(lista);
    toast.success("Modelo atualizado.");
  };

  const duplicarModelo = (modelo: OsModelo) => {
    const copia: OsModelo = {
      ...modelo,
      id: -Date.now(),
      uid: uuid(),
      nome: `Cópia de ${modelo.nome}`,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
    const lista = [...modelos, copia];
    setModelos(lista);
    void sincronizarModelos(lista);
    toast.success("Modelo duplicado.");
  };

  const removerModelo = (id: number) => {
    const lista = modelos.filter((m) => m.id !== id);
    setModelos(lista);
    void sincronizarModelos(lista);
    toast.success("Modelo removido.");
  };

  const carregarTodasElevatorias = async () => {
    const { data, error } = await supabase
      .from("elevatorias")
      .select("id, nome, planta, criticidade")
      .order("nome", { ascending: true });
    if (error) {
      console.warn("planejamento: falha ao listar elevatórias para alertas.", error);
      return;
    }
    setTodasElevatorias(
      (data ?? []).map((r) => ({
        id: Number(r.id),
        nome: String(r.nome || `#${r.id}`),
        planta: r.planta ? String(r.planta) : null,
        criticidade: CRITICIDADES.includes(r.criticidade as Criticidade)
          ? (r.criticidade as Criticidade)
          : "padrao",
      })),
    );
  };

  const tabelaAlertaDisponivel = async () => {
    if (usarTabelaAlerta.current === true) return true;
    const { error } = await supabase.from("planejamento_alerta_config").select("id").limit(1);
    usarTabelaAlerta.current = !error || !isRelationMissing(error);
    return usarTabelaAlerta.current;
  };

  const rpcAlertaDisponivel = async () => {
    if (usarRpcAlerta.current === true) return true;
    const { error } = await supabase.rpc("alerta_ultima_preventiva");
    usarRpcAlerta.current = !error || !isRelationMissing(error);
    return usarRpcAlerta.current;
  };

  const carregarAlertaConfig = async () => {
    const comTabela = await tabelaAlertaDisponivel();
    if (!comTabela) {
      setAlertaConfig([]);
      return;
    }
    const { data, error } = await supabase
      .from("planejamento_alerta_config")
      .select("id, elevatoria_id, criticidade, prazo_dias, atualizado_por, atualizado_em");
    if (error) {
      console.warn("planejamento: falha ao ler configuração de alertas.", error);
      setAlertaConfig([]);
      return;
    }
    setAlertaConfig(
      (data ?? []).map((r) => ({
        id: Number(r.id),
        elevatoria_id: r.elevatoria_id != null ? Number(r.elevatoria_id) : null,
        criticidade: CRITICIDADES.includes(r.criticidade as Criticidade)
          ? (r.criticidade as Criticidade)
          : null,
        prazo_dias: Number(r.prazo_dias),
        atualizado_por: r.atualizado_por ? String(r.atualizado_por) : null,
        atualizado_em: r.atualizado_em ? String(r.atualizado_em) : null,
      })),
    );
  };

  const carregarAlertasPreventivas = async () => {
    if (!(await rpcAlertaDisponivel())) {
      setAlertasPreventivas(new Map());
      return;
    }
    const { data, error } = await supabase.rpc("alerta_ultima_preventiva");
    if (error) {
      console.warn("planejamento: falha ao ler últimas preventivas.", error);
      setAlertasPreventivas(new Map());
      return;
    }
    const mapa = new Map<
      number,
      { dias: number | null; ultima: string | null; ordem: string | null }
    >();
    for (const r of data ?? []) {
      mapa.set(Number(r.elevatoria_id), {
        dias: r.dias_sem_preventiva != null ? Number(r.dias_sem_preventiva) : null,
        ultima: r.ultima_preventiva ? String(r.ultima_preventiva) : null,
        ordem: r.ultima_preventiva_ordem ? String(r.ultima_preventiva_ordem) : null,
      });
    }
    setAlertasPreventivas(mapa);
  };

  const salvarPrazoCriticidade = async (crit: Criticidade, dias: number) => {
    if (!dias || dias <= 0) {
      toast.error("Prazo deve ser um número maior que zero.");
      return;
    }
    const { data, error } = await supabase
      .from("planejamento_alerta_config")
      .upsert(
        {
          elevatoria_id: null,
          criticidade: crit,
          prazo_dias: dias,
          atualizado_por: user?.id ?? null,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "elevatoria_id,criticidade" },
      )
      .select("id, elevatoria_id, criticidade, prazo_dias, atualizado_por, atualizado_em")
      .single();
    if (error) {
      toast.error("Falha ao salvar prazo.", { description: erroParaMensagem(error) });
      console.warn("planejamento: falha ao salvar prazo por criticidade.", error);
      return;
    }
    const nova: AlertaConfig = {
      id: Number(data.id),
      elevatoria_id: data.elevatoria_id != null ? Number(data.elevatoria_id) : null,
      criticidade: CRITICIDADES.includes(data.criticidade as Criticidade)
        ? (data.criticidade as Criticidade)
        : null,
      prazo_dias: Number(data.prazo_dias),
      atualizado_por: data.atualizado_por ? String(data.atualizado_por) : null,
      atualizado_em: data.atualizado_em ? String(data.atualizado_em) : null,
    };
    setAlertaConfig((prev) => {
      const existe = prev.some((c) => c.elevatoria_id === null && c.criticidade === crit);
      return existe
        ? prev.map((c) => (c.elevatoria_id === null && c.criticidade === crit ? nova : c))
        : [...prev, nova];
    });
    toast.success("Prazo padrão atualizado.");
  };

  const salvarPrazoElevatoria = async (elId: number, dias: number | null) => {
    const el = todasElevatorias.find((e) => e.id === elId);
    const defaultDias =
      (el
        ? alertaConfig.find((c) => c.elevatoria_id === null && c.criticidade === el.criticidade)
            ?.prazo_dias
        : undefined) ?? PRAZO_DEFAULTS[el?.criticidade ?? "padrao"];
    if (dias == null || dias <= 0 || dias === defaultDias) {
      const atual = alertaConfig.find((c) => c.elevatoria_id === elId);
      if (atual) {
        setAlertaConfig((prev) => prev.filter((c) => c.id !== atual.id));
        const { error } = await supabase
          .from("planejamento_alerta_config")
          .delete()
          .eq("id", atual.id);
        if (error) console.warn("planejamento: falha ao remover prazo individual.", error);
        toast.success("Prazo individual removido.");
      }
      return;
    }
    const { data, error } = await supabase
      .from("planejamento_alerta_config")
      .upsert(
        {
          elevatoria_id: elId,
          criticidade: null,
          prazo_dias: dias,
          atualizado_por: user?.id ?? null,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "elevatoria_id,criticidade" },
      )
      .select("id, elevatoria_id, criticidade, prazo_dias, atualizado_por, atualizado_em")
      .single();
    if (error) {
      toast.error("Falha ao salvar prazo.", { description: erroParaMensagem(error) });
      console.warn("planejamento: falha ao salvar prazo por elevatória.", error);
      return;
    }
    const nova: AlertaConfig = {
      id: Number(data.id),
      elevatoria_id: Number(data.elevatoria_id),
      criticidade: null,
      prazo_dias: Number(data.prazo_dias),
      atualizado_por: data.atualizado_por ? String(data.atualizado_por) : null,
      atualizado_em: data.atualizado_em ? String(data.atualizado_em) : null,
    };
    setAlertaConfig((prev) => {
      const existe = prev.some((c) => c.elevatoria_id === elId);
      return existe ? prev.map((c) => (c.elevatoria_id === elId ? nova : c)) : [...prev, nova];
    });
    toast.success("Prazo individual atualizado.");
  };

  const salvarCriticidadeElevatoria = async (elId: number, criticidade: Criticidade) => {
    setTodasElevatorias((prev) => prev.map((e) => (e.id === elId ? { ...e, criticidade } : e)));
    setElevatorias((prev) => prev.map((e) => (e.id === elId ? { ...e, criticidade } : e)));
    const { error } = await supabase.from("elevatorias").update({ criticidade }).eq("id", elId);
    if (error) {
      toast.error("Falha ao salvar criticidade.", { description: erroParaMensagem(error) });
      console.warn("planejamento: falha ao salvar criticidade.", error);
      return;
    }
    toast.success("Criticidade atualizada.");
  };

  const tabelaPendentesDisponivel = async () => {
    if (usarTabelaPend.current === true) return true;
    const { error } = await supabase.from("planejamentos_pendentes").select("id").limit(1);
    usarTabelaPend.current = !error || !isRelationMissing(error);
    return usarTabelaPend.current;
  };

  const carregarPendentesGlobais = async () => {
    const comTabela = await tabelaPendentesDisponivel();
    if (!comTabela) {
      setPendentes(lerPendGlobais());
      return;
    }
    const { data, error } = await supabase
      .from("planejamentos_pendentes")
      .select("elevatoria_id, nome, planta, lat, lon, criado_em")
      .order("criado_em", { ascending: true });
    if (error) {
      console.warn("planejamento: falha ao ler pendentes globais.", error);
      setPendentes(lerPendGlobais());
      return;
    }
    const globais = (data ?? [])
      .map((r) => ({
        id: Number(r.elevatoria_id),
        nome: String(r.nome || `#${r.elevatoria_id}`),
        planta: typeof r.planta === "string" ? r.planta : null,
        lat: Number(r.lat),
        lon: Number(r.lon),
        criticidade: "padrao" as Criticidade,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    // auto-cura: pendentes que ficaram só no localStorage (salvas enquanto a
    // tabela ainda não existia) são unidas às globais e gravadas no DB.
    const locais = lerPendGlobais().filter((l) => !globais.some((g) => g.id === l.id));
    const merged = globais.concat(locais);
    setPendentes(merged);
    if (locais.length > 0) void sincronizarPendentes(merged);
  };

  const sincronizarPendentes = async (lista: Elevatoria[]) => {
    const comTabela = await tabelaPendentesDisponivel();
    if (!comTabela) {
      gravarPendGlobais(lista);
      return;
    }
    try {
      const { data: atuais } = await supabase
        .from("planejamentos_pendentes")
        .select("elevatoria_id");
      const emDb = new Set((atuais ?? []).map((r) => Number(r.elevatoria_id)));
      const novos = lista.filter((p) => !emDb.has(p.id));
      if (novos.length > 0) {
        const { error: insErr } = await supabase.from("planejamentos_pendentes").upsert(
          novos.map((p) => ({
            elevatoria_id: p.id,
            nome: p.nome,
            planta: p.planta,
            lat: p.lat,
            lon: p.lon,
            autor_id: user?.id ?? null,
            autor_nome: profile?.nome_completo ?? null,
          })),
          { onConflict: "elevatoria_id", ignoreDuplicates: true },
        );
        if (insErr) throw insErr;
      }
      const remover = [...emDb].filter((id) => !lista.some((p) => p.id === id));
      if (remover.length > 0) {
        const { error: delErr } = await supabase
          .from("planejamentos_pendentes")
          .delete()
          .in("elevatoria_id", remover);
        if (delErr) throw delErr;
      }
      gravarPendGlobais(lista);
    } catch (err) {
      console.warn("planejamento: pendentes globais salvas apenas localmente.", err);
      gravarPendGlobais(lista);
    }
  };

  const atualizarPendentes = (lista: Elevatoria[]) => {
    setPendentes(lista);
    void sincronizarPendentes(lista);
  };

  const contarParadas = (p: Planejamento) => (Array.isArray(p.paradas) ? p.paradas : []).length;

  const addElevatoria = (el: Elevatoria) => {
    if (routeIds.has(el.id)) {
      toast.info(`${el.nome} já está na rota.`);
      return;
    }
    setParadas((prev) => [...prev, novaParada(el)]);
    if (pendentes.some((p) => p.id === el.id)) {
      atualizarPendentes(pendentes.filter((p) => p.id !== el.id));
    }
  };

  const addPendente = (el: Elevatoria) => {
    if (pendentes.some((p) => p.id === el.id)) return;
    atualizarPendentes([...pendentes, el]);
    toast.success(`${el.nome} marcada como pendente.`);
  };

  const removePendente = (id: number) => atualizarPendentes(pendentes.filter((p) => p.id !== id));

  const promoverPendente = (id: number) => {
    const el = pendentes.find((p) => p.id === id);
    if (!el) return;
    if (routeIds.has(el.id)) {
      toast.info(`${el.nome} já está na rota.`);
      return;
    }
    setParadas((prev) => [...prev, novaParada(el)]);
    atualizarPendentes(pendentes.filter((p) => p.id !== id));
    toast.success(`${el.nome} adicionada à rota.`);
  };

  const removeParada = (idx: number) => setParadas((prev) => prev.filter((_, i) => i !== idx));

  const moveParada = (idx: number, dir: -1 | 1) =>
    setParadas((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const addOs = (idx: number, os: OsInfo) =>
    setParadas((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, oss: [...ossDeParada(p), os] } : p)),
    );

  const updateOs = (idx: number, osIdx: number, patch: Partial<OsInfo>) =>
    setParadas((prev) =>
      prev.map((p, i) =>
        i === idx
          ? {
              ...p,
              oss: ossDeParada(p).map((o, j) => (j === osIdx ? { ...o, ...patch } : o)),
            }
          : p,
      ),
    );

  const removeOs = (idx: number, osIdx: number) =>
    setParadas((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, oss: ossDeParada(p).filter((_, j) => j !== osIdx) } : p,
      ),
    );

  const puxarOs = (idx: number, rows: BacklogOS[]) => {
    if (!rows.length) return;
    setParadas((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const atuais = ossDeParada(p);
        const existentes = new Set(atuais.map((o) => o.om).filter(Boolean));
        const novos = rows
          .filter((r) => !existentes.has(String(r["Ordem de Manutenção"] || "")))
          .map((r): OsInfo => ({
            origem: "sistema",
            om: r["Ordem de Manutenção"] || undefined,
            tipo: normalizaTipoOS(r["Tipo de Atividade"]),
            texto_breve: r["TEXTO BREVE"] || undefined,
            planta: r.PLANTA || undefined,
            equipamento: r["DESCRIÇÃO EQUIPAMENTO"] || undefined,
            prioridade: r.PRIORIDADE || undefined,
          }));
        return { ...p, oss: [...atuais, ...novos] };
      }),
    );
    toast.success(`${rows.length} O.S. puxadas para a parada.`);
  };

  const toggleParada = (id: string) =>
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const findOS = (texto: string) => {
    const q = String(texto || "").trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return (
      backlogOS.find(
        (r) =>
          (r["Ordem de Manutenção"] || "").toLowerCase() === lower ||
          (r["TEXTO BREVE"] || "").toLowerCase().includes(lower),
      ) || null
    );
  };

  const vincularPorTexto = (idx: number, osIdx: number, texto: string) => {
    const row = findOS(texto);
    if (!row) {
      updateOs(idx, osIdx, {
        origem: texto.trim() ? "livre" : "vazio",
        om: texto.trim() ? texto.trim() : undefined,
        tipo: undefined,
        texto_breve: undefined,
        planta: undefined,
        equipamento: undefined,
        prioridade: undefined,
      });
      return;
    }
    updateOs(idx, osIdx, {
      origem: "sistema",
      om: row["Ordem de Manutenção"] || undefined,
      tipo: normalizaTipoOS(row["Tipo de Atividade"]),
      texto_breve: row["TEXTO BREVE"] || undefined,
      planta: row.PLANTA || undefined,
      equipamento: row["DESCRIÇÃO EQUIPAMENTO"] || undefined,
      prioridade: row.PRIORIDADE || undefined,
    });
  };

  const optimizeRoute = () => {
    if (paradas.length < 3) {
      toast.info("Adicione pelo menos 3 paradas para otimizar.");
      return;
    }
    if (paradas.some((p) => p.lat == null || p.lon == null)) {
      toast.warning("Todas as paradas precisam de coordenadas para otimizar.");
      return;
    }
    const visitadas = [paradas[0]];
    const restantes = paradas.slice(1);
    while (restantes.length > 0) {
      const ultima = visitadas[visitadas.length - 1];
      let bestIdx = 0;
      let bestD = Infinity;
      restantes.forEach((s, i) => {
        const d = distKm(ultima.lat!, ultima.lon!, s.lat!, s.lon!);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      });
      visitadas.push(restantes[bestIdx]);
      restantes.splice(bestIdx, 1);
    }
    setParadas(visitadas);
    toast.success("Rota otimizada pela proximidade (vizinho mais próximo).");
  };

  const lerLocais = (): Planejamento[] => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Planejamento[]) : [];
    } catch {
      return [];
    }
  };

  const gravarLocais = (items: Planejamento[]) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      // sem storage disponível (modo privado/SR) — ignora
    }
  };

  const lerPendGlobais = (): Elevatoria[] => {
    try {
      const raw = localStorage.getItem(PEND_LS);
      return raw ? (JSON.parse(raw) as Elevatoria[]) : [];
    } catch {
      return [];
    }
  };

  const gravarPendGlobais = (items: Elevatoria[]) => {
    try {
      localStorage.setItem(PEND_LS, JSON.stringify(items));
    } catch {
      // sem storage disponível (modo privado/SR) — ignora
    }
  };

  const abrirBiblioteca = async () => {
    setCarregandoBiblioteca(true);
    setBibliotecaOpen(true);
    const { data, error } = await supabase
      .from("planejamentos")
      .select("id, nome, autor_nome, criado_em, atualizado_em, paradas")
      .order("atualizado_em", { ascending: false });
    if (error && !isRelationMissing(error)) {
      toast.error("Não foi possível carregar a biblioteca.", {
        description: erroParaMensagem(error),
      });
      setBiblioteca(lerLocais());
      setCarregandoBiblioteca(false);
      return;
    }
    if (isRelationMissing(error)) {
      setBiblioteca(lerLocais());
    } else {
      setBiblioteca(
        (data ?? []).map((p) => {
          const base = p as unknown as Planejamento;
          return {
            ...base,
            paradas: Array.isArray(base.paradas) ? base.paradas : [],
          };
        }),
      );
    }
    setCarregandoBiblioteca(false);
  };

  const salvar = async () => {
    if (paradas.length === 0) {
      toast.warning("Adicione ao menos uma parada antes de salvar.");
      return;
    }
    const nome = planejamentoNome;
    if (!planejamentoId && !nome.trim()) {
      setNomeInput("");
      setNomeDialogOpen(true);
      return;
    }
    await persistir(nome.trim());
  };

  const persistir = async (nome: string) => {
    setSalvando(true);
    const payload = {
      nome,
      paradas,
      autor_id: user?.id ?? null,
      autor_nome: profile?.nome_completo ?? null,
      atualizado_em: new Date().toISOString(),
    };
    try {
      let id = planejamentoId;
      const gravarEspelhoLocal = () => {
        const items = lerLocais();
        const idx = items.findIndex((p) => p.id === id);
        const espelho: Planejamento = {
          id: id as number,
          nome,
          autor_nome: profile?.nome_completo ?? null,
          criado_em: idx >= 0 ? items[idx].criado_em : new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          paradas: [...paradas],
        };
        if (idx >= 0) items[idx] = espelho;
        else items.push(espelho);
        gravarLocais(items);
      };
      if (id != null) {
        const { error } = await supabase.from("planejamentos").update(payload).eq("id", id);
        if (error && !isRelationMissing(error)) throw error;
        if (isRelationMissing(error)) {
          const items = lerLocais().map((p) => (p.id === id ? { ...p, ...payload } : p));
          gravarLocais(items);
        }
        gravarEspelhoLocal();
      } else {
        const { data, error } = await supabase
          .from("planejamentos")
          .insert(payload)
          .select("id")
          .single();
        if (error && !isRelationMissing(error)) throw error;
        if (isRelationMissing(error)) {
          const items = lerLocais();
          const novo: Planejamento = {
            id: -Date.now(),
            nome,
            autor_nome: profile?.nome_completo ?? null,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            paradas: [...paradas],
          };
          items.push(novo);
          gravarLocais(items);
          id = novo.id;
        } else {
          id = Number(data?.id);
          gravarEspelhoLocal();
        }
      }
      setPlanejamentoId(id);
      setPlanejamentoNome(nome);
      setSalvando(false);
      toast.success(
        id != null && planejamentoId != null ? "Planejamento atualizado." : "Planejamento salvo.",
      );
    } catch (err) {
      setSalvando(false);
      console.error("Falha ao salvar planejamento:", err);
      const idN = planejamentoId ?? -Date.now();
      const items = lerLocais();
      const idx = items.findIndex((p) => p.id === idN);
      const espelho: Planejamento = {
        id: idN,
        nome,
        autor_nome: profile?.nome_completo ?? null,
        criado_em: idx >= 0 ? items[idx].criado_em : new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        paradas: [...paradas],
      };
      if (idx >= 0) items[idx] = espelho;
      else items.push(espelho);
      gravarLocais(items);
      setPlanejamentoId(idN);
      setPlanejamentoNome(nome);
      toast.error(
        "Não foi possível salvar no banco. O planejamento foi preservado neste navegador.",
        { description: erroParaMensagem(err) },
      );
    }
  };

  const confirmarNome = async () => {
    if (!nomeInput.trim()) {
      toast.warning("Dê um nome para o planejamento.");
      return;
    }
    setNomeDialogOpen(false);
    await persistir(nomeInput.trim());
  };

  const abrirPlanejamento = (p: Planejamento) => {
    setParadas(normalizarParadas(Array.isArray(p.paradas) ? p.paradas : []));
    setPlanejamentoId(p.id);
    setPlanejamentoNome(p.nome);
    setBibliotecaOpen(false);
    toast.success(`Planejamento "${p.nome}" carregado.`);
  };

  const duplicar = async (p: Planejamento) => {
    const copia = `Cópia de ${p.nome}`;
    const paradasDuplicadas = Array.isArray(p.paradas)
      ? p.paradas.map((x) => ({ ...x, id: uuid() }))
      : [];
    const payload = {
      nome: copia,
      paradas: paradasDuplicadas,
      autor_id: user?.id ?? null,
      autor_nome: profile?.nome_completo ?? null,
    };
    const { data, error } = await supabase
      .from("planejamentos")
      .insert(payload)
      .select("id")
      .single();
    if (error && !isRelationMissing(error)) {
      toast.error("Não foi possível duplicar.", { description: erroParaMensagem(error) });
      return;
    }
    if (isRelationMissing(error)) {
      const items = lerLocais();
      items.push({
        id: -Date.now(),
        nome: copia,
        autor_nome: profile?.nome_completo ?? null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        paradas: payload.paradas,
      });
      gravarLocais(items);
    } else {
      const items = lerLocais();
      items.push({
        id: Number(data?.id),
        nome: copia,
        autor_nome: profile?.nome_completo ?? null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        paradas: paradasDuplicadas,
      });
      gravarLocais(items);
    }
    toast.success("Cópia criada.");
    await abrirBiblioteca();
  };

  const renomear = async () => {
    if (!renomearAlvo || !renomearInput.trim()) return;
    const { error } = await supabase
      .from("planejamentos")
      .update({ nome: renomearInput.trim() })
      .eq("id", renomearAlvo.id);
    if (error && !isRelationMissing(error)) {
      toast.error("Não foi possível renomear.", { description: error.message });
      return;
    }
    if (isRelationMissing(error)) {
      const items = lerLocais().map((p) =>
        p.id === renomearAlvo.id ? { ...p, nome: renomearInput.trim() } : p,
      );
      gravarLocais(items);
    }
    if (planejamentoId === renomearAlvo.id) setPlanejamentoNome(renomearInput.trim());
    setRenomearAlvo(null);
    toast.success("Renomeado.");
    await abrirBiblioteca();
  };

  const excluir = async () => {
    if (!excluirAlvo) return;
    const { error } = await supabase.from("planejamentos").delete().eq("id", excluirAlvo.id);
    if (error && !isRelationMissing(error)) {
      toast.error("Não foi possível excluir.", { description: error.message });
      return;
    }
    if (isRelationMissing(error)) {
      gravarLocais(lerLocais().filter((p) => p.id !== excluirAlvo.id));
    }
    if (planejamentoId === excluirAlvo.id) {
      setPlanejamentoId(null);
      setPlanejamentoNome("");
      setParadas([]);
    }
    setExcluirAlvo(null);
    toast.success("Planejamento excluído.");
    await abrirBiblioteca();
  };

  const exportar = async () => {
    if (paradas.length === 0) {
      toast.warning("Não há paradas para exportar.");
      return;
    }
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Planejamento");

      const totalOs = paradas.reduce((acc, p) => acc + ossDeParada(p).length, 0);
      const existentes = paradas.reduce(
        (acc, p) => acc + ossDeParada(p).filter((o) => o.origem === "sistema").length,
        0,
      );
      const pendentesCriacao = paradas.reduce(
        (acc, p) => acc + ossDeParada(p).filter((o) => o.origem === "nova").length,
        0,
      );

      const resumo = ws.getRow(1);
      resumo.font = { bold: true };
      resumo.values = [
        `Resumo do Planejamento${planejamentoNome ? ` — ${planejamentoNome}` : ""}`,
        "",
        `Paradas: ${paradas.length}`,
        `O.S.: ${totalOs}`,
        `Existentes: ${existentes}`,
        `Pendentes de criação: ${pendentesCriacao}`,
      ];
      resumo.eachCell((cell) => {
        if (cell.value)
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF3FB" } };
      });

      ws.columns = [
        { header: "Parada #", key: "n", width: 8 },
        { header: "Elevatória", key: "elev", width: 34 },
        { header: "Planta", key: "planta", width: 20 },
        { header: "OS", key: "os", width: 14 },
        { header: "Tipo", key: "tipo", width: 26 },
        { header: "Texto Breve", key: "texto", width: 48 },
        { header: "Status", key: "status", width: 18 },
        { header: "Observações", key: "obs", width: 40 },
      ];
      const header = ws.getRow(2);
      header.font = { bold: true };
      header.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B3A73" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      });

      const linhaOs = (p: Parada, i: number, o: OsInfo) => ({
        n: i + 1,
        elev: p.elevatoria_nome,
        planta: p.planta || "",
        os: o.origem === "nova" ? "PENDENTE" : o.origem === "vazio" ? "" : o.om || "",
        tipo: o.tipo || "",
        texto: o.texto_breve || "",
        status: statusDaOS(o).label,
        obs: o.observacao || "",
      });

      paradas.forEach((p, i) => {
        const oss = ossDeParada(p);
        if (oss.length === 0) ws.addRow(linhaOs(p, i, { origem: "vazio" }));
        else for (const o of oss) ws.addRow(linhaOs(p, i, o));
      });

      if (pendentes.length > 0) {
        const ws2 = wb.addWorksheet("Pendentes");
        ws2.columns = [
          { header: "Elevatória", key: "elev", width: 34 },
          { header: "Planta", key: "planta", width: 22 },
          { header: "Latitude", key: "lat", width: 14 },
          { header: "Longitude", key: "lon", width: 14 },
        ];
        const head2 = ws2.getRow(1);
        head2.font = { bold: true };
        head2.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        });
        for (const p of pendentes) {
          ws2.addRow({ elev: p.nome, planta: p.planta || "", lat: p.lat, lon: p.lon });
        }
      }
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(planejamentoNome || "planejamento")
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Planilha exportada.");
    } catch (err) {
      toast.error("Falha ao exportar.", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const removerOsConfirmar = () => {
    if (removerOsAlvo) {
      removeOs(removerOsAlvo.idx, removerOsAlvo.osIdx);
      setRemoverOsAlvo(null);
      toast.success("O.S. removida.");
    }
  };

  const abreOsDialog = (idx: number, osIdx: number | null) => setOsDialogAlvo({ idx, osIdx });

  const removerParadaConfirmar = (idx: number) => {
    if (window.confirm(`Remover ${String(paradas[idx]?.elevatoria_nome)} da rota?`)) {
      removeParada(idx);
    }
  };

  const tabela = (
    <div className="overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Elevatória</th>
            <th className="px-2 py-2 text-left">OS</th>
            <th className="px-2 py-2 text-left">Tipo</th>
            <th className="px-2 py-2 text-left">Texto Breve</th>
            <th className="px-2 py-2 text-left">Status</th>
            <th className="px-2 py-2 text-right">Ações</th>
          </tr>
        </thead>
        {paradas.length === 0 && (
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                Nenhuma parada ainda. Clique nas elevatórias no mapa para montar a rota.
              </td>
            </tr>
          </tbody>
        )}
        {paradas.map((p, idx) => {
          const oss = ossDeParada(p);
          const colapsada = colapsadas.has(p.id);
          const botaoAcao =
            "rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] disabled:opacity-30 dark:hover:bg-slate-700 cursor-pointer";
          return (
            <tbody key={p.id} className="border-t border-slate-100 dark:border-slate-700">
              <tr className="bg-slate-50/60 hover:bg-[#eaf3fb]/40 dark:bg-slate-800/40 dark:hover:bg-slate-700/30">
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => toggleParada(p.id)}
                    title={colapsada ? "Expandir" : "Recolher"}
                    className="mr-1 inline-flex items-center rounded p-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${colapsada ? "-rotate-90" : ""}`}
                    />
                  </button>
                  <span className="font-bold text-[#0b3a73] dark:text-white">{idx + 1}</span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.elevatoria_nome}</span>
                    <span className="inline-flex items-center rounded bg-[#0b3a73] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {oss.length} OS
                    </span>
                    {p.planta && (
                      <span className="text-[10px] text-slate-400">Planta: {p.planta}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">{p.elevatoria_id}</div>
                </td>
                <td colSpan={4} className="px-2 py-1.5 text-right">
                  <button
                    onClick={() => setPuxarAlvo(idx)}
                    disabled={!p.planta}
                    title={
                      p.planta
                        ? "Puxar todas as O.S. dessa planta (filtra por tipo e SLA)"
                        : "Parada sem planta vinculada"
                    }
                    className="mr-2 inline-flex items-center gap-1 rounded border border-dashed border-emerald-600 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30 cursor-pointer"
                  >
                    <ClipboardList className="h-3 w-3" /> Puxar O.S.
                  </button>
                  <button
                    onClick={() => abreOsDialog(idx, null)}
                    className="mr-2 inline-flex items-center gap-1 rounded border border-dashed border-[#1f7ad6] px-2 py-1 text-[11px] font-semibold text-[#0b3a73] hover:bg-[#eaf3fb] dark:text-white dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <FilePlus2 className="h-3 w-3" /> Adicionar OS
                  </button>
                  <span className="inline-flex items-center gap-0.5">
                    <button
                      onClick={() => moveParada(idx, -1)}
                      disabled={idx === 0}
                      title="Subir"
                      className={botaoAcao}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveParada(idx, 1)}
                      disabled={idx === paradas.length - 1}
                      title="Descer"
                      className={botaoAcao}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removerParadaConfirmar(idx)}
                      title="Remover da rota"
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
              {!colapsada &&
                oss.map((o, osIdx) => {
                  const st = statusDaOS(o);
                  return (
                    <tr
                      key={osIdx}
                      className="border-t border-slate-100 hover:bg-[#eaf3fb]/50 dark:border-slate-700 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-2 py-1 text-center text-[10px] text-slate-400">
                        {osIdx + 1}º
                      </td>
                      <td className="px-2 py-1" />
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          {o.origem === "nova" && (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              title="Pendente de criação"
                            >
                              <FilePlus2 className="h-3 w-3" />
                            </span>
                          )}
                          <input
                            value={o.om || ""}
                            onChange={(e) => vincularPorTexto(idx, osIdx, e.target.value)}
                            placeholder={
                              o.origem === "nova" ? "Digite o nº da O.S. criada" : "Nº da O.S."
                            }
                            title={
                              o.origem === "nova"
                                ? "Esta O.S. está pendente de criação. Digite o nº da O.S. criada para vinculá-la."
                                : "Digite o nº da O.S. para vincular (busca no backlog)"
                            }
                            className="w-40 rounded border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-slate-700 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1f7ad6] focus:bg-white focus:outline-none dark:text-slate-200 dark:hover:border-slate-600 dark:focus:bg-slate-800"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={o.tipo || ""}
                          onChange={(e) =>
                            updateOs(idx, osIdx, {
                              tipo: e.target.value === "Outro" ? "Outro" : e.target.value,
                            })
                          }
                          className="w-40 rounded border border-slate-200 bg-white px-1 py-1 text-[12px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="">Sem tipo</option>
                          {o.tipo && !TIPOS_OS.includes(o.tipo) && (
                            <option value={o.tipo}>{o.tipo}</option>
                          )}
                          {TIPOS_OS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={o.texto_breve || ""}
                          onChange={(e) => updateOs(idx, osIdx, { texto_breve: e.target.value })}
                          placeholder="Texto breve"
                          className="w-56 rounded border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-slate-700 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1f7ad6] focus:bg-white focus:outline-none dark:text-slate-200 dark:hover:border-slate-600 dark:focus:bg-slate-800"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => abreOsDialog(idx, osIdx)}
                            title="Editar O.S."
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setRemoverOsAlvo({
                                idx,
                                osIdx,
                              })
                            }
                            title="Remover O.S."
                            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!colapsada && (
                <tr className="border-t border-slate-100 dark:border-slate-700">
                  <td colSpan={7} className="px-2 py-1">
                    <button
                      onClick={() => abreOsDialog(idx, null)}
                      className="inline-flex items-center gap-1 rounded border border-dashed border-[#1f7ad6] px-2 py-1 text-[11px] font-semibold text-[#0b3a73] hover:bg-[#eaf3fb] dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <FilePlus2 className="h-3 w-3" /> Adicionar OS
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#0b3a73] dark:text-white">
            <RouteIcon className="h-4 w-4" /> Planejamento de Rotas
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {planejamentoNome
              ? `Planejamento: ${planejamentoNome}`
              : "Clique nas elevatórias para montar a rota e associe as O.S. a cada parada."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={abrirBiblioteca}
            disabled={carregandoBiblioteca}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            {carregandoBiblioteca ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" />
            )}
            Planejamentos
          </button>
          <button
            onClick={optimizeRoute}
            title="Reordena as paradas pela proximidade geográfica"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Wand2 className="h-3.5 w-3.5" /> Otimizar Rota
          </button>
          <button
            onClick={() => setGerenciarModelosOpen(true)}
            title="Gerenciar modelos de O.S. reutilizáveis"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <LayoutTemplate className="h-3.5 w-3.5" /> Modelos
            {modelos.length > 0 && (
              <span className="ml-0.5 rounded-full bg-slate-200 px-1.5 text-[9px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {modelos.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setPendModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" /> Pendentes
            {pendentes.length > 0 && (
              <span className="ml-0.5 rounded-full bg-emerald-600 px-1.5 text-[9px] font-bold text-white">
                {pendentes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAlertasOpen(true)}
            title="Elevatórias sem preventiva executada"
            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Alertas
            {alertas.length > 0 && (
              <span className="ml-0.5 rounded-full bg-red-600 px-1.5 text-[9px] font-bold text-white">
                {alertas.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAlertaConfigOpen(true)}
            title="Configurar prazos de alerta por criticidade ou por elevatória"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" /> Configurar Alertas
          </button>
          <button
            onClick={exportar}
            disabled={paradas.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-[#1f7ad6] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0b3a73] hover:bg-[#eaf3fb] disabled:opacity-40 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-[#1f7ad6] disabled:opacity-50 cursor-pointer"
          >
            {salvando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {planejamentoId != null ? "Salvar alterações" : "Salvar Planejamento"}
          </button>
        </div>
      </div>

      <PlanejamentoMap
        elevatorias={elevatorias}
        paradas={paradas}
        pendentes={pendentes}
        onAdd={addElevatoria}
        onRemove={removeParada}
      />

      {elevLoading && (
        <div className="my-2 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando elevatórias…
        </div>
      )}

      <div className="mt-3">{tabela}</div>

      <OsDialog
        alvo={osDialogAlvo}
        paradas={paradas}
        backlogOS={backlogOS}
        modelos={modelos}
        onClose={() => setOsDialogAlvo(null)}
        onAdd={addOs}
        onUpdate={updateOs}
        onAbrirModelos={() => setGerenciarModelosOpen(true)}
      />

      <GerenciarModelosDialog
        open={gerenciarModelosOpen}
        onOpenChange={setGerenciarModelosOpen}
        modelos={modelos}
        onCriar={criarModelo}
        onAtualizar={atualizarModelo}
        onDuplicar={duplicarModelo}
        onRemover={removerModelo}
      />

      <AlertasDialog
        open={alertasOpen}
        onOpenChange={setAlertasOpen}
        alertas={alertas}
        filtro={alertaFiltro}
        onFiltro={setAlertaFiltro}
        planejamentoId={planejamentoId}
        onAdicionar={addElevatoria}
        onAbrirSeletor={abrirBiblioteca}
        onAbrirConfig={() => setAlertaConfigOpen(true)}
      />

      <ConfigAlertasDialog
        open={alertaConfigOpen}
        onOpenChange={setAlertaConfigOpen}
        config={alertaConfig}
        elevatorias={todasElevatorias}
        onSalvarPrazoCriticidade={salvarPrazoCriticidade}
        onSalvarPrazoElevatoria={salvarPrazoElevatoria}
        onSalvarCriticidade={salvarCriticidadeElevatoria}
      />

      <PuxarOSDialog
        idx={puxarAlvo}
        paradas={paradas}
        backlogOS={backlogOS}
        onClose={() => setPuxarAlvo(null)}
        onPuxar={puxarOs}
      />

      <Dialog open={removerOsAlvo !== null} onOpenChange={(o) => !o && setRemoverOsAlvo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Remover O.S.?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Deseja remover esta O.S. da parada?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRemoverOsAlvo(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={removerOsConfirmar}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
            >
              Remover
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={nomeDialogOpen} onOpenChange={setNomeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">
              Nome do planejamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              autoFocus
              value={nomeInput}
              onChange={(e) => setNomeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmarNome()}
              placeholder="Ex.: Rota segunda-feira · Baixada Sul"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNomeDialogOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarNome}
                className="rounded-md bg-[#0b3a73] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f7ad6] cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CadastroDialog
        open={renomearAlvo !== null}
        title="Renomear planejamento"
        value={renomearInput}
        onChange={setRenomearInput}
        onConfirm={renomear}
        onCancel={() => setRenomearAlvo(null)}
      />

      <Dialog open={excluirAlvo !== null} onOpenChange={(o) => !o && setExcluirAlvo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir planejamento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Deseja excluir "{excluirAlvo?.nome}" com {excluirAlvo ? contarParadas(excluirAlvo) : 0}{" "}
            paradas? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setExcluirAlvo(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={excluir}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bibliotecaOpen} onOpenChange={setBibliotecaOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0b3a73] dark:text-white">
              <FolderOpen className="h-4 w-4" /> Planejamentos salvos
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {carregandoBiblioteca && (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            )}
            {!carregandoBiblioteca && biblioteca.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Nenhum planejamento salvo ainda.
              </p>
            )}
            {!carregandoBiblioteca &&
              biblioteca.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-700/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#0b3a73] dark:text-white">
                      {p.nome}
                      {planejamentoId === p.id && (
                        <span className="ml-2 rounded bg-[#1f7ad6] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          ATUAL
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{p.autor_nome ? `Autor: ${p.autor_nome}` : "Autor: —"}</span>
                      <span>
                        {p.criado_em ? new Date(p.criado_em).toLocaleString("pt-BR") : ""}
                      </span>
                      <span>
                        {contarParadas(p)} parada{contarParadas(p) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirPlanejamento(p)}
                      title="Abrir/Editar"
                      className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1f7ad6] cursor-pointer"
                    >
                      <FolderOpen className="h-3 w-3" /> Abrir
                    </button>
                    <button
                      onClick={() => {
                        setRenomearInput(p.nome);
                        setRenomearAlvo(p);
                      }}
                      title="Renomear"
                      className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => duplicar(p)}
                      title="Duplicar"
                      className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setExcluirAlvo(p)}
                      title="Excluir"
                      className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <PendentesDialog
        open={pendModalOpen}
        onOpenChange={setPendModalOpen}
        elevatorias={elevatorias}
        pendentes={pendentes}
        paradas={paradas}
        onAdd={addPendente}
        onRemove={removePendente}
        onPromover={promoverPendente}
      />
    </div>
  );
}

function PuxarOSDialog({
  idx,
  paradas,
  backlogOS,
  onClose,
  onPuxar,
}: {
  idx: number | null;
  paradas: Parada[];
  backlogOS: BacklogOS[];
  onClose: () => void;
  onPuxar: (idx: number, rows: BacklogOS[]) => void;
}) {
  const parada = idx != null ? paradas[idx] : null;
  const [fTipos, setFTipos] = useState<string[]>([]);
  const [fSlaAntes, setFSlaAntes] = useState("");

  const daParada = useMemo(() => {
    if (!parada?.planta) return [] as BacklogOS[];
    const codigo = codigoPlanta(parada.planta);
    return backlogOS.filter((r) => codigoPlanta(r.PLANTA) === codigo);
  }, [parada, backlogOS]);

  const tipos = useMemo(
    () =>
      Array.from(
        new Set(daParada.map((r) => normalizaTipoOS(r["Tipo de Atividade"]) || "").filter(Boolean)),
      ).sort(),
    [daParada],
  );

  const resultado = useMemo(() => {
    const slaLimit = fSlaAntes ? new Date(fSlaAntes + "T00:00:00") : null;
    return daParada.filter((r) => {
      if (fTipos.length && !fTipos.includes(normalizaTipoOS(r["Tipo de Atividade"]) || ""))
        return false;
      if (slaLimit) {
        const fim = parseDataSla(r["Fim do SLA"]);
        if (fim && fim >= slaLimit) return false;
      }
      return true;
    });
  }, [daParada, fTipos, fSlaAntes]);

  const jaExistentes = useMemo(() => {
    if (idx == null) return new Set<string>();
    return new Set(
      ossDeParada(paradas[idx])
        .map((o) => o.om)
        .filter(Boolean),
    );
  }, [idx, paradas]);

  const aPuxar = resultado.filter((r) => !jaExistentes.has(String(r["Ordem de Manutenção"] || "")));

  const toggTipo = (t: string) => {
    if (fTipos.includes(t)) setFTipos(fTipos.filter((x) => x !== t));
    else setFTipos([...fTipos, t]);
  };

  const fChip = (ativo: boolean) =>
    `inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
      ativo
        ? "border-emerald-600 bg-emerald-600 text-white"
        : "border-slate-300 text-slate-600 hover:border-emerald-600 dark:border-slate-600 dark:text-slate-300"
    }`;

  return (
    <Dialog open={idx != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#0b3a73] dark:text-white">
            Puxar O.S. — {parada?.elevatoria_nome || ""}
          </DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-slate-400">
          {parada?.planta ? `Planta: ${parada.planta}` : "Parada sem planta vinculada."}
          {daParada.length > 0 && ` · ${daParada.length} O.S. no backlog`}
        </p>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tipo de O.S.
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFTipos([])}
                className={fChip(fTipos.length === 0)}
              >
                Todos
              </button>
              {tipos.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggTipo(t)}
                  className={fChip(fTipos.includes(t))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Fim do SLA até
            </label>
            <input
              type="date"
              value={fSlaAntes}
              onChange={(e) => setFSlaAntes(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
            {fSlaAntes && (
              <button
                type="button"
                onClick={() => setFSlaAntes("")}
                className="text-[11px] text-[#1f7ad6] hover:underline cursor-pointer"
              >
                limpar
              </button>
            )}
          </div>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {resultado.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">
              Nenhuma O.S. encontrada com esses filtros.
            </p>
          )}
          {resultado.map((r, i) => {
            const ja = jaExistentes.has(String(r["Ordem de Manutenção"] || ""));
            return (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-600"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#0b3a73] dark:text-white">
                    {r["Ordem de Manutenção"] || "—"}
                  </div>
                  <div className="truncate text-slate-500 dark:text-slate-400">
                    {r["TEXTO BREVE"] || "—"}
                  </div>
                  <div className="truncate text-[10px] text-slate-400">
                    {normalizaTipoOS(r["Tipo de Atividade"]) || "—"} · Fim SLA:{" "}
                    {fmtDataSla(parseDataSla(r["Fim do SLA"])) || "—"}
                  </div>
                </div>
                {ja && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-700">
                    já na rota
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (idx != null) {
                onPuxar(idx, aPuxar);
                onClose();
              }
            }}
            disabled={aPuxar.length === 0}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Puxar ({aPuxar.length}) para a rota
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MODELO_VAZIO: OsModeloDados = {
  nome: "",
  tipo_ordem: "",
  planta: "",
  equipamento: "",
  prioridade: "",
  texto_breve: "",
  observacoes: "",
};

function GerenciarModelosDialog({
  open,
  onOpenChange,
  modelos,
  onCriar,
  onAtualizar,
  onDuplicar,
  onRemover,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelos: OsModelo[];
  onCriar: (dados: OsModeloDados) => void;
  onAtualizar: (m: OsModelo) => void;
  onDuplicar: (m: OsModelo) => void;
  onRemover: (id: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [formEditando, setFormEditando] = useState<OsModelo | null>(null);
  const [formDados, setFormDados] = useState<OsModeloDados>(MODELO_VAZIO);

  useEffect(() => {
    if (!open) {
      setBusca("");
      setFormAberto(false);
      setFormEditando(null);
    }
  }, [open]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const ordenados = [...modelos].sort((a, b) => a.nome.localeCompare(b.nome));
    if (!q) return ordenados;
    return ordenados.filter(
      (m) => m.nome.toLowerCase().includes(q) || m.tipo_ordem.toLowerCase().includes(q),
    );
  }, [busca, modelos]);

  const abrirNovo = () => {
    setFormEditando(null);
    setFormDados(MODELO_VAZIO);
    setFormAberto(true);
  };

  const abrirEdicao = (m: OsModelo) => {
    setFormEditando(m);
    setFormDados({
      nome: m.nome,
      tipo_ordem: m.tipo_ordem,
      planta: m.planta || "",
      equipamento: m.equipamento || "",
      prioridade: m.prioridade || "",
      texto_breve: m.texto_breve || "",
      observacoes: m.observacoes || "",
    });
    setFormAberto(true);
  };

  const salvarForm = () => {
    if (!formDados.nome.trim()) {
      toast.warning("Informe o nome do modelo.");
      return;
    }
    if (!formDados.tipo_ordem) {
      toast.warning("Selecione o tipo de ordem.");
      return;
    }
    if (formEditando) {
      onAtualizar({ ...formEditando, ...formDados });
    } else {
      onCriar(formDados);
    }
    setFormAberto(false);
    setFormEditando(null);
  };

  const excluir = (m: OsModelo) => {
    if (window.confirm(`Excluir o modelo "${m.nome}"?`)) {
      onRemover(m.id);
    }
  };

  const campo =
    "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">
              <LayoutTemplate className="mr-1.5 inline h-4 w-4" /> Modelos de O.S.
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar modelo por nome ou tipo…"
                className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <button
              onClick={abrirNovo}
              className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#1f7ad6] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Modelo
            </button>
          </div>

          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {filtrados.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">
                {modelos.length === 0
                  ? "Nenhum modelo cadastrado ainda. Crie o primeiro acima."
                  : "Nenhum modelo encontrado para a busca."}
              </p>
            )}
            {filtrados.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-600"
              >
                <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-[#1f7ad6]" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#0b3a73] dark:text-white">{m.nome}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {m.texto_breve || "Sem texto breve"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {m.tipo_ordem}
                    </span>
                    {m.planta && (
                      <span className="rounded-full bg-[#eaf3fb] px-1.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {m.planta}
                      </span>
                    )}
                    {m.prioridade && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        {m.prioridade}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => abrirEdicao(m)}
                    title="Editar modelo"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDuplicar(m)}
                    title="Duplicar modelo"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => excluir(m)}
                    title="Excluir modelo"
                    className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={formAberto} onOpenChange={(o) => !o && setFormAberto(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">
              {formEditando ? "Editar modelo" : "Novo modelo de O.S."}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome do Modelo *">
                <input
                  autoFocus
                  value={formDados.nome}
                  onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })}
                  placeholder='Ex.: "Preventiva Padrão Bomba"'
                  className={campo}
                />
              </Field>
            </div>
            <Field label="Tipo de Ordem *">
              <select
                value={formDados.tipo_ordem}
                onChange={(e) => setFormDados({ ...formDados, tipo_ordem: e.target.value })}
                className={campo}
              >
                <option value="">Selecione…</option>
                {TIPOS_OS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Planta">
              <input
                value={formDados.planta}
                onChange={(e) => setFormDados({ ...formDados, planta: e.target.value })}
                className={campo}
              />
            </Field>
            <Field label="Equipamento">
              <input
                value={formDados.equipamento}
                onChange={(e) => setFormDados({ ...formDados, equipamento: e.target.value })}
                className={campo}
              />
            </Field>
            <Field label="Prioridade">
              <select
                value={formDados.prioridade}
                onChange={(e) => setFormDados({ ...formDados, prioridade: e.target.value })}
                className={campo}
              >
                <option value="">—</option>
                {["NORMAL", "ALTA", "EMERGENCIAL"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Texto Breve">
                <input
                  value={formDados.texto_breve}
                  onChange={(e) => setFormDados({ ...formDados, texto_breve: e.target.value })}
                  className={campo}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Observações">
                <textarea
                  value={formDados.observacoes}
                  onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })}
                  rows={2}
                  className={campo}
                />
              </Field>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setFormAberto(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={salvarForm}
              className="rounded-md bg-[#0b3a73] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f7ad6] cursor-pointer"
            >
              {formEditando ? "Salvar alterações" : "Criar modelo"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AlertasDialog({
  open,
  onOpenChange,
  alertas,
  filtro,
  onFiltro,
  planejamentoId,
  onAdicionar,
  onAbrirSeletor,
  onAbrirConfig,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  alertas: AlertaItem[];
  filtro: Criticidade | "todas";
  onFiltro: (f: Criticidade | "todas") => void;
  planejamentoId: number | null;
  onAdicionar: (el: Elevatoria) => void;
  onAbrirSeletor: () => void;
  onAbrirConfig: () => void;
}) {
  const contagem = {
    critica: alertas.filter((a) => a.el.criticidade === "critica").length,
    importante: alertas.filter((a) => a.el.criticidade === "importante").length,
    padrao: alertas.filter((a) => a.el.criticidade === "padrao").length,
  };
  const filtrados =
    filtro === "todas" ? alertas : alertas.filter((a) => a.el.criticidade === filtro);

  const adicionarOuSelecionar = (a: AlertaItem) => {
    if (planejamentoId != null) {
      onAdicionar(a.el);
      toast.success(`${a.el.nome} adicionada à rota.`);
    } else {
      onAbrirSeletor();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" /> Alertas de preventiva
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {alertas.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "todas" as const, label: `Todas (${alertas.length})` },
              { id: "critica" as const, label: `🔴 Críticas (${contagem.critica})` },
              { id: "importante" as const, label: `🟡 Importantes (${contagem.importante})` },
              { id: "padrao" as const, label: `🟢 Padrão (${contagem.padrao})` },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => onFiltro(c.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                  filtro === c.id
                    ? "bg-[#0b3a73] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={onAbrirConfig}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Settings className="h-3 w-3" /> Configurar
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto pr-1">
          {filtrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhuma elevatória em alerta no momento.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtrados.map((a) => {
                const meta = CRITICIDADE_META[a.el.criticidade];
                const excedido = a.nivel === "excedido";
                const numDias = a.dias != null ? `${a.dias} dias` : "—";
                return (
                  <li
                    key={a.el.id}
                    className={`rounded-lg border-l-4 bg-white p-2.5 shadow-sm dark:bg-slate-800 ${
                      excedido ? "border-l-red-500" : "border-l-orange-400"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold text-[#0b3a73] dark:text-white">
                            {a.el.nome}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeCls}`}
                          >
                            {meta.emoji} {meta.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Última preventiva: {a.ultima ? fmtDateBR(a.ultima) : "Nunca registrada"}
                          </span>
                          <span>
                            Prazo: {a.prazo} dias
                            {a.personalizado ? " (personalizado)" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-1 text-[12px] font-bold ${
                            excedido
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                          }`}
                        >
                          {numDias} sem preventiva
                        </span>
                        <button
                          onClick={() => adicionarOuSelecionar(a)}
                          title={
                            planejamentoId != null
                              ? `Adicionar ${a.el.nome} à rota atual`
                              : "Nenhum planejamento aberto — abrir seletor"
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1f7ad6] cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Adicionar ao Planejamento
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrazoDiasInput({
  valor,
  onConfirmar,
}: {
  valor: number;
  onConfirmar: (v: number) => void;
}) {
  const [val, setVal] = useState<string>(String(valor));
  useEffect(() => setVal(String(valor)), [valor]);
  return (
    <input
      type="number"
      min={1}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n <= 0) {
          setVal(String(valor));
          return;
        }
        if (n !== valor) onConfirmar(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    />
  );
}

function ConfigAlertasDialog({
  open,
  onOpenChange,
  config,
  elevatorias,
  onSalvarPrazoCriticidade,
  onSalvarPrazoElevatoria,
  onSalvarCriticidade,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  config: AlertaConfig[];
  elevatorias: ElevatoriaBasica[];
  onSalvarPrazoCriticidade: (crit: Criticidade, dias: number) => void;
  onSalvarPrazoElevatoria: (elId: number, dias: number | null) => void;
  onSalvarCriticidade: (elId: number, crit: Criticidade) => void;
}) {
  const [busca, setBusca] = useState("");
  const defaultPorCriticidade = (c: Criticidade) =>
    config.find((x) => x.elevatoria_id === null && x.criticidade === c)?.prazo_dias ??
    PRAZO_DEFAULTS[c];
  const overrides = useMemo(
    () =>
      new Map(
        config
          .filter((c) => c.elevatoria_id !== null)
          .map((c) => [c.elevatoria_id as number, c.prazo_dias]),
      ),
    [config],
  );
  const q = busca.trim().toLowerCase();
  const filtradas = elevatorias.filter(
    (e) => !q || e.nome.toLowerCase().includes(q) || (e.planta ?? "").toLowerCase().includes(q),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#0b3a73]" /> Configurar Alertas
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="mb-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
            Prazo por criticidade (padrão global)
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {CRITICIDADES.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                  <span>{CRITICIDADE_META[c].emoji}</span> {CRITICIDADE_META[c].label}
                </span>
                <span className="flex items-center gap-1">
                  <PrazoDiasInput
                    valor={defaultPorCriticidade(c)}
                    onConfirmar={(v) => onSalvarPrazoCriticidade(c, v)}
                  />
                  <span className="text-[10px] text-slate-400">dias</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="mb-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
            Prazo por elevatória (override individual)
          </h3>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar elevatória…"
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-7 pr-2 text-xs text-slate-700 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtradas.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Nenhuma elevatória encontrada.
              </p>
            ) : (
              filtradas.map((e) => {
                const personalizado = overrides.has(e.id);
                const prazoEfetivo = overrides.get(e.id) ?? defaultPorCriticidade(e.criticidade);
                return (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-600 dark:bg-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                          {e.nome}
                        </span>
                        {personalizado ? (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            Customizado
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            Padrão
                          </span>
                        )}
                      </div>
                      {e.planta && <div className="text-[10px] text-slate-400">{e.planta}</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={e.criticidade}
                        onChange={(ev) => onSalvarCriticidade(e.id, ev.target.value as Criticidade)}
                        className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white cursor-pointer"
                      >
                        <option value="critica">🔴 Crítica</option>
                        <option value="importante">🟡 Importante</option>
                        <option value="padrao">🟢 Padrão</option>
                      </select>
                      <PrazoDiasInput
                        valor={prazoEfetivo}
                        onConfirmar={(v) => onSalvarPrazoElevatoria(e.id, v)}
                      />
                      <span className="text-[10px] text-slate-400">dias</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OsDialog({
  alvo,
  paradas,
  backlogOS,
  modelos,
  onClose,
  onAdd,
  onUpdate,
  onAbrirModelos,
}: {
  alvo: { idx: number; osIdx: number | null } | null;
  paradas: Parada[];
  backlogOS: BacklogOS[];
  modelos: OsModelo[];
  onClose: () => void;
  onAdd: (idx: number, os: OsInfo) => void;
  onUpdate: (idx: number, osIdx: number, patch: Partial<OsInfo>) => void;
  onAbrirModelos: () => void;
}) {
  const [mode, setMode] = useState<"existente" | "nova" | "modelo">("existente");
  const [busca, setBusca] = useState("");
  const [buscaModelo, setBuscaModelo] = useState("");
  const [selecionada, setSelecionada] = useState<BacklogOS | null>(null);
  const [nova, setNova] = useState({
    om: "",
    tipo: "",
    texto_breve: "",
    planta: "",
    equipamento: "",
    prioridade: "",
    observacao: "",
  });

  const editando = alvo != null && alvo.osIdx != null;
  const idx = alvo?.idx ?? null;
  const parada = idx != null ? paradas[idx] : null;
  const osAtual = editando && parada ? ossDeParada(parada)[alvo!.osIdx as number] : null;

  useEffect(() => {
    if (alvo) {
      setBusca("");
      setBuscaModelo("");
      setSelecionada(null);
      if (editando && osAtual) {
        setNova({
          om: osAtual.om || "",
          tipo: osAtual.tipo || "",
          texto_breve: osAtual.texto_breve || "",
          planta: osAtual.planta || "",
          equipamento: osAtual.equipamento || "",
          prioridade: osAtual.prioridade || "",
          observacao: osAtual.observacao || "",
        });
        setMode(osAtual.origem === "nova" ? "nova" : "existente");
      } else {
        setNova({
          om: "",
          tipo: "",
          texto_breve: "",
          planta: "",
          equipamento: "",
          prioridade: "",
          observacao: "",
        });
        setMode("existente");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo]);

  const usarModelo = (m: OsModelo) => {
    setNova({
      om: "",
      tipo: m.tipo_ordem,
      texto_breve: m.texto_breve || "",
      planta: m.planta || "",
      equipamento: m.equipamento || "",
      prioridade: m.prioridade || "",
      observacao: m.observacoes || "",
    });
    setMode("nova");
  };

  const modelosFiltrados = useMemo(() => {
    const q = buscaModelo.trim().toLowerCase();
    const ordenados = [...modelos].sort((a, b) => a.nome.localeCompare(b.nome));
    if (!q) return ordenados;
    return ordenados.filter(
      (m) => m.nome.toLowerCase().includes(q) || m.tipo_ordem.toLowerCase().includes(q),
    );
  }, [buscaModelo, modelos]);

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = backlogOS.filter((r) => r["Ordem de Manutenção"] || r["TEXTO BREVE"] || r.PLANTA);
    if (!q) return base.slice(0, 30);
    return base
      .filter(
        (r) =>
          (r["Ordem de Manutenção"] || "").toLowerCase().includes(q) ||
          (r["TEXTO BREVE"] || "").toLowerCase().includes(q) ||
          (r.PLANTA || "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [busca, backlogOS]);

  const confirmar = () => {
    if (idx == null) return;
    if (mode === "existente" && selecionada) {
      const os = {
        origem: "sistema" as const,
        om: selecionada["Ordem de Manutenção"] || undefined,
        tipo: normalizaTipoOS(selecionada["Tipo de Atividade"]),
        texto_breve: selecionada["TEXTO BREVE"] || undefined,
        planta: selecionada.PLANTA || undefined,
        equipamento: selecionada["DESCRIÇÃO EQUIPAMENTO"] || undefined,
        prioridade: selecionada.PRIORIDADE || undefined,
      };
      if (editando) onUpdate(idx, alvo!.osIdx as number, os);
      else onAdd(idx, os);
      onClose();
      toast.success("O.S. vinculada à parada.");
    } else if (mode === "nova" && nova.tipo) {
      const os = {
        origem: "nova" as const,
        om: nova.om || undefined,
        tipo: nova.tipo,
        texto_breve: nova.texto_breve || undefined,
        planta: nova.planta || undefined,
        equipamento: nova.equipamento || undefined,
        prioridade: nova.prioridade || undefined,
        observacao: nova.observacao || undefined,
      };
      if (editando) onUpdate(idx, alvo!.osIdx as number, os);
      else onAdd(idx, os);
      onClose();
      toast.success(editando ? "O.S. atualizada." : "O.S. registrada como pendente de criação.");
    } else if (mode === "nova") {
      toast.warning("Informe ao menos o tipo de ordem.");
    } else if (editando) {
      toast.warning("Selecione uma O.S. para atualizar.");
    }
  };

  return (
    <Dialog open={alvo != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#0b3a73] dark:text-white">
            {editando ? "Editar O.S." : "Adicionar O.S."} — Parada #{idx != null ? idx + 1 : ""}:{" "}
            {parada?.elevatoria_nome || ""}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700/40">
          <button
            onClick={() => setMode("existente")}
            className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold ${
              mode === "existente"
                ? "bg-white text-[#0b3a73] shadow dark:bg-slate-800 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            } cursor-pointer`}
          >
            <Link2 className="mr-1 inline h-3 w-3" /> O.S. existente
          </button>
          <button
            onClick={() => setMode("nova")}
            className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold ${
              mode === "nova"
                ? "bg-white text-[#0b3a73] shadow dark:bg-slate-800 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            } cursor-pointer`}
          >
            <FilePlus2 className="mr-1 inline h-3 w-3" />
            {editando ? "Editar campos" : "Nova O.S. (pendente)"}
          </button>
          <button
            onClick={() => setMode("modelo")}
            className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold ${
              mode === "modelo"
                ? "bg-white text-[#0b3a73] shadow dark:bg-slate-800 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            } cursor-pointer`}
          >
            <LayoutTemplate className="mr-1 inline h-3 w-3" /> Modelo de OS
          </button>
        </div>

        {mode === "modelo" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={buscaModelo}
                  onChange={(e) => setBuscaModelo(e.target.value)}
                  placeholder="Buscar modelo por nome ou tipo…"
                  className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <button
                onClick={onAbrirModelos}
                title="Criar, editar ou remover modelos"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <LayoutTemplate className="h-3.5 w-3.5" /> Gerenciar
              </button>
            </div>
            {modelos.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-xs text-slate-400">Nenhum modelo cadastrado ainda.</p>
                <button
                  onClick={onAbrirModelos}
                  className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1f7ad6] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar primeiro modelo
                </button>
              </div>
            ) : modelosFiltrados.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Nenhum modelo encontrado para a busca.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {modelosFiltrados.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => usarModelo(m)}
                    title={`Usar "${m.nome}" como base`}
                    className="flex w-full items-start gap-2 rounded-lg border border-slate-200 p-2 text-left text-xs transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb] dark:border-slate-600 dark:hover:bg-slate-700/60 cursor-pointer"
                  >
                    <LayoutTemplate className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7ad6]" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#0b3a73] dark:text-white">{m.nome}</div>
                      <div className="truncate text-slate-500 dark:text-slate-400">
                        {m.texto_breve || "—"}
                      </div>
                      <div className="truncate text-[10px] text-slate-400">
                        {m.tipo_ordem}
                        {m.planta ? ` · ${m.planta}` : ""}
                        {m.prioridade ? ` · ${m.prioridade}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : mode === "existente" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nº, descrição ou planta…"
                className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {resultados.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">
                  Nenhuma O.S. encontrada no backlog.
                </p>
              )}
              {resultados.map((r, i) => {
                const ativa = selecionada === r;
                return (
                  <button
                    key={i}
                    onClick={() => setSelecionada(r)}
                    className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left text-xs transition ${
                      ativa
                        ? "border-[#1f7ad6] bg-[#eaf3fb] dark:bg-slate-700/60"
                        : "border-slate-200 hover:border-[#1f7ad6] dark:border-slate-600"
                    } cursor-pointer`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#0b3a73] dark:text-white">
                        {r["Ordem de Manutenção"] || "—"}
                      </div>
                      <div className="truncate text-slate-500 dark:text-slate-400">
                        {r["TEXTO BREVE"] || "—"}
                      </div>
                      <div className="truncate text-[10px] text-slate-400">
                        {r.PLANTA || ""} · {r["Tipo de Atividade"] || ""}
                      </div>
                    </div>
                    {ativa && <CheckCircleMini />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {editando && (
              <div className="sm:col-span-2">
                <Field label="Nº da O.S.">
                  <input
                    value={nova.om}
                    onChange={(e) => setNova({ ...nova, om: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  />
                </Field>
              </div>
            )}
            <Field label="Tipo de Ordem *">
              <select
                value={nova.tipo}
                onChange={(e) => setNova({ ...nova, tipo: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Selecione…</option>
                {TIPOS_OS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Planta">
              <input
                value={nova.planta}
                onChange={(e) => setNova({ ...nova, planta: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </Field>
            <Field label="Equipamento">
              <input
                value={nova.equipamento}
                onChange={(e) => setNova({ ...nova, equipamento: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </Field>
            <Field label="Prioridade">
              <select
                value={nova.prioridade}
                onChange={(e) => setNova({ ...nova, prioridade: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">—</option>
                {["NORMAL", "ALTA", "EMERGENCIAL"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Texto Breve">
                <input
                  value={nova.texto_breve}
                  onChange={(e) => setNova({ ...nova, texto_breve: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Observações">
                <textarea
                  value={nova.observacao}
                  onChange={(e) => setNova({ ...nova, observacao: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </Field>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={
              mode === "modelo" ||
              (mode === "existente" && !selecionada) ||
              (mode === "nova" && !nova.tipo)
            }
            className="rounded-md bg-[#0b3a73] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-40 cursor-pointer"
          >
            {editando ? "Atualizar" : "Confirmar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckCircleMini() {
  return (
    <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function CadastroDialog({
  open,
  title,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#0b3a73] dark:text-white">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="rounded-md bg-[#0b3a73] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f7ad6] cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PendentesDialog({
  open,
  onOpenChange,
  elevatorias,
  pendentes,
  paradas,
  onAdd,
  onRemove,
  onPromover,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  elevatorias: Elevatoria[];
  pendentes: Elevatoria[];
  paradas: Parada[];
  onAdd: (el: Elevatoria) => void;
  onRemove: (id: number) => void;
  onPromover: (id: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const naRota = useMemo(() => new Set(paradas.map((p) => p.elevatoria_id)), [paradas]);
  const pendIds = useMemo(() => new Set(pendentes.map((p) => p.id)), [pendentes]);
  const lista = useMemo(
    () => elevatorias.filter((el) => !q || el.nome.toLowerCase().includes(q)),
    [elevatorias, q],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Pencil className="h-4 w-4" /> Pendentes
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Marcar como pendente
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar elevatória..."
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-[12px] focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1.5 dark:border-slate-700">
              {lista.length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-slate-400">
                  Nenhuma elevatória encontrada.
                </p>
              )}
              {lista.map((el) => {
                const jaPendente = pendIds.has(el.id);
                const rota = naRota.has(el.id);
                return (
                  <button
                    key={el.id}
                    disabled={jaPendente || rota}
                    onClick={() => onAdd(el)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-900/20"
                  >
                    <span className="truncate">{el.nome}</span>
                    {rota ? (
                      <span className="shrink-0 rounded bg-[#0b3a73] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        NA ROTA
                      </span>
                    ) : jaPendente ? (
                      <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        PENDENTE
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-emerald-600">+ marcar</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pendentes marcados ({pendentes.length})
            </div>
            {pendentes.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-slate-700">
                Nenhuma elevatória pendente. Marque acima para planejar a próxima rota.
              </p>
            ) : (
              <div className="space-y-1">
                {pendentes.map((el) => (
                  <div
                    key={el.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-2 dark:border-emerald-800 dark:bg-emerald-900/20"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-emerald-800 dark:text-emerald-200">
                        {el.nome}
                      </div>
                      {el.planta && (
                        <div className="text-[10px] text-emerald-700/70 dark:text-emerald-300/60">
                          {el.planta}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onPromover(el.id)}
                        className="cursor-pointer rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        Adicionar à Rota
                      </button>
                      <button
                        onClick={() => onRemove(el.id)}
                        title="Remover pendente"
                        className="cursor-pointer rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
