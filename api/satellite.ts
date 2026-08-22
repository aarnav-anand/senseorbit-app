import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchSatellite } from '../lib/satellite.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = parseFloat(String(req.query.lat ?? ''));
  const lon = parseFloat(String(req.query.lon ?? ''));

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  try {
    const data = await fetchSatellite(lat, lon);
    return res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
