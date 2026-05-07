/**
 * Photon (Komoot) — OpenStreetMap-backed global search; works on mobile & web (CORS-friendly).
 * Supported `lang` values: default, de, en, fr (`es` is rejected by the API).
 * Spanish-speaking devices use `default` so OSM returns local names where available.
 */

/** Photon `/api/` `lang` query parameter (server-validated). */
export type PhotonLang = "default" | "de" | "en" | "fr";

/**
 * Pick Photon `lang` from ICU/browser locale (no expo-localization — avoids Metro resolution issues).
 * Spanish locales use `default` for stronger ES/OSM naming.
 */
export function resolvePhotonLangFromEnvironment(): PhotonLang {
  let tag = "";
  try {
    tag = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
  } catch {
    tag = "";
  }
  if (
    !tag &&
    typeof navigator !== "undefined" &&
    typeof navigator.language === "string"
  ) {
    tag = navigator.language;
  }
  const normalized = (tag || "en").toLowerCase();
  return normalized.startsWith("es") ? "default" : "en";
}

export interface PhotonProperties {
  city?: string;
  country?: string;
  district?: string;
  housenumber?: string;
  name?: string;
  osm_value?: string;
  postcode?: string;
  state?: string;
  street?: string;
  town?: string;
  village?: string;
}

export interface PhotonFeature {
  geometry: {
    coordinates: [number, number];
    type: "Point";
  };
  properties: PhotonProperties;
  type: "Feature";
}

interface PhotonResponse {
  features: PhotonFeature[];
  type: "FeatureCollection";
}

/** Human-readable label for pickers and route storage. */
export function labelFromPhotonFeature(feature: PhotonFeature): string {
  const p = feature.properties;
  const locality =
    p.city ?? p.town ?? p.village ?? p.district ?? p.state ?? undefined;
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ").trim();
  const primary = p.name ?? line1 ?? locality ?? p.osm_value;
  const parts = [primary, line1 && primary !== line1 ? line1 : "", locality, p.country]
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i);
  return parts.join(", ") || "Unknown place";
}

export function coordsFromPhotonFeature(
  feature: PhotonFeature,
): { latitude: number; longitude: number } {
  const [lon, lat] = feature.geometry.coordinates;
  return { latitude: lat, longitude: lon };
}

export async function fetchPhotonSuggestions(
  query: string,
  options: { lang: PhotonLang; signal?: AbortSignal },
): Promise<PhotonFeature[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const lang = options.lang;
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12&lang=${lang}`;

  const res = await fetch(url, { signal: options.signal });
  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as PhotonResponse;
  return Array.isArray(data.features) ? data.features : [];
}

/** First suggested coordinate for live map preview while typing. */
export async function geocodeFirstCoordinate(
  query: string,
  options: { lang: PhotonLang; signal?: AbortSignal },
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const list = await fetchPhotonSuggestions(query, options);
    const first = list[0];
    return first ? coordsFromPhotonFeature(first) : null;
  } catch {
    return null;
  }
}
