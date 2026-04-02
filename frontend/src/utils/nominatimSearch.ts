/**
 * Search Nominatim  for locations in Nepal only.
 * Uses Vite proxy in dev, direct request in prod.
 */

function nominatimBase(): string {
  return import.meta.env.DEV ? "/api-osm" : "https://nominatim.openstreetmap.org";
}

export type NominatimSearchHit = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: Record<string, string | undefined>;
};

/** Exact search URL shape requested: countrycodes=np, addressdetails=1, limit=5 */
export function buildNominatimSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `${nominatimBase()}/search?format=json&q=${q}&countrycodes=np&addressdetails=1&limit=5`;
}

function isNepalDisplayName(r: NominatimSearchHit): boolean {
  return (r.display_name || "").toLowerCase().includes("nepal");
}

const PLACE_KEYS = [
  "city",
  "town",
  "village",
  "municipality",
  "city_district",
  "county",
  "state_district",
  "suburb",
  "neighbourhood",
] as const;

/** Prefer settlements / admin areas over generic country-only or highway-only hits */
function relevanceScore(r: NominatimSearchHit): number {
  let s = 0;
  const addr = r.address || {};
  for (const k of PLACE_KEYS) {
    if (addr[k]) s += 12;
  }
  const dn = (r.display_name || "").toLowerCase();
  if (
    /(municipality|metropolitan|sub-metropolitan|village|district|ward|gaunpalika|nagar)/i.test(
      dn
    )
  ) {
    s += 8;
  }
  if (/(^|,\s)nepal$/i.test((r.display_name || "").trim())) {
    s -= 15;
  }
  if (r.class === "highway" || r.type === "road") s -= 6;
  if (typeof r.importance === "number") s += r.importance;

  return s;
}

export async function fetchNepalAddressSuggestions(
  query: string
): Promise<NominatimSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = buildNominatimSearchUrl(q);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const raw = (await res.json()) as NominatimSearchHit[];
  const nepalOnly = raw.filter(isNepalDisplayName);
  nepalOnly.sort((a, b) => relevanceScore(b) - relevanceScore(a));
  return nepalOnly.slice(0, 5);
}

export const NEPAL_EMPTY_MESSAGE = "No locations found in Nepal";
