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
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Save,
  Search,
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

type Elevatoria = {
  id: number;
  nome: string;
  planta: string | null;
  lat: number;
  lon: number;
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
      }> = [];
      let de = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("elevatorias")
          .select("id, nome, planta, latitude, longitude")
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeIds = useMemo(() => new Set(paradas.map((p) => p.elevatoria_id)), [paradas]);

  const tabelaPendentesDisponivel = async () => {
    if (usarTabelaPend.current === null) {
      const { error } = await supabase.from("planejamentos_pendentes").select("id").limit(1);
      usarTabelaPend.current = !error ? true : !isRelationMissing(error);
    }
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
    setPendentes(
      (data ?? [])
        .map((r) => ({
          id: Number(r.elevatoria_id),
          nome: String(r.nome || `#${r.elevatoria_id}`),
          planta: typeof r.planta === "string" ? r.planta : null,
          lat: Number(r.lat),
          lon: Number(r.lon),
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)),
    );
  };

  const sincronizarPendentes = async (lista: Elevatoria[]) => {
    try {
      const comTabela = await tabelaPendentesDisponivel();
      if (!comTabela) {
        gravarPendGlobais(lista);
        return;
      }
      const { error: delErr } = await supabase
        .from("planejamentos_pendentes")
        .delete()
        .neq("id", 0);
      if (delErr) throw delErr;
      if (lista.length > 0) {
        const { error: insErr } = await supabase.from("planejamentos_pendentes").insert(
          lista.map((p) => ({
            elevatoria_id: p.id,
            nome: p.nome,
            planta: p.planta,
            lat: p.lat,
            lon: p.lon,
            autor_id: user?.id ?? null,
            autor_nome: profile?.nome_completo ?? null,
          })),
        );
        if (insErr) throw insErr;
      }
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
        onClose={() => setOsDialogAlvo(null)}
        onAdd={addOs}
        onUpdate={updateOs}
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

function OsDialog({
  alvo,
  paradas,
  backlogOS,
  onClose,
  onAdd,
  onUpdate,
}: {
  alvo: { idx: number; osIdx: number | null } | null;
  paradas: Parada[];
  backlogOS: BacklogOS[];
  onClose: () => void;
  onAdd: (idx: number, os: OsInfo) => void;
  onUpdate: (idx: number, osIdx: number, patch: Partial<OsInfo>) => void;
}) {
  const [mode, setMode] = useState<"existente" | "nova">("existente");
  const [busca, setBusca] = useState("");
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
        </div>

        {mode === "existente" ? (
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
            disabled={(mode === "existente" && !selecionada) || (mode === "nova" && !nova.tipo)}
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
