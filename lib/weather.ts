import { getCached, setCache, CACHE_TTL } from './cache.js';

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
}

export interface WeatherDaily {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

export interface WeatherResponse {
  current: WeatherCurrent;
  forecast: WeatherDaily[];
  historicalRainfall: { month: string; precipitation: number }[];
  summaryKey: string;
}

const WEATHER_SUMMARY_KEYS: Record<number, string> = {
  0: 'weather.summary.clear',
  1: 'weather.summary.mainlyClear',
  2: 'weather.summary.partlyCloudy',
  3: 'weather.summary.overcast',
  45: 'weather.summary.foggy',
  48: 'weather.summary.foggy',
  51: 'weather.summary.drizzle',
  61: 'weather.summary.rain',
  63: 'weather.summary.rain',
  65: 'weather.summary.heavyRain',
  80: 'weather.summary.showers',
  95: 'weather.summary.thunderstorm',
};

function getSummaryKey(code: number): string {
  return WEATHER_SUMMARY_KEYS[code] ?? 'weather.summary.partlyCloudy';
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherResponse> {
  const cacheKey = `weather:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached<WeatherResponse>(cacheKey);
  if (cached) return cached;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(lat));
  forecastUrl.searchParams.set('longitude', String(lon));
  forecastUrl.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
  );
  forecastUrl.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
  );
  forecastUrl.searchParams.set('forecast_days', '16');
  forecastUrl.searchParams.set('timezone', 'auto');

  const archiveUrl = new URL('https://archive-api.open-meteo.com/v1/archive');
  archiveUrl.searchParams.set('latitude', String(lat));
  archiveUrl.searchParams.set('longitude', String(lon));
  archiveUrl.searchParams.set('start_date', startDate.toISOString().slice(0, 10));
  archiveUrl.searchParams.set('end_date', endDate.toISOString().slice(0, 10));
  archiveUrl.searchParams.set('daily', 'precipitation_sum');
  archiveUrl.searchParams.set('timezone', 'auto');

  const [forecastRes, archiveRes] = await Promise.all([
    fetch(forecastUrl.toString()),
    fetch(archiveUrl.toString()),
  ]);

  if (!forecastRes.ok) {
    throw new Error(`Weather API error: ${forecastRes.status}`);
  }

  const forecast = await forecastRes.json();
  const archive = archiveRes.ok ? await archiveRes.json() : null;

  const current: WeatherCurrent = {
    temperature: forecast.current.temperature_2m,
    humidity: forecast.current.relative_humidity_2m,
    precipitation: forecast.current.precipitation,
    windSpeed: forecast.current.wind_speed_10m,
    weatherCode: forecast.current.weather_code,
  };

  const forecastDays: WeatherDaily[] = forecast.daily.time.map((date: string, i: number) => ({
    date,
    tempMax: forecast.daily.temperature_2m_max[i],
    tempMin: forecast.daily.temperature_2m_min[i],
    precipitation: forecast.daily.precipitation_sum[i],
  }));

  const monthlyRainfall = new Map<string, number>();
  if (archive?.daily?.time) {
    archive.daily.time.forEach((date: string, i: number) => {
      const month = date.slice(0, 7);
      const prev = monthlyRainfall.get(month) ?? 0;
      monthlyRainfall.set(month, prev + (archive.daily.precipitation_sum[i] ?? 0));
    });
  }

  const historicalRainfall = Array.from(monthlyRainfall.entries()).map(([month, precipitation]) => ({
    month,
    precipitation: Math.round(precipitation * 10) / 10,
  }));

  const result: WeatherResponse = {
    current,
    forecast: forecastDays,
    historicalRainfall,
    summaryKey: getSummaryKey(current.weatherCode),
  };

  setCache(cacheKey, result, CACHE_TTL.weather);
  return result;
}
