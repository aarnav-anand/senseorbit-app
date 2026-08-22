export interface Farmer {
  id: string;
  created_at?: string;
  farmer_name: string;
  phone_number: string;
  dif_code: string;
  senseorbit: number;
  croplens?: number;
  quallix?: number;
  dizmatrix?: number;
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
 * Fetch a farmer from Supabase by matching 4-character DIF code.
 * Searches case-insensitively.
 */
export async function fetchFarmerByDifCode(difCode: string): Promise<Farmer | null> {
  const cleanCode = difCode.trim();
  if (!cleanCode) return null;

  try {
    // Try exact match first
    let url = `${SUPABASE_URL}/rest/v1/farmers?dif_code=eq.${encodeURIComponent(cleanCode)}&select=*`;
    let res = await fetch(url, { headers: getHeaders() });
    
    if (!res.ok) {
      throw new Error(`Supabase query failed with status ${res.status}`);
    }

    let data: Farmer[] = await res.json();
    
    if (data.length === 0) {
      // Try case-insensitive ilike match
      url = `${SUPABASE_URL}/rest/v1/farmers?dif_code=ilike.${encodeURIComponent(cleanCode)}&select=*`;
      res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        data = await res.json();
      }
    }

    return data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Error fetching farmer by DIF code:', err);
    throw err;
  }
}

/**
 * Deduct 1 credit from farmer's senseorbit field in Supabase database.
 * Returns the updated farmer or throws error.
 */
export async function deductFarmerCredit(farmerId: string, currentCredits: number): Promise<number> {
  const newCredits = Math.max(0, currentCredits - 1);
  const url = `${SUPABASE_URL}/rest/v1/farmers?id=eq.${encodeURIComponent(farmerId)}`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...getHeaders(),
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ senseorbit: newCredits }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update credits in Supabase: status ${res.status}`);
    }

    const data: Farmer[] = await res.json();
    return data.length > 0 ? data[0].senseorbit : newCredits;
  } catch (err) {
    console.error('Error updating farmer credits:', err);
    throw err;
  }
}

/**
 * Refresh current farmer's credits from Supabase.
 */
export async function refreshFarmerCredits(farmerId: string): Promise<number | null> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/farmers?id=eq.${encodeURIComponent(farmerId)}&select=senseorbit`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return null;
    const data: { senseorbit: number }[] = await res.json();
    return data.length > 0 ? data[0].senseorbit : null;
  } catch (err) {
    console.error('Error refreshing farmer credits:', err);
    return null;
  }
}
