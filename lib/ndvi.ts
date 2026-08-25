import { getCached, setCache, CACHE_TTL } from './cache.js';
import type { Feature, Polygon } from 'geojson';

export interface NdviStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  num: number;
  date: number; // unix timestamp
}

export interface NdviResponse {
  current: NdviStats | null;
  history: NdviStats[];
  polygonId: string | null;
  captureDate: string;
  error?: string;
}

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0';

function toIsoDate(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

// Helper to normalize coordinates to [lon, lat] and ensure closed rings
function normalizeGeometry(geometry: Polygon): Polygon {
  if (!geometry || !geometry.coordinates || !geometry.coordinates.length) {
    return geometry;
  }

  const rings = geometry.coordinates.map((ring) => {
    // Force coordinates into explicit [longitude, latitude] pairs.
    // If your frontend map outputs [lat, lon], we explicitly flip index 0 and 1:
    let normalizedRing = ring.map((coord) => {
      // Assuming coord input is [lat, lon] from map drawing tools:
      const lat = coord[0];
      const lon = coord[1];
      return [lon, lat]; // GeoJSON standard: [lon, lat]
    });

    // Ensure closing vertex (first point === last point)
    const firstPt = normalizedRing[0];
    const lastPt = normalizedRing[normalizedRing.length - 1];
    if (firstPt[0] !== lastPt[0] || firstPt[1] !== lastPt[1]) {
      normalizedRing.push([firstPt[0], firstPt[1]]);
    }

    return normalizedRing;
  });

  return {
    type: 'Polygon',
    coordinates: rings,
  };
}

async function upsertPolygon(
  boundary: Feature<Polygon>,
  lat: number,
  lon: number,
  apiKey: string,
): Promise<string> {
  const name = `senseorbit_${lat.toFixed(4)}_${lon.toFixed(4)}`;

  const listRes = await fetch(`${AGRO_BASE}/polygons?appid=${apiKey}`);
  if (listRes.ok) {
    const polygons: Array<{ id: string; name: string }> = await listRes.json();
    const existing = polygons.find((p) => p.name === name);
    if (existing) return existing.id;
  }

  const normalizedGeo = normalizeGeometry(boundary.geometry);

  const createRes = await fetch(`${AGRO_BASE}/polygons?appid=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      geo_json: {
        type: 'Feature',
        properties: {},
        geometry: normalizedGeo,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Agromonitoring polygon creation failed: ${err.message ?? createRes.status}`);
  }

  const created: { id: string } = await createRes.json();
  return created.id;
}

export async function fetchNdvi(
  lat: number,
  lon: number,
  boundary: Feature<Polygon>,
  apiKey: string,
): Promise<NdviResponse> {
  const cacheKey = `ndvi:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached<NdviResponse>(cacheKey);
  if (cached) return cached;

  const now = Math.floor(Date.now() / 1000);
  const start = now - 60 * 24 * 60 * 60;

  let polygonId: string | null = null;

  try {
    polygonId = await upsertPolygon(boundary, lat, lon, apiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { current: null, history: [], polygonId: null, captureDate: toIsoDate(now), error: msg };
  }

  const statsUrl =
    `${AGRO_BASE}/ndvi/statistics?polyid=${polygonId}&appid=${apiKey}` +
    `&datestart=${start}&dateend=${now}`;

  const statsRes = await fetch(statsUrl);
  if (!statsRes.ok) {
    const err = await statsRes.json().catch(() => ({}));
    return {
      current: null,
      history: [],
      polygonId,
      captureDate: toIsoDate(now),
      error: `NDVI stats error: ${err.message ?? statsRes.status}`,
    };
  }

  const raw: Array<{
    dt: number;
    data: { mean: number; std: number; min: number; max: number; median: number; p25: number; p75: number; num: number };
  }> = await statsRes.json();

  const history: NdviStats[] = raw
    .filter((r) => r.data && typeof r.data.mean === 'number')
    .map((r) => ({
      mean: Math.round(r.data.mean * 1000) / 1000,
      std: Math.round(r.data.std * 1000) / 1000,
      min: Math.round(r.data.min * 1000) / 1000,
      max: Math.round(r.data.max * 1000) / 1000,
      median: Math.round(r.data.median * 1000) / 1000,
      p25: Math.round((r.data.p25 ?? r.data.min) * 1000) / 1000,
      p75: Math.round((r.data.p75 ?? r.data.max) * 1000) / 1000,
      num: r.data.num ?? 0,
      date: r.dt,
    }));

  const current = history.length > 0 ? history[history.length - 1] : null;
  const captureDate = current ? toIsoDate(current.date) : toIsoDate(now);

  const result: NdviResponse = { current, history, polygonId, captureDate };
  setCache(cacheKey, result, CACHE_TTL.satellite);
  return result;
}