import type { Feature, Polygon } from 'geojson';

export interface Farmland {
  id: string;
  created_at?: string;
  farmer_id: string;
  name: string;
  area_ha: number;
  area_acres: number;
  centroid_lat: number;
  centroid_lon: number;
  polygon: Feature<Polygon> | object;
}

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) || 'https://wicmrtvumrovpjiwuash.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpY21ydHZ1bXJvdnBqaXd1YXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTAwODQsImV4cCI6MjEwMjM2NjA4NH0.zinB9VBZ-GEWsfkQk8QAIk1Z_Jatd5CV0SJzpM_i56I';

const getHeaders = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

/**
 * Save a new farmland boundary for a farmer.
 */
export async function saveFarmland(
  farmerId: string,
  name: string,
  polygon: Feature<Polygon> | object,
  areaHa: number,
  areaAcres: number,
  lat: number,
  lon: number,
): Promise<Farmland> {
  const url = `${SUPABASE_URL}/rest/v1/farmlands`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      farmer_id: farmerId,
      name: name.trim() || 'My Farm',
      polygon,
      area_ha: areaHa,
      area_acres: areaAcres,
      centroid_lat: lat,
      centroid_lon: lon,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      `Failed to save farmland: ${(errBody as { message?: string }).message ?? res.status}`,
    );
  }

  const data: Farmland[] = await res.json();
  if (!data || data.length === 0) throw new Error('No data returned after saving farmland.');
  return data[0];
}

/**
 * List all farmlands belonging to a farmer (newest first).
 */
export async function listFarmlands(farmerId: string): Promise<Farmland[]> {
  const url = `${SUPABASE_URL}/rest/v1/farmlands?farmer_id=eq.${encodeURIComponent(farmerId)}&order=created_at.desc&select=*`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    throw new Error(`Failed to fetch farmlands: status ${res.status}`);
  }

  return res.json();
}

/**
 * Delete a farmland by ID.
 */
export async function deleteFarmland(farmlandId: string): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/farmlands?id=eq.${encodeURIComponent(farmlandId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete farmland: status ${res.status}`);
  }
}
