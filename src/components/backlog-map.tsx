import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

export type BacklogMarker = {
  planta: string;
  lat: number;
  lon: number;
  count: number;
  late: number;
  emerg: number;
};

export type RouteStop = {
  planta: string;
  lat: number;
  lon: number;
  ordem: number;
  osCount: number;
};

export type RouteStart = { lat: number; lon: number; label: string };

function FitBoundsController({
  markers,
  route,
  fitSignal,
}: {
  markers: BacklogMarker[];
  route?: { start?: RouteStart; stops: RouteStop[] } | null;
  fitSignal: number;
}) {
  const map = useMap();
  useEffect(() => {
    const pts: Array<[number, number]> = [];
    if (route?.stops?.length) {
      if (route.start) pts.push([route.start.lat, route.start.lon]);
      for (const s of route.stops) pts.push([s.lat, s.lon]);
    } else if (markers.length) {
      for (const m of markers) pts.push([m.lat, m.lon]);
    }
    if (!pts.length) return;
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal, route]);
  return null;
}

function numberedIcon(n: number) {
  return L.divIcon({
    className: "backlog-route-pin",
    html: `<div style="background:#0b3a73;color:#fff;border:2px solid #fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.35)">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function startIcon() {
  return L.divIcon({
    className: "backlog-route-start",
    html: `<div style="background:#f59e0b;color:#000;border:2px solid #fff;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.35)">🏁</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function BacklogMap({
  markers,
  onSelect,
  selectedPlanta,
  fitSignal = 0,
  route,
}: {
  markers: BacklogMarker[];
  onSelect: (planta: string) => void;
  selectedPlanta?: string | null;
  fitSignal?: number;
  route?: { start?: RouteStart; stops: RouteStop[] } | null;
}) {
  const { minC, maxC } = useMemo(() => {
    if (!markers.length) return { minC: 1, maxC: 1 };
    let mn = Infinity,
      mx = -Infinity;
    for (const m of markers) {
      if (m.count < mn) mn = m.count;
      if (m.count > mx) mx = m.count;
    }
    return { minC: mn, maxC: mx };
  }, [markers]);

  const radiusFor = (count: number) => {
    const MIN = 6,
      MAX = 20;
    if (maxC <= minC) return MIN + (MAX - MIN) / 2;
    const norm = (Math.sqrt(count) - Math.sqrt(minC)) / (Math.sqrt(maxC) - Math.sqrt(minC));
    return MIN + norm * (MAX - MIN);
  };

  const routePlantas = useMemo(() => new Set((route?.stops || []).map((s) => s.planta)), [route]);

  const polylinePts: Array<[number, number]> = useMemo(() => {
    if (!route?.stops?.length) return [];
    const pts: Array<[number, number]> = [];
    if (route.start) pts.push([route.start.lat, route.start.lon]);
    for (const s of route.stops) pts.push([s.lat, s.lon]);
    return pts;
  }, [route]);

  return (
    <MapContainer
      center={[-22.85, -43.5]}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBoundsController markers={markers} route={route} fitSignal={fitSignal} />

      {markers.map((m) => {
        if (routePlantas.has(m.planta)) return null;
        const isEmerg = m.emerg > 0;
        const isSelected = selectedPlanta === m.planta;
        const stroke = isEmerg ? "#7f1d1d" : "#0b3a73";
        const fill = isEmerg ? "#ef4444" : "#1f7ad6";
        return (
          <CircleMarker
            key={m.planta}
            center={[m.lat, m.lon]}
            radius={radiusFor(m.count)}
            pathOptions={{
              color: isSelected ? "#0b3a73" : stroke,
              fillColor: fill,
              fillOpacity: isSelected ? 0.95 : 0.75,
              weight: isSelected ? 4 : 2,
            }}
            eventHandlers={{ click: () => onSelect(m.planta) }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-[#0b3a73]">{m.planta}</div>
                <div>O.S.: {m.count}</div>
                <div>Atrasadas: {m.late}</div>
                {isEmerg && <div className="text-red-600">Emergenciais: {m.emerg}</div>}
                <button
                  className="mt-1 text-[#1f7ad6] underline"
                  onClick={() => onSelect(m.planta)}
                >
                  {isSelected ? "Limpar filtro" : "Filtrar por essa planta"}
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {polylinePts.length >= 2 && (
        <Polyline
          positions={polylinePts}
          pathOptions={{ color: "#0b3a73", weight: 4, opacity: 0.8, dashArray: "6 6" }}
        />
      )}

      {route?.start && (
        <Marker position={[route.start.lat, route.start.lon]} icon={startIcon()}>
          <Popup>
            <div className="text-xs">
              <div className="font-semibold text-[#0b3a73]">Ponto de partida</div>
              <div>{route.start.label}</div>
            </div>
          </Popup>
        </Marker>
      )}

      {(route?.stops || []).map((s) => (
        <Marker key={`stop-${s.ordem}`} position={[s.lat, s.lon]} icon={numberedIcon(s.ordem)}>
          <Popup>
            <div className="text-xs">
              <div className="font-semibold text-[#0b3a73]">Parada #{s.ordem}</div>
              <div>{s.planta}</div>
              <div>{s.osCount} O.S.</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
