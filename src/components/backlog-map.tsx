import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

export type BacklogMarker = {
  planta: string;
  lat: number;
  lon: number;
  count: number;
  late: number;
  emerg: number;
};

function FitBoundsController({
  markers,
  fitSignal,
}: {
  markers: BacklogMarker[];
  fitSignal: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!markers.length) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);
  return null;
}

export default function BacklogMap({
  markers,
  onSelect,
  selectedPlanta,
  fitSignal = 0,
}: {
  markers: BacklogMarker[];
  onSelect: (planta: string) => void;
  selectedPlanta?: string | null;
  fitSignal?: number;
}) {
  const { minC, maxC } = useMemo(() => {
    if (!markers.length) return { minC: 1, maxC: 1 };
    let mn = Infinity, mx = -Infinity;
    for (const m of markers) { if (m.count < mn) mn = m.count; if (m.count > mx) mx = m.count; }
    return { minC: mn, maxC: mx };
  }, [markers]);

  const radiusFor = (count: number) => {
    const MIN = 6, MAX = 20;
    if (maxC <= minC) return MIN + (MAX - MIN) / 2;
    // Scale by sqrt to avoid disproportionate blobs.
    const norm = (Math.sqrt(count) - Math.sqrt(minC)) / (Math.sqrt(maxC) - Math.sqrt(minC));
    return MIN + norm * (MAX - MIN);
  };

  return (
    <MapContainer
      center={[-22.85, -43.5]}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBoundsController markers={markers} fitSignal={fitSignal} />
      {markers.map((m) => {
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
    </MapContainer>
  );
}