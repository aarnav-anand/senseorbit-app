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

// Get crop-specific relevant fields for display
function getCropSpecificFields(crop: string): { displayName: string; unit: string } {
  const cropMap: Record<string, { displayName: string; unit: string }> = {
    'paddy': { displayName: 'Paddy/Rice', unit: '₹/quintal' },
    'wheat': { displayName: 'Wheat', unit: '₹/quintal' },
    'maize': { displayName: 'Maize/Corn', unit: '₹/quintal' },
    'soyabean': { displayName: 'Soybean', unit: '₹/quintal' },
    'cotton': { displayName: 'Cotton', unit: '₹/bale' },
    'sugarcane': { displayName: 'Sugarcane', unit: '₹/quintal' },
    'groundnut': { displayName: 'Groundnut', unit: '₹/quintal' },
    'sunflower': { displayName: 'Sunflower', unit: '₹/quintal' },
    'onion': { displayName: 'Onion', unit: '₹/quintal' },
    'tomato': { displayName: 'Tomato', unit: '₹/quintal' },
    'gram': { displayName: 'Chickpea/Gram', unit: '₹/quintal' },
    'mustard': { displayName: 'Mustard', unit: '₹/quintal' },
    'jowar': { displayName: 'Jowar/Sorghum', unit: '₹/quintal' },
    'bajra': { displayName: 'Bajra/Pearl Millet', unit: '₹/quintal' },
    'masoor dal': { displayName: 'Lentil/Masoor Dal', unit: '₹/quintal' },
    'moong dal': { displayName: 'Moong Dal', unit: '₹/quintal' },
    'tur dal': { displayName: 'Tur/Arhar Dal', unit: '₹/quintal' },
  };
  return cropMap[crop.toLowerCase().trim()] || { displayName: crop, unit: '₹/quintal' };
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

// Parse date in DD/MM/YYYY or other formats to YYYY-MM-DD
function parseDateToYYYYMMDD(dateStr: string): string {
  try {
    const trimmed = (dateStr || '').trim();
    
    // Try DD/MM/YYYY format
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].padStart(4, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Try YYYY-MM-DD format (already correct)
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return trimmed;
    }
    
    // Try other formats by parsing as Date
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return trimmed;
  } catch {
    return dateStr;
  }
}

// Get dates for comparison (today and last 3 days for better fallback)
function getDateRangeForComparison(): { today: string; yesterday: string; lastTwoDays: string[]; dates: string[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const lastTwoDaysArray = [todayStr, yesterdayStr];
  const dates = [];
  
  // Generate last 5 days for flexibility
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return {
    today: todayStr,
    yesterday: yesterdayStr,
    lastTwoDays: lastTwoDaysArray,
    dates,
  };
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
  const cropSpecificFields = getCropSpecificFields(commodity);

  // Step 1: Get state from coordinates
  const detectedState = await reverseGeocodeState(lat, lon);

  // Step 2: Fetch from data.gov.in if key is available
  if (!apiKey) {
    return res.status(200).json({
      prices: [],
      crop: cropRaw,
      commodityName: commodity,
      cropDisplayName: cropSpecificFields.displayName,
      detectedState,
      source: 'fallback',
      note: 'Configure AGMARKNET_API_KEY (free from data.gov.in) to see live mandi prices. Registration takes 2 minutes at https://data.gov.in/user/register — then add the key to Vercel environment variables.',
    });
  }

  try {
    const dateRange = getDateRangeForComparison();

    // data.gov.in Agmarknet daily price dataset
    const agmarknetUrl = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
    agmarknetUrl.searchParams.set('api-key', apiKey);
    agmarknetUrl.searchParams.set('format', 'json');
    agmarknetUrl.searchParams.set('limit', '100'); // Increased to get more records
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
        crop: cropRaw,
        commodityName: commodity,
        cropDisplayName: cropSpecificFields.displayName,
        detectedState,
        source: 'fallback',
        note: `Agmarknet API returned status ${agRes.status}. Try again later or visit agmarknet.gov.in directly.`,
      });
    }

    const agData = await agRes.json();
    const records: object[] = agData?.records ?? agData?.data ?? [];

    const prices: MandiRecord[] = records.map((r: object) => {
      const rec = r as Record<string, string>;
      const normalizedDate = parseDateToYYYYMMDD(rec['Arrival_Date'] || rec['arrival_date'] || '');
      return {
        market: rec['Market'] || rec['market'] || '',
        state: rec['State'] || rec['state'] || detectedState,
        district: rec['District'] || rec['district'] || '',
        commodity: rec['Commodity'] || rec['commodity'] || commodity,
        variety: rec['Variety'] || rec['variety'] || '',
        arrivalDate: normalizedDate,
        minPrice: parseFloat(rec['Min_x0020_Price'] || rec['min_price'] || rec['Min Price'] || '0') || 0,
        modalPrice: parseFloat(rec['Modal_x0020_Price'] || rec['modal_price'] || rec['Modal Price'] || '0') || 0,
        maxPrice: parseFloat(rec['Max_x0020_Price'] || rec['max_price'] || rec['Max Price'] || '0') || 0,
      };
    }).filter((p) => p.market && p.modalPrice > 0);

    // Separate by dates
    const todayPrices = prices.filter((p) => p.arrivalDate === dateRange.today);
    const yesterdayPrices = prices.filter((p) => p.arrivalDate === dateRange.yesterday);
    const recentPrices = prices.filter((p) => dateRange.dates.includes(p.arrivalDate));

    // Determine which prices to show and if we need the warning
    let displayPrices = todayPrices;
    let isNoPricesToday = false;
    let previousDayDate: string | undefined;
    let displayDateLabel = 'today';

    if (todayPrices.length === 0 && yesterdayPrices.length > 0) {
      displayPrices = yesterdayPrices;
      isNoPricesToday = true;
      previousDayDate = dateRange.yesterday;
      displayDateLabel = 'yesterday';
    } else if (todayPrices.length === 0 && yesterdayPrices.length === 0 && recentPrices.length > 0) {
      // Use most recent available data
      const mostRecentDate = recentPrices.reduce((max, p) => p.arrivalDate > max ? p.arrivalDate : max, '');
      displayPrices = recentPrices.filter((p) => p.arrivalDate === mostRecentDate);
      isNoPricesToday = true;
      previousDayDate = mostRecentDate;
      displayDateLabel = mostRecentDate;
    }

    return res.status(200).json({
      prices: displayPrices,
      previousDayPrices: isNoPricesToday ? displayPrices : undefined,
      isNoPricesToday,
      previousDayDate,
      displayDateLabel,
      crop: cropRaw,
      commodityName: commodity,
      cropDisplayName: cropSpecificFields.displayName,
      priceUnit: cropSpecificFields.unit,
      detectedState,
      source: 'agmarknet',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(200).json({
      prices: [],
      crop: cropRaw,
      commodityName: commodity,
      cropDisplayName: cropSpecificFields.displayName,
      detectedState,
      source: 'fallback',
      note: `Could not fetch live prices: ${message}. Visit agmarknet.gov.in for manual price lookup.`,
    });
  }
}
