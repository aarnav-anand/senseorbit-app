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

// Agromonitoring polygon area constraints (in hectares)
const AGRO_MIN_HA = 1;
const AGRO_MAX_HA = 3000;

function toIsoDate(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

/**
 * Calculates the approximate area of a GeoJSON polygon ring in hectares
 * using the Shoelace formula with degree-to-meter conversion at the given latitude.
 */
function ringAreaHectares(ring: number[][], centerLat: number): number {
  // 1 degree latitude ≈ 111,320 m; 1 degree longitude ≈ 111,320 * cos(lat) m
  const latM = 111320;
  const lonM = 111320 * Math.cos((centerLat * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0] * lonM;
    const y1 = ring[i][1] * latM;
    const x2 = ring[i + 1][0] * lonM;
    const y2 = ring[i + 1][1] * latM;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2) / 10_000; // m² → ha
}

/**
 * Clamps a polygon to a ~100 ha bounding box centred on (lat, lon) when it is
 * outside Agromonitoring's 1–3000 ha window, so we can still fetch NDVI data.
 */
function clampPolygonToAgroLimits(geometry: Polygon, lat: number, lon: number): Polygon {
  const outerRing = geometry.coordinates[0];
  const ha = ringAreaHectares(outerRing, lat);

  if (ha >= AGRO_MIN_HA && ha <= AGRO_MAX_HA) {
    return geometry; // Already within limits — return as-is
  }

  // Target ~100 ha square: side ≈ sqrt(100 * 10000) = 1000 m
  const targetHa = 100;
  const sideM = Math.sqrt(targetHa * 10_000);
  const dLat = sideM / 111320;
  const dLon = sideM / (111320 * Math.cos((lat * Math.PI) / 180));

  const clampedRing: number[][] = [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
    [lon - dLon, lat - dLat], // close the ring
  ];

  return { type: 'Polygon', coordinates: [clampedRing] };
}

// Helper to normalize coordinates to [lon, lat] and ensure closed rings
// Helper to calculate signed area to detect winding order
function getSignedArea(ring: number[][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x2 - x1) * (y2 + y1);
  }
  return area;
}

function normalizeGeometry(geometry: Polygon, refLat: number, refLon: number): Polygon {
  if (!geometry || !geometry.coordinates || !geometry.coordinates.length) {
    return geometry;
  }

  const rings = geometry.coordinates.map((ring) => {
    // 1. Check if first point matches refLat/refLon order to auto-detect swap requirement
    const [p1, p2] = ring[0];
    const distNormal = Math.hypot(p1 - refLon, p2 - refLat); // assumes [lon, lat]
    const distSwapped = Math.hypot(p1 - refLat, p2 - refLon); // assumes [lat, lon]

    let normalizedRing = ring.map((coord) => {
      if (distSwapped < distNormal) {
        return [coord[1], coord[0]]; // Swap [lat, lon] -> [lon, lat]
      }
      return [coord[0], coord[1]]; // Already [lon, lat]
    });

    // 2. Ensure closure (first point === last point)
    const firstPt = normalizedRing[0];
    const lastPt = normalizedRing[normalizedRing.length - 1];
    if (firstPt[0] !== lastPt[0] || firstPt[1] !== lastPt[1]) {
      normalizedRing.push([firstPt[0], firstPt[1]]);
    }

    // 3. Fix Winding Order: GeoJSON outer ring MUST be Counter-Clockwise (Signed Area < 0)
    // If signed area > 0 (Clockwise), reverse the ring to avoid inverted globe calculations
    if (getSignedArea(normalizedRing) > 0) {
      normalizedRing.reverse();
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

  const clampedGeo = clampPolygonToAgroLimits(boundary.geometry, lat, lon);
  const normalizedGeo = normalizeGeometry(clampedGeo, lat, lon);

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
    const errMsg: string = err.message ?? '';

    // Agromonitoring returns a 400 with the existing polygon ID when the geometry
    // is a duplicate. Extract that ID and reuse it rather than failing.
    // Example message: "Your polygon is duplicated your already existed polygon '6a8cf3a3fc4d16fabfb94c6b'."
    const duplicateMatch = errMsg.match(/already existed polygon\s+'([a-f0-9]+)'/i);
    if (duplicateMatch) {
      return duplicateMatch[1];
    }

    // If the duplicate message doesn't contain an ID, retry with the duplicated=true flag.
    if (/duplicat/i.test(errMsg)) {
      const retryRes = await fetch(`${AGRO_BASE}/polygons?appid=${apiKey}&duplicated=true`, {
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

      if (retryRes.ok) {
        const retried: { id: string } = await retryRes.json();
        return retried.id;
      }

      const retryErr = await retryRes.json().catch(() => ({}));
      throw new Error(`Agromonitoring polygon creation failed: ${retryErr.message ?? retryRes.status}`);
    }

    throw new Error(`Agromonitoring polygon creation failed: ${errMsg || createRes.status}`);
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