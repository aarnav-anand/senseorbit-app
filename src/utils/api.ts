import type { WeatherResponse, SoilResponse, SatelliteResponse } from '../types/report';

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

export function fetchGeocodeResults(query: string): Promise<GeocodeResult[]> {
  return apiGet('/api/geocode', { q: query });
}

export function fetchLocationName(lat: number, lon: number): Promise<string> {
  return apiGet<{ name: string }>('/api/geocode', {
    lat: String(lat),
    lon: String(lon),
  }).then((r) => r.name);
}

export function fetchWaterCheck(lat: number, lon: number): Promise<WaterCheckResult> {
  return apiGet<WaterCheckResult>('/api/check-water', {
    lat: String(lat),
    lon: String(lon),
  }).catch(() => ({ isWater: false }));
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
