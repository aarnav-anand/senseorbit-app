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

// ---------------------------------------------------------------------------
// CDSE Sentinel Hub endpoints
// ---------------------------------------------------------------------------
const CDSE_TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CDSE_STATS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

// NDVI evalscript: computes (B08-B04)/(B08+B04), excludes water (SCL=6) and
// invalid pixels so the mean reflects only valid vegetated/non-water land.
const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "data", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(samples) {
  var ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  var validMask = 1;
  if (samples.B08 + samples.B04 === 0) validMask = 0;
  if (samples.SCL === 6) validMask = 0; // exclude water
  return {
    data: [ndvi],
    dataMask: [samples.dataMask * validMask]
  };
}`;

function toIsoDate(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

function toIsoDateTime(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// OAuth2 client-credentials token (cached in-process for the token lifetime)
// ---------------------------------------------------------------------------
let _tokenCache: { token: string; expiresAt: number } | null = null;

async function getCdseToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 30_000) {
    return _tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(CDSE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`CDSE auth failed: ${text}`);
  }

  const json: { access_token: string; expires_in: number } = await res.json();
  _tokenCache = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return _tokenCache.token;
}

// ---------------------------------------------------------------------------
// Compute bbox from a GeoJSON polygon for the CDSE bounds object
// ---------------------------------------------------------------------------
function polygonBbox(geometry: Polygon): [number, number, number, number] {
  const coords = geometry.coordinates[0];
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}

// ---------------------------------------------------------------------------
// Parse the CDSE Statistical API response into our NdviStats[]
// Response shape (per interval):
//   { interval: { from, to }, outputs: { data: { bands: { B0: { stats: { mean, stDev, min, max, sampleCount, noDataCount } } } } } }
// ---------------------------------------------------------------------------
interface CdseInterval {
  interval: { from: string; to: string };
  outputs?: {
    data?: {
      bands?: {
        B0?: {
          stats?: {
            mean?: number;
            stDev?: number;
            min?: number;
            max?: number;
            sampleCount?: number;
            noDataCount?: number;
            percentiles?: Record<string, number>;
          };
        };
      };
    };
  };
}

function parseCdseResponse(intervals: CdseInterval[]): NdviStats[] {
  const result: NdviStats[] = [];
  for (const entry of intervals) {
    const stats = entry.outputs?.data?.bands?.B0?.stats;
    if (!stats || typeof stats.mean !== 'number') continue;
    // Skip intervals where ALL pixels were masked (noDataCount === sampleCount)
    if (stats.sampleCount === 0 || stats.sampleCount === stats.noDataCount) continue;

    const pct = stats.percentiles ?? {};
    const p25 = pct['25.0'] ?? pct['25'] ?? stats.min ?? 0;
    const p75 = pct['75.0'] ?? pct['75'] ?? stats.max ?? 0;
    const median = pct['50.0'] ?? pct['50'] ?? stats.mean;

    const dt = Math.floor(new Date(entry.interval.from).getTime() / 1000);
    result.push({
      mean: Math.round(stats.mean * 1000) / 1000,
      std: Math.round((stats.stDev ?? 0) * 1000) / 1000,
      min: Math.round((stats.min ?? 0) * 1000) / 1000,
      max: Math.round((stats.max ?? 0) * 1000) / 1000,
      median: Math.round(median * 1000) / 1000,
      p25: Math.round(p25 * 1000) / 1000,
      p75: Math.round(p75 * 1000) / 1000,
      num: (stats.sampleCount ?? 0) - (stats.noDataCount ?? 0),
      date: dt,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function fetchNdvi(
  lat: number,
  lon: number,
  boundary: Feature<Polygon>,
  clientId: string,
  clientSecret: string,
): Promise<NdviResponse> {
  const cacheKey = `ndvi_cdse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached<NdviResponse>(cacheKey);
  if (cached) return cached;

  const now = Math.floor(Date.now() / 1000);

  // Obtain OAuth2 access token
  let token: string;
  try {
    token = await getCdseToken(clientId, clientSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { current: null, history: [], polygonId: null, captureDate: toIsoDate(now), error: msg };
  }

  const bbox = polygonBbox(boundary.geometry);

  // Try progressively wider date windows: 90d → 180d → 365d
  // Use 30-day aggregation intervals with percentiles to match what the UI expects.
  const WINDOWS_DAYS = [90, 180, 365];
  let history: NdviStats[] = [];

  for (const days of WINDOWS_DAYS) {
    const fromTs = now - days * 24 * 60 * 60;
    const fromStr = toIsoDateTime(fromTs);
    const toStr = toIsoDateTime(now);

    const statsRequest = {
      input: {
        bounds: {
          bbox,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: { mosaickingOrder: 'leastCC' },
          },
        ],
      },
      aggregation: {
        timeRange: { from: fromStr, to: toStr },
        aggregationInterval: { of: 'P30D' },
        evalscript: NDVI_EVALSCRIPT,
        resx: 10,
        resy: 10,
      },
      calculations: {
        default: {
          statistics: {
            default: {
              percentiles: { k: [25, 50, 75] },
            },
          },
        },
      },
    };

    let res: Response;
    try {
      res = await fetch(CDSE_STATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(statsRequest),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { current: null, history: [], polygonId: null, captureDate: toIsoDate(now), error: `CDSE request failed: ${msg}` };
    }

    if (!res.ok) {
      // 4xx on the stats endpoint means no data or bad request — try wider window
      if (res.status >= 400 && res.status < 500) continue;
      const errText = await res.text().catch(() => res.status.toString());
      return {
        current: null,
        history: [],
        polygonId: null,
        captureDate: toIsoDate(now),
        error: `CDSE stats error ${res.status}: ${errText}`,
      };
    }

    const body: { data?: CdseInterval[]; status?: string } = await res.json();
    const intervals = body.data ?? [];
    history = parseCdseResponse(intervals);
    if (history.length > 0) break;
  }

  const current = history.length > 0 ? history[history.length - 1] : null;
  const captureDate = current ? toIsoDate(current.date) : toIsoDate(now);

  const result: NdviResponse = {
    current,
    history,
    polygonId: null, // CDSE doesn't use polygon IDs
    captureDate,
  };

  setCache(cacheKey, result, CACHE_TTL.satellite);
  return result;
}