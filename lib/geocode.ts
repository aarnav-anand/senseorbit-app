import { getCached, setCache, CACHE_TTL } from './cache.js';

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
  type: string;
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
