import type { VercelRequest, VercelResponse } from '@vercel/node';

interface MandiRecord {
  market: string;
  state: string;
  district: string;
  commodity: string;
  variety: string;
  arrivalDate: string;
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
}

// Normalize crop names to match Agmarknet commodity naming conventions
function normalizeCrop(crop: string): string {
  const map: Record<string, string> = {
    'rice/paddy': 'Paddy', 'rice': 'Paddy', 'paddy': 'Paddy',
    'wheat': 'Wheat',
    'maize': 'Maize', 'corn': 'Maize',
    'soybean': 'Soyabean', 'soya': 'Soyabean',
    'cotton': 'Cotton',
    'sugarcane': 'Sugarcane',
    'groundnut': 'Groundnut', 'peanut': 'Groundnut',
    'sunflower': 'Sunflower',
    'onion': 'Onion',
    'tomato': 'Tomato',
    'chickpea': 'Gram', 'gram': 'Gram', 'chana': 'Gram',
    'mustard': 'Mustard', 'sarson': 'Mustard',
    'jowar': 'Jowar', 'sorghum': 'Jowar',
    'bajra': 'Bajra', 'pearl millet': 'Bajra',
    'lentil': 'Masoor Dal', 'masoor': 'Masoor Dal', 'lentil (masoor)': 'Masoor Dal',
    'moong': 'Moong Dal', 'mung dal': 'Moong Dal', 'moong dal': 'Moong Dal',
    'tur': 'Tur Dal', 'arhar': 'Tur Dal', 'tur/arhar': 'Tur Dal', 'pigeon pea': 'Tur Dal',
  };
  return map[crop.toLowerCase().trim()] ?? crop;
}

async function reverseGeocodeState(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=8`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SenseOrbit/1.0 (farm advisory app; contact@senseorbit.in)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return 'Unknown';
    const data = await res.json();
    return (data?.address?.state as string) || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cropRaw = String(req.query.crop ?? '');
  const lat = parseFloat(String(req.query.lat ?? ''));
  const lon = parseFloat(String(req.query.lon ?? ''));

  if (!cropRaw) return res.status(400).json({ error: 'crop is required' });
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const apiKey = process.env.AGMARKNET_API_KEY;
  const commodity = normalizeCrop(cropRaw);

  // Step 1: Get state from coordinates
  const detectedState = await reverseGeocodeState(lat, lon);

  // Step 2: Fetch from data.gov.in if key is available
  if (!apiKey) {
    return res.status(200).json({
      prices: [],
      detectedState,
      source: 'fallback',
      note: 'Configure AGMARKNET_API_KEY (free from data.gov.in) to see live mandi prices. Registration takes 2 minutes at https://data.gov.in/user/register — then add the key to Vercel environment variables.',
    });
  }

  try {
    // Get today's and yesterday's dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format

    // data.gov.in Agmarknet daily price dataset
    const agmarknetUrl = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
    agmarknetUrl.searchParams.set('api-key', apiKey);
    agmarknetUrl.searchParams.set('format', 'json');
    agmarknetUrl.searchParams.set('limit', '50'); // Increased to get both today and yesterday
    agmarknetUrl.searchParams.set('filters[commodity]', commodity);
    if (detectedState && detectedState !== 'Unknown') {
      agmarknetUrl.searchParams.set('filters[state]', detectedState);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const agRes = await fetch(agmarknetUrl.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!agRes.ok) {
      // Return fallback — don't crash if Agmarknet API is down
      return res.status(200).json({
        prices: [],
        detectedState,
        source: 'fallback',
        note: `Agmarknet API returned status ${agRes.status}. Try again later or visit agmarknet.gov.in directly.`,
      });
    }

    const agData = await agRes.json();
    const records: object[] = agData?.records ?? agData?.data ?? [];

    const prices: MandiRecord[] = records.map((r: object) => {
      const rec = r as Record<string, string>;
      return {
        market: rec['Market'] || rec['market'] || '',
        state: rec['State'] || rec['state'] || detectedState,
        district: rec['District'] || rec['district'] || '',
        commodity: rec['Commodity'] || rec['commodity'] || commodity,
        variety: rec['Variety'] || rec['variety'] || '',
        arrivalDate: rec['Arrival_Date'] || rec['arrival_date'] || '',
        minPrice: parseFloat(rec['Min_x0020_Price'] || rec['min_price'] || rec['Min Price'] || '0') || 0,
        modalPrice: parseFloat(rec['Modal_x0020_Price'] || rec['modal_price'] || rec['Modal Price'] || '0') || 0,
        maxPrice: parseFloat(rec['Max_x0020_Price'] || rec['max_price'] || rec['Max Price'] || '0') || 0,
      };
    }).filter((p) => p.market && p.modalPrice > 0);

    // Separate today's and yesterday's prices
    const todayPrices = prices.filter((p) => p.arrivalDate === todayStr);
    const yesterdayPrices = prices.filter((p) => p.arrivalDate === yesterdayStr);

    // If no prices today but prices yesterday, mark as no-prices-today
    const isNoPricesToday = todayPrices.length === 0 && yesterdayPrices.length > 0;

    return res.status(200).json({
      prices: todayPrices.length > 0 ? todayPrices : yesterdayPrices,
      previousDayPrices: isNoPricesToday ? yesterdayPrices : undefined,
      isNoPricesToday,
      previousDayDate: isNoPricesToday ? yesterdayStr : undefined,
      detectedState,
      source: 'agmarknet',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(200).json({
      prices: [],
      detectedState,
      source: 'fallback',
      note: `Could not fetch live prices: ${message}. Visit agmarknet.gov.in for manual price lookup.`,
    });
  }
}
