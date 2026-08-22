import { getCached, setCache, CACHE_TTL } from './cache.js';

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
  type: string;
}

export interface WaterCheckResult {
  isWater: boolean;
  reason?: string;
}

export async function fetchGeocode(query: string): Promise<GeocodeResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const cacheKey = `geocode:${normalizedQuery}`;
  const cached = getCached<GeocodeResult[]>(cacheKey);
  if (cached) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query.trim());
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'in');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'SenseOrbit/1.0 (farm boundary mapping app)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding API error: ${res.status}`);
  }

  const data = await res.json();
  const results: GeocodeResult[] = data.map(
    (item: { display_name: string; lat: string; lon: string; type: string }) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
    }),
  );

  setCache(cacheKey, results, CACHE_TTL.geocode);
  return results;
}

export async function fetchReverseGeocode(lat: number, lon: number): Promise<string> {
  const cacheKey = `reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'SenseOrbit/1.0 (farm boundary mapping app)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Reverse geocoding error: ${res.status}`);
  }

  const data = await res.json();
  const name = data.display_name ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  setCache(cacheKey, name, CACHE_TTL.geocode);
  return name;
}

export async function checkWaterBody(lat: number, lon: number): Promise<WaterCheckResult> {
  const cacheKey = `water:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached<WaterCheckResult>(cacheKey);
  if (cached) return cached;

  try {
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`;
    const elevUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;

    const [geoRes, elevRes] = await Promise.all([
      fetch(geoUrl, {
        headers: {
          'User-Agent': 'SenseOrbit/1.0 (farm boundary mapping app)',
          Accept: 'application/json',
        },
      }).catch(() => null),
      fetch(elevUrl).catch(() => null),
    ]);

    let isWater = false;
    let reason = '';

    if (geoRes && geoRes.ok) {
      const geoData = await geoRes.json();
      const displayName = (geoData?.display_name || '').toLowerCase();
      const addressType = geoData?.addresstype || '';
      const cls = geoData?.class || '';
      const type = geoData?.type || '';

      const waterKeywords = [
        'sea',
        'ocean',
        'bay',
        'gulf',
        'lake',
        'river',
        'reservoir',
        'waterbody',
        'dam',
        'strait',
        'creek',
        'estuary',
        'lagoon',
      ];
      const isWaterKeyword = waterKeywords.some((kw) =>
        new RegExp(`\\b${kw}\\b`, 'i').test(displayName),
      );

      const isWaterClass =
        cls === 'waterway' ||
        (cls === 'natural' && ['water', 'bay', 'sea', 'ocean', 'coastline', 'wetland'].includes(type));
      const isCountryOnly = addressType === 'country' || addressType === 'continent';

      let elevation: number | null = null;
      if (elevRes && elevRes.ok) {
        const elevData = await elevRes.json();
        elevation = elevData?.elevation?.[0] ?? null;
      }

      if (isWaterClass || isWaterKeyword) {
        isWater = true;
        reason = 'Boundary is over a mapped water body (lake, river, bay, or sea).';
      } else if (elevation === 0 && isCountryOnly) {
        isWater = true;
        reason = 'Boundary is over an ocean or open sea water area.';
      }
    }

    const result: WaterCheckResult = { isWater, reason };
    setCache(cacheKey, result, CACHE_TTL.geocode);
    return result;
  } catch (err) {
    console.error('Error checking water body:', err);
    return { isWater: false };
  }
}
