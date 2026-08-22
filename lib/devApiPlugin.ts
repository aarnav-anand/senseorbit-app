import type { Plugin } from 'vite';
import { fetchWeather } from './weather.js';
import { fetchSoil } from './soil.js';
import { fetchSatellite } from './satellite.js';
import { fetchGeocode, fetchReverseGeocode } from './geocode.js';

function parseQuery(url: string): URLSearchParams {
  const idx = url.indexOf('?');
  return new URLSearchParams(idx >= 0 ? url.slice(idx + 1) : '');
}

function sendJson(res: import('http').ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function handleApiRoute(
  pathname: string,
  query: URLSearchParams,
  res: import('http').ServerResponse,
) {
  try {
    if (pathname === '/api/weather') {
      const lat = parseFloat(query.get('lat') ?? '');
      const lon = parseFloat(query.get('lon') ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return sendJson(res, 400, { error: 'lat and lon are required' });
      }
      return sendJson(res, 200, await fetchWeather(lat, lon));
    }

    if (pathname === '/api/soil') {
      const lat = parseFloat(query.get('lat') ?? '');
      const lon = parseFloat(query.get('lon') ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return sendJson(res, 400, { error: 'lat and lon are required' });
      }
      return sendJson(res, 200, await fetchSoil(lat, lon));
    }

    if (pathname === '/api/satellite') {
      const lat = parseFloat(query.get('lat') ?? '');
      const lon = parseFloat(query.get('lon') ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return sendJson(res, 400, { error: 'lat and lon are required' });
      }
      return sendJson(res, 200, await fetchSatellite(lat, lon));
    }

    if (pathname === '/api/geocode') {
      const q = query.get('q');
      if (!q) return sendJson(res, 400, { error: 'q is required' });
      return sendJson(res, 200, await fetchGeocode(q));
    }

    if (pathname === '/api/reverse-geocode') {
      const lat = parseFloat(query.get('lat') ?? '');
      const lon = parseFloat(query.get('lon') ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return sendJson(res, 400, { error: 'lat and lon are required' });
      }
      return sendJson(res, 200, { name: await fetchReverseGeocode(lat, lon) });
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    sendJson(res, 500, { error: message });
  }
}

export function devApiPlugin(): Plugin {
  return {
    name: 'senseorbit-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const url = new URL(req.url, 'http://localhost');
        await handleApiRoute(url.pathname, url.searchParams, res);
      });
    },
  };
}

export { handleApiRoute };
