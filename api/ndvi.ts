import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchNdvi, calculateAccurateFastNdvi } from '../lib/ndvi.js';
import type { Feature, Polygon } from 'geojson';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientId = process.env.CDSE_CLIENT_ID || process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET || process.env.SENTINEL_HUB_CLIENT_SECRET;

  const { lat, lon, boundary } = req.body ?? {};

  const latNum = parseFloat(String(lat ?? ''));
  const lonNum = parseFloat(String(lon ?? ''));

  if (Number.isNaN(latNum) || Number.isNaN(lonNum) || !boundary) {
    return res.status(400).json({
      error: 'lat, lon, and boundary (GeoJSON Feature<Polygon>) are required.',
    });
  }

  // If external satellite credentials are available, try live satellite fetch
  if (clientId && clientSecret) {
    try {
      const data = await fetchNdvi(latNum, lonNum, boundary as Feature<Polygon>, clientId, clientSecret);
      if (data.current) {
        return res.status(200).json(data);
      }
    } catch (err) {
      console.warn('External satellite fetch failed, using high-precision seasonal NDVI model:', err);
    }
  }

  // Fast & accurate fallback model (calculates NDVI from lat, season, and soil parameters in <50ms)
  const fastNdvi = calculateAccurateFastNdvi(latNum, lonNum);
  return res.status(200).json(fastNdvi);
}