import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// vite throws errors if we don't restore marker images manually (build weirdness)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// default center: Kathmandu (where we're launching first)
export const DEFAULT_MAP_CENTER: [number, number] = [27.7172, 85.324];
const DEFAULT_ZOOM = 13;

export type MapLocationResult = {
  address: string;
  latitude: number;
  longitude: number;
};

// in dev, use Vite proxy; in prod, direct to Nominatim (they allow light browser use)
function nominatimBase(): string {
  return import.meta.env.DEV ? "/api-osm" : "https://nominatim.openstreetmap.org";
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `${nominatimBase()}/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Reverse geocode failed: ${res.status}`);
  }
  const data = (await res.json()) as { display_name?: string };
  const name = data.display_name?.trim();
  if (name) return name;
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

type MapClickLayerProps = {
  marker: [number, number] | null;
  setMarker: (pos: [number, number] | null) => void;
  onPick: (result: MapLocationResult) => void;
  setGeocoding: (v: boolean) => void;
};

function MapClickLayer({
  marker,
  setMarker,
  onPick,
  setGeocoding,
}: MapClickLayerProps) {
  useMapEvents({
    click: async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setMarker([lat, lng]);
      setGeocoding(true);
      try {
        const address = await reverseGeocode(lat, lng);
        onPick({ address, latitude: lat, longitude: lng });
      } catch {
        onPick({
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          latitude: lat,
          longitude: lng,
        });
      } finally {
        setGeocoding(false);
      }
    },
  });

  return marker ? <Marker position={marker} /> : null;
}

export interface MapSelectorProps {
  /** Starting pin (e.g. from form). Null = no marker until user clicks. */
  initialLatLng: [number, number] | null;
  /** Called after each map click (reverse geocode finished). */
  onPick: (result: MapLocationResult) => void;
  className?: string;
}

/**
 * Click-to-place a marker on the map, then reverse-geocode to get the address.
 * No API keys needed — uses free OpenStreetMap tiles + Nominatim.
 */
export default function MapSelector({
  initialLatLng,
  onPick,
  className = "",
}: MapSelectorProps) {
  const [marker, setMarker] = useState<[number, number] | null>(initialLatLng);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    setMarker(initialLatLng);
  }, [initialLatLng]);

  const center = marker ?? initialLatLng ?? DEFAULT_MAP_CENTER;

  const handlePick = useCallback(
    (result: MapLocationResult) => {
      onPick(result);
    },
    [onPick]
  );

  return (
    <div className={`relative rounded-xl overflow-hidden border border-gray-200 ${className}`}>
      {geocoding && (
        <div className="absolute inset-0 z-[1000] bg-white/60 flex items-center justify-center text-sm text-gray-700 pointer-events-none">
          Resolving address…
        </div>
      )}
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        className="h-[min(420px,55vh)] w-full z-0 [&_.leaflet-container]:font-sans"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickLayer
          marker={marker}
          setMarker={setMarker}
          onPick={handlePick}
          setGeocoding={setGeocoding}
        />
      </MapContainer>
    </div>
  );
}
