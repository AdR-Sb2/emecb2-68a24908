import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

type Marker = {
  planta: string;
  lat: number;
  lon: number;
  count: number;
  late: number;
};

export default function BacklogMap({
  markers,
  onSelect,
}: {
  markers: Marker[];
  onSelect: (planta: string) => void;
}) {
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
      {markers.map((m) => (
        <CircleMarker
          key={m.planta}
          center={[m.lat, m.lon]}
          radius={6 + Math.min(10, m.count)}
          pathOptions={{
            color: m.late > 0 ? "#dc2626" : "#0b3a73",
            fillColor: m.late > 0 ? "#ef4444" : "#1f7ad6",
            fillOpacity: 0.75,
            weight: 2,
          }}
          eventHandlers={{ click: () => onSelect(m.planta) }}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-semibold text-[#0b3a73]">{m.planta}</div>
              <div>O.S.: {m.count}</div>
              <div>Atrasadas: {m.late}</div>
              <button
                className="mt-1 text-[#1f7ad6] underline"
                onClick={() => onSelect(m.planta)}
              >
                Filtrar por essa planta
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}