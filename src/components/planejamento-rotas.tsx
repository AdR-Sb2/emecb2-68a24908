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
  lat: number | null;
  lon: number | null;
  os: OsInfo;
};

type Planejamento = {
  id: number;
  nome: string;
  autor_nome: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  paradas: Parada[];
  pendentes?: Elevatoria[];
};

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

const LS_KEY = "backlog_planejamentos_v1";

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

const isRelationMissing = (err: { message?: string } | null): boolean =>
  !err || /relation .*does not exist|42P01|PGRST205/i.test(err.message || "");

const novaParada = (el: Elevatoria): Parada => ({
  id: uuid(),
  elevatoria_id: el.id,
  elevatoria_nome: el.nome,
  lat: el.lat,
  lon: el.lon,
  os: { origem: "vazio" },
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
            {p.os.om && <div>O.S.: {p.os.om}</div>}
            {p.os.origem === "nova" && (
              <div className="font-semibold text-amber-600">Pendente de criação</div>
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
        eventHandlers={{
          click: () =>
            toast.info(
              `${el.nome} está pendente. Use o botão "Pendentes" para adicioná-la à rota.`,
            ),
        }}
      >
        <Tooltip>
          <span className="font-semibold text-emerald-700">● Pendente</span> · {el.nome}
        </Tooltip>
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
  const [osDialogIdx, setOsDialogIdx] = useState<number | null>(null);
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

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("elevatorias")
        .select("id, nome, planta, latitude, longitude")
        .order("nome", { ascending: true });
      if (!alive) return;
      setElevLoading(false);
      if (error) {
        toast.error("Não deu para carregar as elevatórias do mapa.", {
          description: error.message,
        });
        setElevatorias([]);
        return;
      }
      const list = (data as Array<{ [k: string]: unknown }>)
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
      setElevatorias(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const routeIds = useMemo(() => new Set(paradas.map((p) => p.elevatoria_id)), [paradas]);

  const contarParadas = (p: Planejamento) => (Array.isArray(p.paradas) ? p.paradas : []).length;

  const addElevatoria = (el: Elevatoria) => {
    if (routeIds.has(el.id)) {
      toast.info(`${el.nome} já está na rota.`);
      return;
    }
    setParadas((prev) => [...prev, novaParada(el)]);
    setPendentes((prev) => prev.filter((p) => p.id !== el.id));
  };

  const addPendente = (el: Elevatoria) => {
    if (pendentes.some((p) => p.id === el.id)) return;
    setPendentes((prev) => [...prev, el]);
    toast.success(`${el.nome} marcada como pendente.`);
  };

  const removePendente = (id: number) => setPendentes((prev) => prev.filter((p) => p.id !== id));

  const promoverPendente = (id: number) => {
    const el = pendentes.find((p) => p.id === id);
    if (!el) return;
    setParadas((prev) => {
      if (prev.some((p) => p.elevatoria_id === id)) {
        toast.info(`${el.nome} já está na rota.`);
        return prev;
      }
      return [...prev, novaParada(el)];
    });
    setPendentes((prev) => prev.filter((p) => p.id !== id));
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

  const setParadaOs = (idx: number, patch: Partial<OsInfo>) =>
    setParadas((prev) => prev.map((p, i) => (i === idx ? { ...p, os: { ...p.os, ...patch } } : p)));

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

  const vincularPorTexto = (idx: number, texto: string) => {
    const row = findOS(texto);
    if (!row) {
      setParadaOs(idx, {
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
    setParadaOs(idx, {
      origem: "sistema",
      om: row["Ordem de Manutenção"] || undefined,
      tipo: row["Tipo de Atividade"] || undefined,
      texto_breve: row["TEXTO BREVE"] || undefined,
      planta: row.PLANTA || undefined,
      equipamento: row["DESCRIÇÃO EQUIPAMENTO"] || undefined,
      prioridade: row.PRIORIDADE || undefined,
    });
  };

  const vincularCadastrada = (idx: number, row: BacklogOS) =>
    setParadaOs(idx, {
      origem: "sistema",
      om: row["Ordem de Manutenção"] || undefined,
      tipo: row["Tipo de Atividade"] || undefined,
      texto_breve: row["TEXTO BREVE"] || undefined,
      planta: row.PLANTA || undefined,
      equipamento: row["DESCRIÇÃO EQUIPAMENTO"] || undefined,
      prioridade: row.PRIORIDADE || undefined,
    });

  const vincularNova = (idx: number, nova: Omit<OsInfo, "origem">) =>
    setParadaOs(idx, { ...nova, origem: "nova" });

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

  const abrirBiblioteca = async () => {
    setCarregandoBiblioteca(true);
    setBibliotecaOpen(true);
    let row = await supabase
      .from("planejamentos")
      .select("id, nome, autor_nome, criado_em, atualizado_em, paradas, pendentes")
      .order("atualizado_em", { ascending: false });
    if (row.error && /pendentes/i.test(row.error.message)) {
      row = (await supabase
        .from("planejamentos")
        .select("id, nome, autor_nome, criado_em, atualizado_em, paradas")
        .order("atualizado_em", { ascending: false })) as typeof row;
    }
    const { data, error } = row;
    if (error && !isRelationMissing(error)) {
      toast.error("Não foi possível carregar a biblioteca.", {
        description: error.message,
      });
      setBiblioteca(lerLocais());
      setCarregandoBiblioteca(false);
      return;
    }
    if (!isRelationMissing(error)) {
      setBiblioteca(
        (data ?? []).map((p) => ({
          ...(p as unknown as Planejamento),
          paradas: Array.isArray((p as unknown as Planejamento).paradas)
            ? (p as unknown as Planejamento).paradas
            : [],
          pendentes: Array.isArray((p as { pendentes?: unknown }).pendentes)
            ? ((p as { pendentes?: unknown }).pendentes as Elevatoria[])
            : [],
        })),
      );
    } else {
      setBiblioteca(lerLocais());
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
      pendentes,
      autor_id: user?.id ?? null,
      autor_nome: profile?.nome_completo ?? null,
      atualizado_em: new Date().toISOString(),
    };
    try {
      let id = planejamentoId;
      if (id != null) {
        const { error } = await supabase.from("planejamentos").update(payload).eq("id", id);
        if (error && !isRelationMissing(error)) throw error;
        if (isRelationMissing(error)) {
          const items = lerLocais().map((p) => (p.id === id ? { ...p, ...payload } : p));
          gravarLocais(items);
        }
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
            pendentes: [...pendentes],
          };
          items.push(novo);
          gravarLocais(items);
          id = novo.id;
        } else {
          id = Number(data?.id);
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
      toast.error("Não foi possível salvar o planejamento.", {
        description: err instanceof Error ? err.message : String(err),
      });
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
    setParadas(
      (Array.isArray(p.paradas) ? p.paradas : []).map((x) => ({
        ...x,
        id: x.id || uuid(),
      })),
    );
    setPendentes(Array.isArray(p.pendentes) ? p.pendentes : []);
    setPlanejamentoId(p.id);
    setPlanejamentoNome(p.nome);
    setBibliotecaOpen(false);
    toast.success(`Planejamento "${p.nome}" carregado.`);
  };

  const duplicar = async (p: Planejamento) => {
    const copia = `Cópia de ${p.nome}`;
    const pendentesDuplicadas = Array.isArray(p.pendentes) ? p.pendentes : [];
    const payload = {
      nome: copia,
      paradas: Array.isArray(p.paradas) ? p.paradas.map((x) => ({ ...x, id: uuid() })) : [],
      pendentes: pendentesDuplicadas,
      autor_id: user?.id ?? null,
      autor_nome: profile?.nome_completo ?? null,
    };
    const { error } = await supabase.from("planejamentos").insert(payload);
    if (error && !isRelationMissing(error)) {
      toast.error("Não foi possível duplicar.", { description: error.message });
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
        pendentes: payload.pendentes,
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
      ws.columns = [
        { header: "#", key: "n", width: 4 },
        { header: "Elevatória", key: "elev", width: 34 },
        { header: "OS", key: "os", width: 14 },
        { header: "Tipo", key: "tipo", width: 26 },
        { header: "Texto Breve", key: "texto", width: 48 },
        { header: "Status", key: "status", width: 16 },
        { header: "Observações", key: "obs", width: 40 },
      ];
      const header = ws.getRow(1);
      header.font = { bold: true };
      header.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B3A73" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      });
      paradas.forEach((p, i) => {
        ws.addRow({
          n: i + 1,
          elev: p.elevatoria_nome,
          os: p.os.origem === "nova" ? "PENDENTE" : p.os.origem === "vazio" ? "" : p.os.om || "",
          tipo: p.os.tipo || "",
          texto: p.os.texto_breve || "",
          status: statusDaOS(p.os).label,
          obs: p.os.observacao || "",
        });
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

  const marcarPendente = (idx: number) => {
    if (paradas[idx]?.os.origem === "nova") {
      setOsDialogIdx(idx);
      return;
    }
    setParadaOs(idx, {
      origem: "nova",
      om: undefined,
      tipo: undefined,
      texto_breve: undefined,
      planta: undefined,
      equipamento: undefined,
      prioridade: undefined,
      observacao: undefined,
    });
    setOsDialogIdx(idx);
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
        <tbody>
          {paradas.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                Nenhuma parada ainda. Clique nas elevatórias no mapa para montar a rota.
              </td>
            </tr>
          )}
          {paradas.map((p, idx) => {
            const st = statusDaOS(p.os);
            return (
              <tr
                key={p.id}
                onClick={() => setOsDialogIdx(idx)}
                className="cursor-pointer border-t border-slate-100 hover:bg-[#eaf3fb]/50 dark:border-slate-700 dark:hover:bg-slate-700/30"
              >
                <td className="px-2 py-1.5 font-bold text-[#0b3a73] dark:text-white">{idx + 1}</td>
                <td className="px-2 py-1.5">
                  <div className="font-medium">{p.elevatoria_nome}</div>
                  <div className="text-[10px] text-slate-400">{p.elevatoria_id}</div>
                </td>
                <td className="px-2 py-1.5">
                  {p.os.origem === "nova" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <FilePlus2 className="h-3 w-3" /> Pendente criação
                    </span>
                  ) : (
                    <input
                      value={p.os.om || ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => vincularPorTexto(idx, e.target.value)}
                      placeholder="Nº da O.S. (ou clique na linha)"
                      className="w-40 rounded border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-slate-700 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1f7ad6] focus:bg-white focus:outline-none dark:text-slate-200 dark:hover:border-slate-600 dark:focus:bg-slate-800"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={
                      TIPOS_OS.includes(p.os.tipo || "") ? p.os.tipo : p.os.tipo ? "Outro" : ""
                    }
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setParadaOs(idx, {
                        tipo: e.target.value === "Outro" ? "Outro" : e.target.value,
                      })
                    }
                    className="w-40 rounded border border-slate-200 bg-white px-1 py-1 text-[12px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">Sem tipo</option>
                    {TIPOS_OS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={p.os.texto_breve || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setParadaOs(idx, { texto_breve: e.target.value })}
                    placeholder="Texto breve"
                    className="w-56 rounded border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-slate-700 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1f7ad6] focus:bg-white focus:outline-none dark:text-slate-200 dark:hover:border-slate-600 dark:focus:bg-slate-800"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <div
                    className="flex items-center justify-end gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => moveParada(idx, -1)}
                      disabled={idx === 0}
                      title="Subir"
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] disabled:opacity-30 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveParada(idx, 1)}
                      disabled={idx === paradas.length - 1}
                      title="Descer"
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0b3a73] disabled:opacity-30 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeParada(idx)}
                      title="Remover"
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
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
        idx={osDialogIdx}
        paradas={paradas}
        backlogOS={backlogOS}
        onClose={() => setOsDialogIdx(null)}
        onVincularCadastrada={vincularCadastrada}
        onVincularNova={vincularNova}
        onMarcarPendente={marcarPendente}
      />

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

function OsDialog({
  idx,
  paradas,
  backlogOS,
  onClose,
  onVincularCadastrada,
  onVincularNova,
  onMarcarPendente,
}: {
  idx: number | null;
  paradas: Parada[];
  backlogOS: BacklogOS[];
  onClose: () => void;
  onVincularCadastrada: (idx: number, row: BacklogOS) => void;
  onVincularNova: (idx: number, nova: Omit<OsInfo, "origem">) => void;
  onMarcarPendente: (idx: number) => void;
}) {
  const [mode, setMode] = useState<"existente" | "nova">("existente");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<BacklogOS | null>(null);
  const [nova, setNova] = useState({
    tipo: "",
    texto_breve: "",
    planta: "",
    equipamento: "",
    prioridade: "",
    observacao: "",
  });

  useEffect(() => {
    if (idx != null) {
      setBusca("");
      setSelecionada(null);
      setNova({
        tipo: "",
        texto_breve: "",
        planta: "",
        equipamento: "",
        prioridade: "",
        observacao: "",
      });
    }
  }, [idx]);

  const parada = idx != null ? paradas[idx] : null;

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
      onVincularCadastrada(idx, selecionada);
      onClose();
      toast.success("O.S. vinculada à parada.");
    } else if (mode === "nova" && nova.tipo) {
      onVincularNova(idx, {
        tipo: nova.tipo,
        texto_breve: nova.texto_breve || undefined,
        planta: nova.planta || undefined,
        equipamento: nova.equipamento || undefined,
        prioridade: nova.prioridade || undefined,
        observacao: nova.observacao || undefined,
      });
      onClose();
      toast.success("O.S. registrada como pendente de criação.");
    } else if (mode === "nova") {
      toast.warning("Informe ao menos o tipo de ordem.");
    }
  };

  return (
    <Dialog open={idx != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#0b3a73] dark:text-white">
            Parada #{idx != null ? idx + 1 : ""}: {parada?.elevatoria_nome || ""}
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
            <FilePlus2 className="mr-1 inline h-3 w-3" /> Nova O.S. (pendente)
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

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setMode("nova");
              onMarcarPendente(idx as number);
            }}
            className="text-[11px] text-amber-600 hover:underline cursor-pointer"
          >
            <FilePlus2 className="mr-1 inline h-3 w-3" /> Marcar como pendente de criação
          </button>
          <div className="flex gap-2">
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
              Confirmar
            </button>
          </div>
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
