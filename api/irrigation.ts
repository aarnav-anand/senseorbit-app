import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crop peak water requirements in mm/day at peak demand
const CROP_WATER_REQ: Record<string, number> = {
  'rice': 6.0, 'paddy': 6.0, 'rice/paddy': 6.0,
  'wheat': 4.0,
  'cotton': 5.0,
  'sugarcane': 6.5,
  'soybean': 4.5,
  'maize': 5.0, 'corn': 5.0,
  'groundnut': 4.5, 'peanut': 4.5,
  'sunflower': 4.5,
  'onion': 3.5,
  'tomato': 4.5,
  'chickpea': 3.0,
  'mustard': 3.5,
  'jowar': 3.5, 'sorghum': 3.5,
  'bajra': 3.0, 'pearl millet': 3.0,
  'lentil': 3.0, 'masoor': 3.0,
  'moong': 3.5, 'mung dal': 3.5,
  'tur': 4.0, 'arhar': 4.0, 'pigeon pea': 4.0,
};

interface GrowthStageInfo {
  stage: string;
  kcMultiplier: number;   // Crop coefficient (Kc) × fraction-of-peak-ETc
  demandFraction: number; // fraction of peak water demand
}

function getGrowthStage(daysFromSowing: number, isHindi: boolean): GrowthStageInfo {
  if (daysFromSowing <= 20) return { stage: isHindi ? 'स्थापना चरण (Establishment)' : 'Establishment', kcMultiplier: 0.4, demandFraction: 0.5 };
  if (daysFromSowing <= 45) return { stage: isHindi ? 'वानस्पतिक विकास (Vegetative)' : 'Vegetative', kcMultiplier: 0.75, demandFraction: 0.75 };
  if (daysFromSowing <= 90) return { stage: isHindi ? 'फूल/प्रजनन चरण (Reproductive)' : 'Reproductive', kcMultiplier: 1.1, demandFraction: 1.0 };
  if (daysFromSowing <= 120) return { stage: isHindi ? 'दाने भरने का चरण (Grain Filling)' : 'Grain Filling', kcMultiplier: 0.9, demandFraction: 0.85 };
  return { stage: isHindi ? 'परिपक्वता चरण (Maturity)' : 'Maturity', kcMultiplier: 0.5, demandFraction: 0.6 };
}

function getCropWaterReq(crop: string): number {
  const normalized = crop.toLowerCase().trim();
  return CROP_WATER_REQ[normalized] ?? 4.5;
}

function buildAdvisory(irrigationMm: number, rainMm: number, isHindi: boolean): string {
  if (isHindi) {
    if (irrigationMm === 0 && rainMm >= 5) return 'पर्याप्त वर्षा की संभावना। सिंचाई की आवश्यकता नहीं है।';
    if (irrigationMm === 0) return 'आज सिंचाई की आवश्यकता नहीं है।';
    if (irrigationMm < 8) return 'हल्की सिंचाई की सिफारिश की जाती है (स्प्रिंकलर या ड्रिप का उपयोग करें)।';
    if (irrigationMm < 18) return 'मध्यम सिंचाई की आवश्यकता है (ड्रिप या फ्लड विधि का उपयोग करें)।';
    return 'भारी सिंचाई की आवश्यकता है। पर्याप्त जल आपूर्ति सुनिश्चित करें और 2 बार में पानी दें।';
  }
  if (irrigationMm === 0 && rainMm >= 5) return 'Sufficient rainfall expected. Skip irrigation.';
  if (irrigationMm === 0) return 'No irrigation needed today.';
  if (irrigationMm < 8) return 'Light irrigation recommended. Use sprinkler or drip.';
  if (irrigationMm < 18) return 'Moderate irrigation required. Use drip or flood method.';
  return 'Heavy irrigation required. Ensure adequate water supply and apply in 2 passes.';
}

function buildSoilNote(bulkDensity?: number, organicCarbon?: number, isHindi?: boolean): string {
  if (bulkDensity == null) {
    return isHindi
      ? 'मिट्टी के घनत्व का डेटा उपलब्ध नहीं है। अपनी मिट्टी के प्रकार के लिए मानक सिंचाई अंतराल लागू करें।'
      : 'Soil density data unavailable. Apply standard irrigation intervals for your soil type.';
  }
  let note = '';
  if (bulkDensity < 1.2) {
    note = isHindi
      ? 'उच्च सरंध्रता वाली ढीली मिट्टी। गहरा पानी बहने से रोकने के लिए बार-बार हल्की सिंचाई (हर 2-3 दिन में) करें।'
      : 'Loose soil with excellent water infiltration and high porosity. Apply frequent, lighter irrigations (every 2-3 days) to avoid deep percolation losses.';
  } else if (bulkDensity <= 1.5) {
    note = isHindi
      ? 'अच्छी संरचना वाली मध्यम मिट्टी। मानक सिंचाई अंतराल लागू होते हैं (फसल चरण के आधार पर हर 3-5 दिन में)।'
      : 'Moderate soil density with good structure. Standard irrigation intervals apply (every 3-5 days depending on crop stage).';
  } else {
    note = isHindi
      ? 'सघन मिट्टी पाई गई (BD > 1.5 kg/dm³)। सतह से पानी बहने का उच्च जोखिम - 2 बार में धीरे-धीरे पानी दें।'
      : 'Compacted soil detected (BD > 1.5 kg/dm³). High risk of surface runoff — apply water slowly in 2 passes. Consider sub-soiling to improve infiltration.';
  }
  if (organicCarbon != null) {
    if (organicCarbon < 1.0) {
      note += isHindi
        ? ' कम कार्बनिक पदार्थ पानी धारण क्षमता को घटाता है - गोबर खाद/कम्पोस्ट जोड़ें।'
        : ' Low organic carbon reduces water retention — consider adding FYM/compost to improve soil moisture holding capacity.';
    } else if (organicCarbon >= 2.0) {
      note += isHindi
        ? ' अच्छा कार्बनिक पदार्थ नमी बनाए रखता है; आप सिंचाई अंतराल थोड़ा बढ़ा सकते हैं।'
        : ' Good organic carbon content improves water holding; you may be able to extend irrigation intervals slightly.';
    }
  }
  return note;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = parseFloat(String(req.query.lat ?? ''));
  const lon = parseFloat(String(req.query.lon ?? ''));
  const crop = String(req.query.crop ?? '');
  const sowingDate = String(req.query.sowingDate ?? '');
  const locale = String(req.query.locale ?? 'en');
  const isHindi = locale.startsWith('hi');

  const bulkDensity = req.query.bulkDensity != null ? parseFloat(String(req.query.bulkDensity)) : undefined;
  const organicCarbon = req.query.organicCarbon != null ? parseFloat(String(req.query.organicCarbon)) : undefined;

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  if (!crop) return res.status(400).json({ error: 'crop is required' });
  if (!sowingDate) return res.status(400).json({ error: 'sowingDate is required' });

  const sowingTs = new Date(sowingDate).getTime();
  if (Number.isNaN(sowingTs)) return res.status(400).json({ error: 'Invalid sowingDate format. Use YYYY-MM-DD.' });

  const daysFromSowing = Math.floor((Date.now() - sowingTs) / (1000 * 60 * 60 * 24));
  const { stage, kcMultiplier, demandFraction } = getGrowthStage(daysFromSowing, isHindi);
  const peakWaterReq = getCropWaterReq(crop);

  // Fetch 7-day forecast from Open-Meteo (precipitation + ET0)
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(lat));
  forecastUrl.searchParams.set('longitude', String(lon));
  forecastUrl.searchParams.set('daily', 'precipitation_sum,et0_fao_evapotranspiration');
  forecastUrl.searchParams.set('forecast_days', '7');
  forecastUrl.searchParams.set('timezone', 'auto');

  let forecastData: {
    daily: { time: string[]; precipitation_sum: number[]; et0_fao_evapotranspiration: number[] };
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const forecastRes = await fetch(forecastUrl.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!forecastRes.ok) throw new Error(`Open-Meteo error ${forecastRes.status}`);
    forecastData = await forecastRes.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Weather fetch failed';
    return res.status(502).json({ error: `Failed to fetch weather forecast: ${msg}` });
  }

  const days = forecastData.daily.time.map((date, i) => {
    const expectedRainMm = Math.max(0, forecastData.daily.precipitation_sum[i] ?? 0);
    const et0 = Math.max(0, forecastData.daily.et0_fao_evapotranspiration[i] ?? 4.0);

    // Crop ETc = ET0 × Kc (crop coefficient based on growth stage)
    const cropETc = et0 * kcMultiplier;

    // Also compute from base demand (cross-check)
    const demandBasedReq = peakWaterReq * demandFraction;

    // Use the higher of the two methods as a conservative estimate
    const effectiveDemand = Math.max(cropETc, demandBasedReq * 0.7);

    const irrigationMm = Math.max(0, Math.round((effectiveDemand - expectedRainMm) * 10) / 10);

    return {
      date,
      expectedRainMm: Math.round(expectedRainMm * 10) / 10,
      et0: Math.round(et0 * 10) / 10,
      irrigationMm,
      advisory: buildAdvisory(irrigationMm, expectedRainMm, isHindi),
    };
  });

  const totalIrrigation7Days = Math.round(days.reduce((s, d) => s + d.irrigationMm, 0) * 10) / 10;
  const totalRain7Days = Math.round(days.reduce((s, d) => s + d.expectedRainMm, 0) * 10) / 10;

  return res.status(200).json({
    crop,
    sowingDate,
    daysFromSowing,
    growthStage: stage,
    days,
    totalIrrigation7Days,
    totalRain7Days,
    soilNote: buildSoilNote(bulkDensity, organicCarbon, isHindi),
  });
}
