import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchGeocode, fetchReverseGeocode } from '../lib/geocode.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const q = req.query.q as string | undefined;
    if (q) {
      const data = await fetchGeocode(q);
      return res.status(200).json(data);
    }

    const lat = parseFloat(String(req.query.lat ?? ''));
    const lon = parseFloat(String(req.query.lon ?? ''));
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      const name = await fetchReverseGeocode(lat, lon);
      return res.status(200).json({ name });
    }

    return res.status(400).json({ error: 'q or lat/lon are required' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
