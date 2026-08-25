import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchNdvi } from '../lib/ndvi.js';
import type { Feature, Polygon } from 'geojson';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(503).json({
      error: 'CDSE_CLIENT_ID and CDSE_CLIENT_SECRET environment variables are not configured.',
    });
  }

  const { lat, lon, boundary } = req.body ?? {};

  const latNum = parseFloat(String(lat ?? ''));
  const lonNum = parseFloat(String(lon ?? ''));

  if (Number.isNaN(latNum) || Number.isNaN(lonNum) || !boundary) {
    return res.status(400).json({
      error: 'lat, lon, and boundary (GeoJSON Feature<Polygon>) are required.',
    });
  }

  try {
    const data = await fetchNdvi(latNum, lonNum, boundary as Feature<Polygon>, clientId, clientSecret);
    return res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}