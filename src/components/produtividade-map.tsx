import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, MapPin } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

type FieldAtividade = {
  id: number;
  dia_id: number;
  id_recurso: number;
  id_atividade: number;
  ordem_manutencao: number;
  status: string;
  tipo_atividade: string;
  prioridade: string;
  area_trabalho: string;
  texto_breve: string;
  centro_trabalho: string;
  criticidade: string;
  parada: boolean;
  inicio: string | null;
  fim: string | null;
  motivo_paralisacao: string;
  planta: string;
  cidade: string;
};

type PlantaCoord = {
  planta: string;
  nome: string;
  lat: number;
  lon: number;
};

type FieldEquipe = {
  id: number;
  dia_id: number;
  nome_equipe: string;
  tecnicos: number[];
};

// ─── Constants ────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  concluido: "#22c55e",
  suspenso: "#eab308",
  cancelado: "#ef4444",
};

const EQUIPE_PIN_COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
];

const STATUS_LABELS: Record<string, string> = {
  concluido: "Concluída",
  suspenso: "Suspensa",
  cancelado: "Cancelada",
};

function normalizeStatus(s: string): string {
  const lower = (s || "").toLowerCase().trim();
  if (lower === "concluído" || lower === "concluido") return "concluido";
  if (lower === "suspenso" || lower === "pendente") return "suspenso";
  if (lower === "cancelado") return "cancelado";
  return lower;
}

function isAtividadeAdministrativa(tipo: string | null | undefined): boolean {
  if (!tipo) return false;
  const t = tipo.toUpperCase().trim();
  return [
    "DDS",
    "ALMOÇO",
    "ALMOCO",
    "RETORNO PARA BASE",
    "MONTAR EQUIPE",
    "SEPARAR MATERIAL / FERRAMENTA",
    "SEPARAR MATERIAL / FERRAMENTAS",
    "FEEDBACK",
    "PROBLEMAS COM VEÍCULO",
    "PROBLEMAS COM VEICULO",
  ].includes(t);
}

// ─── Fit Bounds ───────────────────────────────────────────────

function FitBoundsController({
  points,
  fitSignal,
}: {
  points: Array<[number, number]>;
  fitSignal: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
  }, [fitSignal, points, map]);
  return null;
}

// ─── Pin Icon Factory ─────────────────────────────────────────

function createPinIcon(statusColor: string, equipeColor: string) {
  return L.divIcon({
    className: "produtividade-pin",
    html: `
      <div style="position:relative;width:28px;height:28px;">
        <div style="
          width:28px;height:28px;border-radius:50%;
          background:${statusColor};
          border:3px solid ${equipeColor};
          box-shadow:0 1px 4px rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// ─── Multiselect Dropdown ─────────────────────────────────────

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  colors,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  colors?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        <Filter className="h-3 w-3" />
        {label}
        {selected.length > 0 && (
          <span className="ml-1 rounded bg-[#1f7ad6] px-1 text-[9px] text-white">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => onToggle(opt)} />
              {colors && colors[opt] && (
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[opt] }} />
              )}
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function ProdutividadeMap({
  atividades,
  plantaMap,
  equipes,
  recursosMap,
  filtroEquipes,
  setFiltroEquipes,
  filtroStatus,
  setFiltroStatus,
  filtroTipo,
  setFiltroTipo,
}: {
  atividades: FieldAtividade[];
  plantaMap: Map<string, PlantaCoord>;
  equipes: FieldEquipe[];
  recursosMap: Map<number, string>;
  filtroEquipes: string[];
  setFiltroEquipes: (v: string[]) => void;
  filtroStatus: string[];
  setFiltroStatus: (v: string[]) => void;
  filtroTipo: string[];
  setFiltroTipo: (v: string[]) => void;
}) {
  const [fitSignal, setFitSignal] = useState(0);
  const [debugInfo, setDebugInfo] = useState({ tentadas: 0, comPlanta: 0, semPlanta: 0 });

  // Build resource → team map
  const resourceToEquipe = useMemo(() => {
    const m = new Map<number, { nome: string; idx: number }>();
    equipes.forEach((eq, idx) => {
      for (const r of eq.tecnicos) m.set(r, { nome: eq.nome_equipe, idx });
    });
    return m;
  }, [equipes]);

  // Unique filter options
  const statusOptions = useMemo(() => {
    const s = new Set(atividades.map((a) => normalizeStatus(a.status)));
    return [...s].filter(Boolean).sort();
  }, [atividades]);

  const tipoOptions = useMemo(() => {
    const s = new Set(atividades.map((a) => a.tipo_atividade).filter(Boolean));
    return [...s].sort();
  }, [atividades]);

  const equipeOptions = useMemo(() => equipes.map((e) => e.nome_equipe), [equipes]);

  const equipeColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    equipes.forEach((eq, i) => {
      m[eq.nome_equipe] = EQUIPE_PIN_COLORS[i % EQUIPE_PIN_COLORS.length];
    });
    return m;
  }, [equipes]);

  const statusColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(STATUS_COLORS)) m[k] = v;
    return m;
  }, []);

  // Filter and map to pins
  const pins = useMemo(() => {
    const result: Array<{
      key: string;
      lat: number;
      lon: number;
      status: string;
      equipe: string;
      at: FieldAtividade;
    }> = [];

    let tentadas = 0;
    let comPlanta = 0;
    let semPlanta = 0;

    for (const at of atividades) {
      if (isAtividadeAdministrativa(at.tipo_atividade)) continue;
      if (!at.planta) continue;
      tentadas++;

      const normalizedPlanta = at.planta.trim().toUpperCase();
      const coord = plantaMap.get(normalizedPlanta);
      if (!coord) {
        semPlanta++;
        continue;
      }
      comPlanta++;

      const normSt = normalizeStatus(at.status);
      const eqInfo = resourceToEquipe.get(at.id_recurso);
      const eqNome = eqInfo?.nome || "Sem equipe";

      // Apply filters
      if (filtroEquipes.length > 0 && !filtroEquipes.includes(eqNome)) continue;
      if (filtroStatus.length > 0 && !filtroStatus.includes(normSt)) continue;
      if (filtroTipo.length > 0 && !filtroTipo.includes(at.tipo_atividade)) continue;

      result.push({
        key: `${at.id}`,
        lat: coord.lat,
        lon: coord.lon,
        status: normSt,
        equipe: eqNome,
        at,
      });
    }

    setDebugInfo({ tentadas, comPlanta, semPlanta });

    return result;
  }, [atividades, plantaMap, resourceToEquipe, filtroEquipes, filtroStatus, filtroTipo]);

  const points: Array<[number, number]> = useMemo(() => pins.map((p) => [p.lat, p.lon]), [pins]);

  const toggleFilter = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-700">
        <span className="text-[11px] font-semibold text-slate-500">
          <MapPin className="mr-1 inline h-3.5 w-3.5" />
          Mapa ({pins.length} OS)
        </span>
        <MultiSelectDropdown
          label="Equipe"
          options={equipeOptions}
          selected={filtroEquipes}
          onToggle={(v) => toggleFilter(filtroEquipes, setFiltroEquipes, v)}
          colors={equipeColorMap}
        />
        <MultiSelectDropdown
          label="Status"
          options={statusOptions}
          selected={filtroStatus}
          onToggle={(v) => toggleFilter(filtroStatus, setFiltroStatus, v)}
          colors={statusColorMap}
        />
        <MultiSelectDropdown
          label="Tipo"
          options={tipoOptions}
          selected={filtroTipo}
          onToggle={(v) => toggleFilter(filtroTipo, setFiltroTipo, v)}
        />
        {(filtroEquipes.length > 0 || filtroStatus.length > 0 || filtroTipo.length > 0) && (
          <button
            onClick={() => {
              setFiltroEquipes([]);
              setFiltroStatus([]);
              setFiltroTipo([]);
            }}
            className="text-[10px] text-red-500 hover:text-red-700"
          >
            Limpar filtros
          </button>
        )}
        <button
          onClick={() => setFitSignal((n) => n + 1)}
          className="ml-auto text-[10px] text-[#1f7ad6] hover:underline"
        >
          Centralizar
        </button>
      </div>

      {/* Map */}
      <div className="h-[400px] w-full">
        <MapContainer center={[-22.85, -43.5]} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBoundsController points={points} fitSignal={fitSignal} />
          {pins.map((pin) => {
            const sColor = STATUS_COLORS[pin.status] || "#94a3b8";
            const eColor = equipeColorMap[pin.equipe] || "#64748b";
            const icon = createPinIcon(sColor, eColor);
            return (
              <Marker key={pin.key} position={[pin.lat, pin.lon]} icon={icon}>
                <Popup>
                  <div className="min-w-[180px] space-y-1 text-[12px]">
                    <div className="font-bold text-[#0b3a73]">{pin.at.planta}</div>
                    <div className="text-slate-600">{pin.at.texto_breve || "—"}</div>
                    <div>
                      <strong>Tipo:</strong> {pin.at.tipo_atividade || "—"}
                    </div>
                    <div>
                      <strong>Equipe:</strong> {pin.equipe}
                    </div>
                    <div>
                      <strong>Técnico:</strong>{" "}
                      {recursosMap.get(pin.at.id_recurso) || pin.at.id_recurso}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span style={{ color: sColor, fontWeight: 600 }}>
                        {STATUS_LABELS[pin.status] || pin.status}
                      </span>
                    </div>
                    <div>
                      <strong>Horário:</strong> {pin.at.inicio || "—"} ~ {pin.at.fim || "—"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-3 py-2 text-[10px] dark:border-slate-700">
        <span className="font-semibold text-slate-500">Legenda:</span>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full border-2 border-white"
              style={{ background: STATUS_COLORS[k], boxShadow: "0 0 0 1px rgba(0,0,0,.1)" }}
            />
            {v}
          </span>
        ))}
        <span className="ml-2 text-slate-400">| Borda = equipe</span>
      </div>

      {/* Debug log temporário — remover após confirmar mapa */}
      <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400 dark:border-slate-700">
        <strong>DEBUG Mapa:</strong> {debugInfo.tentadas} OS tentadas ·{" "}
        <span className="text-emerald-600">{debugInfo.comPlanta} plotadas</span> ·{" "}
        <span className="text-red-500">{debugInfo.semPlanta} sem planta</span>
        {debugInfo.semPlanta > 0 && (
          <span className="ml-2 text-amber-600">
            (verifique se PLANTA no CSV confere com o campo "planta" na tabela elevatorias)
          </span>
        )}
      </div>
    </div>
  );
}
