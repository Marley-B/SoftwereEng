import { placeRefSchema, type PlaceRef } from '@route-helper/shared';
import type { FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../hooks/requireAuth.js';

const PLACES_AUTOCOMPLETE_NEW_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACES_LEGACY_AUTOCOMPLETE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACES_LEGACY_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

/** Field mask for Autocomplete (New). */
const PLACES_AUTOCOMPLETE_FIELD_MASK = '*';

interface ClientSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface TextField {
  text?: string;
}

interface StructuredFormat {
  mainText?: TextField;
  secondaryText?: TextField;
}

interface PlacePrediction {
  placeId?: string;
  text?: TextField;
  structuredFormat?: StructuredFormat;
}

interface AutocompleteSuggestion {
  placePrediction?: PlacePrediction;
}

interface AutocompleteNewResponse {
  suggestions?: AutocompleteSuggestion[];
}

interface GoogleRpcError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface PlaceLocation {
  latitude?: number;
  longitude?: number;
}

interface PlaceDetailsNewResponse {
  id?: string;
  formattedAddress?: string;
  location?: PlaceLocation;
}

interface LegacyAutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

interface LegacyAutocompleteJson {
  predictions?: LegacyAutocompletePrediction[];
  status: string;
  error_message?: string;
}

interface LegacyDetailsJson {
  result?: {
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    place_id?: string;
  };
  status: string;
  error_message?: string;
}

function detailsNewUrl(placeId: string): string {
  return `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
}

function newAutocompleteFailed(res: Response, raw: GoogleRpcError): boolean {
  if (!res.ok) {
    return true;
  }
  const e = raw.error;
  if (!e) {
    return false;
  }
  const msg = (e.message ?? '').toLowerCase();
  if (msg.includes('blocked')) {
    return true;
  }
  if (e.status === 'PERMISSION_DENIED' || e.status === 'FAILED_PRECONDITION') {
    return true;
  }
  if (e.code === 7 || e.code === 9) {
    // PERMISSION_DENIED, FAILED_PRECONDITION
    return true;
  }
  return false;
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

async function autocompleteNew(
  input: string,
  sessionToken: string,
  apiKey: string,
): Promise<{ ok: true; suggestions: ClientSuggestion[] } | { ok: false }> {
  const body: { input: string; sessionToken?: string } = { input };
  if (sessionToken.length > 0) {
    body.sessionToken = sessionToken;
  }

  const res = await fetch(PLACES_AUTOCOMPLETE_NEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_AUTOCOMPLETE_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const raw = parseJsonSafe(text) as AutocompleteNewResponse & GoogleRpcError;

  if (newAutocompleteFailed(res, raw)) {
    return { ok: false };
  }

  const list = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  const suggestions = list
    .map((row) => row.placePrediction)
    .filter((p): p is PlacePrediction => p !== undefined && typeof p.placeId === 'string')
    .map((p) => {
      const placeId = p.placeId as string;
      const full = p.text?.text?.trim() ?? '';
      const main = p.structuredFormat?.mainText?.text?.trim() ?? full;
      const secondary = p.structuredFormat?.secondaryText?.text?.trim() ?? '';
      return {
        placeId,
        description: full || main,
        mainText: main || full,
        secondaryText: secondary,
      };
    });

  return { ok: true, suggestions };
}

async function autocompleteLegacy(
  input: string,
  sessionToken: string,
  apiKey: string,
): Promise<{ ok: true; suggestions: ClientSuggestion[] } | { ok: false; message: string }> {
  const url = new URL(PLACES_LEGACY_AUTOCOMPLETE);
  url.searchParams.set('input', input);
  url.searchParams.set('key', apiKey);
  if (sessionToken.length > 0) {
    url.searchParams.set('sessiontoken', sessionToken);
  }

  const res = await fetch(url);
  const raw = parseJsonSafe(await res.text()) as LegacyAutocompleteJson;

  if (!res.ok || raw.status === 'REQUEST_DENIED') {
    return {
      ok: false,
      message: raw.error_message ?? 'Legacy Places autocomplete failed',
    };
  }

  if (raw.status !== 'OK' && raw.status !== 'ZERO_RESULTS') {
    return {
      ok: false,
      message: raw.error_message ?? `Legacy Places status: ${raw.status}`,
    };
  }

  const list = Array.isArray(raw.predictions) ? raw.predictions : [];
  const suggestions = list.map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));

  return { ok: true, suggestions };
}

async function detailsNew(
  placeId: string,
  sessionToken: string,
  apiKey: string,
): Promise<{ ok: true; place: PlaceRef } | { ok: false }> {
  const url = new URL(detailsNewUrl(placeId));
  if (sessionToken.length > 0) {
    url.searchParams.set('sessionToken', sessionToken);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,formattedAddress,location',
    },
  });

  const raw = parseJsonSafe(await res.text()) as PlaceDetailsNewResponse & GoogleRpcError;

  if (newAutocompleteFailed(res, raw)) {
    return { ok: false };
  }

  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  const resolvedId = raw.id ?? placeId;
  const address = (raw.formattedAddress ?? '').trim();

  if (lat === undefined || lng === undefined || !address) {
    return { ok: false };
  }

  const place = placeRefSchema.parse({
    address,
    lat,
    lng,
    placeId: resolvedId,
  });

  return { ok: true, place };
}

async function detailsLegacy(
  placeId: string,
  sessionToken: string,
  apiKey: string,
): Promise<{ ok: true; place: PlaceRef } | { ok: false; message: string }> {
  const url = new URL(PLACES_LEGACY_DETAILS);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,formatted_address,geometry/location');
  url.searchParams.set('key', apiKey);
  if (sessionToken.length > 0) {
    url.searchParams.set('sessiontoken', sessionToken);
  }

  const res = await fetch(url);
  const raw = parseJsonSafe(await res.text()) as LegacyDetailsJson;

  if (!res.ok || raw.status === 'REQUEST_DENIED' || raw.status === 'NOT_FOUND') {
    return {
      ok: false,
      message: raw.error_message ?? 'Legacy Place details failed',
    };
  }

  if (raw.status !== 'OK' || !raw.result) {
    return {
      ok: false,
      message: raw.error_message ?? `Legacy Places status: ${raw.status}`,
    };
  }

  const r = raw.result;
  const lat = r.geometry?.location?.lat;
  const lng = r.geometry?.location?.lng;
  const resolvedId = r.place_id ?? placeId;
  const address = (r.formatted_address ?? '').trim();

  if (lat === undefined || lng === undefined || !address) {
    return { ok: false, message: 'Incomplete legacy place result' };
  }

  const place = placeRefSchema.parse({
    address,
    lat,
    lng,
    placeId: resolvedId,
  });

  return { ok: true, place };
}

export const registerPlacesRoutes: FastifyPluginAsync = async (app) => {
  const requireAuth = createRequireAuth(app.config.jwtSecret);
  const apiKey = app.config.googleRoutesApiKey;

  app.get('/autocomplete', { preHandler: requireAuth }, async (request, reply) => {
    const q = request.query as { input?: string; sessionToken?: string };
    const input = String(q.input ?? '').trim();
    if (input.length < 2) {
      return { suggestions: [] as ClientSuggestion[] };
    }
    const sessionToken = String(q.sessionToken ?? '').trim();

    const primary = await autocompleteNew(input, sessionToken, apiKey);
    if (primary.ok) {
      return { suggestions: primary.suggestions };
    }

    request.log.info('Places autocomplete: falling back to legacy endpoint (New API unavailable)');
    const legacy = await autocompleteLegacy(input, sessionToken, apiKey);
    if (!legacy.ok) {
      request.log.warn({ err: legacy.message }, 'Places autocomplete legacy failed');
      return reply.status(502).send({ error: legacy.message, suggestions: [] });
    }
    return { suggestions: legacy.suggestions };
  });

  app.get('/details', { preHandler: requireAuth }, async (request, reply) => {
    const q = request.query as { placeId?: string; sessionToken?: string };
    const placeId = String(q.placeId ?? '').trim();
    if (!placeId) {
      return reply.status(400).send({ error: 'placeId is required' });
    }
    const sessionToken = String(q.sessionToken ?? '').trim();

    const primary = await detailsNew(placeId, sessionToken, apiKey);
    if (primary.ok) {
      return { place: primary.place };
    }

    request.log.info('Place details: falling back to legacy endpoint (New API unavailable)');
    const legacy = await detailsLegacy(placeId, sessionToken, apiKey);
    if (!legacy.ok) {
      request.log.warn({ err: legacy.message }, 'Place details legacy failed');
      return reply.status(502).send({ error: legacy.message });
    }
    return { place: legacy.place };
  });
};
