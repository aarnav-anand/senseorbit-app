import type { WeatherResponse, SoilResponse, SatelliteResponse, NdviResponse } from '../types/report';
import type { Feature, Polygon } from 'geojson';

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

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json();
}

export function fetchWeatherData(lat: number, lon: number): Promise<WeatherResponse> {
  return apiGet('/api/weather', { lat: String(lat), lon: String(lon) });
}

export function fetchSoilData(lat: number, lon: number): Promise<SoilResponse> {
  return apiGet('/api/soil', { lat: String(lat), lon: String(lon) });
}

export function fetchSatelliteData(lat: number, lon: number): Promise<SatelliteResponse> {
  return apiGet('/api/satellite', { lat: String(lat), lon: String(lon) });
}

export async function fetchNdviData(
  lat: number,
  lon: number,
  boundary: Feature<Polygon>,
): Promise<NdviResponse> {
  const res = await fetch('/api/ndvi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, boundary }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `NDVI API error ${res.status}`);
  }
  return res.json();
}

export function fetchGeocodeResults(query: string): Promise<GeocodeResult[]> {
  return apiGet('/api/geocode', { q: query });
}

export function fetchLocationName(lat: number, lon: number): Promise<string> {
  return apiGet<{ name: string }>('/api/geocode', {
    lat: String(lat),
    lon: String(lon),
  }).then((r) => r.name);
}

export async function directWaterCheck(lat: number, lon: number): Promise<WaterCheckResult> {
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

    const geoData = geoRes ? await geoRes.json().catch(() => null) : null;
    const elevData = elevRes ? await elevRes.json().catch(() => null) : null;

    const elevation = elevData?.elevation?.[0] ?? null;

    if (geoData?.error === 'Unable to geocode' || (geoData?.error && !geoData?.display_name)) {
      return { isWater: true, reason: 'Unmapped open ocean water.' };
    }

    const displayName = (geoData?.display_name || '').toLowerCase();
    const address = geoData?.address || {};
    const addressType = geoData?.addresstype || '';
    const cls = geoData?.class || '';
    const type = geoData?.type || '';

    const hasLocalLandAddress = Boolean(
      address.hamlet ||
      address.village ||
      address.town ||
      address.city ||
      address.suburb ||
      address.county ||
      address.state_district ||
      address.municipality ||
      address.road ||
      address.neighbourhood ||
      address.residential,
    );

    const isWaterClass =
      cls === 'waterway' ||
      (cls === 'natural' && ['water', 'bay', 'sea', 'ocean', 'coastline', 'wetland'].includes(type));

    const waterKeywords = [
      'sea', 'ocean', 'bay', 'gulf', 'lake', 'river', 'reservoir', 'waterbody',
      'dam', 'strait', 'creek', 'estuary', 'lagoon', 'gulf of khambhat',
      'gulf of kutch', 'arabian sea', 'bay of bengal',
    ];
    const isWaterKeyword = waterKeywords.some((kw) =>
      new RegExp(`\\b${kw}\\b`, 'i').test(displayName),
    );

    const isCountryOnly = addressType === 'country' || addressType === 'continent' || !hasLocalLandAddress;

    if (isWaterClass || isWaterKeyword || isCountryOnly || ((elevation === 0 || elevation === null) && !hasLocalLandAddress)) {
      return { isWater: true, reason: 'Boundary is over water.' };
    }

    return { isWater: false };
  } catch {
    return { isWater: false };
  }
}

export async function fetchWaterCheck(lat: number, lon: number): Promise<WaterCheckResult> {
  try {
    const res = await apiGet<WaterCheckResult>('/api/check-water', {
      lat: String(lat),
      lon: String(lon),
    });
    if (res.isWater) return res;
  } catch {
    // Fall back to direct client check
  }

  return directWaterCheck(lat, lon);
}

export async function fetchFullReport(lat: number, lon: number) {
  const [weatherResult, soilResult, satelliteResult, locationName] = await Promise.all([
    fetchWeatherData(lat, lon)
      .then((data) => ({ data, error: null }))
      .catch((err) => ({
        data: null,
        error: err instanceof Error ? err.message : 'Failed to load weather data',
      })),
    fetchSoilData(lat, lon)
      .then((data) => ({ data, error: null }))
      .catch((err) => ({
        data: null,
        error: err instanceof Error ? err.message : 'Failed to load soil data',
      })),
    fetchSatelliteData(lat, lon)
      .then((data) => ({ data, error: null }))
      .catch((err) => ({
        data: null,
        error: err instanceof Error ? err.message : 'Failed to load satellite data',
      })),
    fetchLocationName(lat, lon).catch(() => null),
  ]);

  if (weatherResult.error && soilResult.error && satelliteResult.error) {
    throw new Error('All report services failed to load.');
  }

  return {
    weather: weatherResult.data,
    weatherError: weatherResult.error,
    soil: soilResult.data,
    soilError: soilResult.error,
    satellite: satelliteResult.data,
    satelliteError: satelliteResult.error,
    locationName,
  };
}