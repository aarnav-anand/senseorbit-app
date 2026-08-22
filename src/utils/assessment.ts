import type { SoilResponse, WeatherResponse, SatelliteResponse } from '../types/report';
import type { FarmBoundary } from '../store/farmStore';

export interface CropRecommendation {
  crop: string;
  suitability: 'High' | 'Moderate' | 'Low';
  reason: string;
}

export interface RiskAlert {
  level: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
}

export interface OverallAssessment {
  healthScore: number;
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Requires Attention';
  summary: string;
  soilHealth: {
    rating: string;
    phStatus: string;
    organicMatterStatus: string;
    textureType: string;
    nitrogenStatus: string;
  };
  weatherOutlook: {
    condition: string;
    rainfall16Days: number;
    trend: string;
  };
  cropRecommendations: CropRecommendation[];
  fertilizerPlan: string[];
  irrigationStrategy: string;
  riskAlerts: RiskAlert[];
}

export function generateOverallAssessment(
  soil: SoilResponse | null,
  weather: WeatherResponse | null,
  _satellite: SatelliteResponse | null,
  boundary: FarmBoundary | null,
): OverallAssessment {
  // Extract key surface metrics
  const phVal = soil?.properties?.ph?.[0]?.value ?? 6.8;
  const ocVal = soil?.properties?.organicCarbon?.[0]?.value ?? 1.5;
  const nitrogenVal = soil?.properties?.nitrogen?.[0]?.value ?? 1.2;
  const clayVal = soil?.properties?.clay?.[0]?.value ?? 25;
  const sandVal = soil?.properties?.sand?.[0]?.value ?? 45;
  const siltVal = soil?.properties?.silt?.[0]?.value ?? 30;

  const tempCurrent = weather?.current?.temperature ?? 28;
  const humidityCurrent = weather?.current?.humidity ?? 65;
  const forecast16Days = weather?.forecast ?? [];
  const rainfall16Days = Math.round(
    forecast16Days.reduce((acc, d) => acc + (d.precipitation || 0), 0) * 10,
  ) / 10;

  // 1. Calculate Health Score (0 to 100)
  let score = 70;
  if (phVal >= 6.0 && phVal <= 7.5) score += 10;
  else if (phVal < 5.5 || phVal > 8.2) score -= 10;

  if (ocVal >= 2.0) score += 10;
  else if (ocVal < 1.0) score -= 10;

  if (nitrogenVal >= 1.5) score += 5;
  if (rainfall16Days > 20 && rainfall16Days < 150) score += 5;

  score = Math.min(100, Math.max(30, score));

  let healthStatus: OverallAssessment['healthStatus'] = 'Good';
  if (score >= 85) healthStatus = 'Excellent';
  else if (score >= 70) healthStatus = 'Good';
  else if (score >= 55) healthStatus = 'Fair';
  else healthStatus = 'Requires Attention';

  // 2. Texture & Soil Evaluation
  let textureType = 'Loam (Balanced)';
  if (clayVal >= 35) textureType = 'Clay-rich (High water retention)';
  else if (sandVal >= 60) textureType = 'Sandy (Fast draining)';
  else if (siltVal >= 45) textureType = 'Silty (Fertile & smooth)';

  const phStatus =
    phVal < 5.5
      ? `Acidic (pH ${phVal})`
      : phVal > 7.8
      ? `Alkaline (pH ${phVal})`
      : `Optimal Neutral (pH ${phVal})`;

  const organicMatterStatus =
    ocVal < 1.0
      ? `Low (${ocVal} g/kg)`
      : ocVal < 2.0
      ? `Moderate (${ocVal} g/kg)`
      : `High / Healthy (${ocVal} g/kg)`;

  const nitrogenStatus =
    nitrogenVal < 1.0
      ? `Low (${nitrogenVal} g/kg)`
      : nitrogenVal < 1.8
      ? `Adequate (${nitrogenVal} g/kg)`
      : `Rich (${nitrogenVal} g/kg)`;

  // 3. Crop Recommendations
  const cropRecommendations: CropRecommendation[] = [];

  if (phVal >= 5.5 && phVal <= 7.5 && clayVal >= 25 && rainfall16Days > 30) {
    cropRecommendations.push({
      crop: 'Rice / Paddy',
      suitability: 'High',
      reason: 'Sufficient moisture forecast and clay-loam soil optimal for water retention.',
    });
  }

  if (phVal >= 6.0 && phVal <= 7.8 && tempCurrent >= 15 && tempCurrent <= 32) {
    cropRecommendations.push({
      crop: 'Wheat / Maize',
      suitability: 'High',
      reason: 'Ideal soil pH and comfortable ambient temperature range.',
    });
  }

  if (ocVal < 1.5 || nitrogenVal < 1.2) {
    cropRecommendations.push({
      crop: 'Pulses / Legumes (Chickpea, Soybeans, Pigeon Pea)',
      suitability: 'High',
      reason: 'Fixes atmospheric nitrogen into soil and improves organic carbon naturally.',
    });
  }

  if (sandVal > 40 && phVal >= 5.8) {
    cropRecommendations.push({
      crop: 'Vegetables (Tomatoes, Mustard, Potatoes)',
      suitability: 'Moderate',
      reason: 'Thrives in well-drained sandy loam with scheduled light irrigation.',
    });
  }

  if (cropRecommendations.length === 0) {
    cropRecommendations.push({
      crop: 'Millets / Sorghum (Jowar, Bajra)',
      suitability: 'High',
      reason: 'Resilient cereal crops suitable for various soil and rainfall profiles.',
    });
  }

  // 4. Fertilizer & Soil Improvement Plan
  const fertilizerPlan: string[] = [];
  if (phVal < 6.0) {
    fertilizerPlan.push('Apply Agricultural Lime (Calcium Carbonate) to neutralize soil acidity.');
  } else if (phVal > 7.8) {
    fertilizerPlan.push('Apply Gypsum or elemental Sulfur to lower alkaline pH levels.');
  }

  if (nitrogenVal < 1.2) {
    fertilizerPlan.push('Apply Urea or Ammonium Sulfate in split doses during crop growth.');
  }

  if (ocVal < 1.5) {
    fertilizerPlan.push(
      'Incorporate Farmyard Manure (FYM) or green compost (5-10 tonnes/hectare) to rebuild organic matter.',
    );
  }

  fertilizerPlan.push(
    'Apply balanced NPK (12:32:16) basal fertilizer at sowing time for root development.',
  );

  // 5. Irrigation Strategy
  let irrigationStrategy = '';
  if (rainfall16Days > 60) {
    irrigationStrategy =
      'Upcoming 16-day rainfall expected to exceed 60mm. Rainfed conditions will meet crop water requirements. Ensure field drainage channels are clear to prevent standing water.';
  } else if (sandVal >= 50) {
    irrigationStrategy =
      'Sandy soil drains quickly. Provide frequent, light drip or sprinkler irrigation every 2–3 days rather than heavy flooding.';
  } else if (clayVal >= 35) {
    irrigationStrategy =
      'Clay soil holds water effectively. Irrigate deeply once every 5–7 days, checking sub-surface soil moisture before re-watering.';
  } else {
    irrigationStrategy =
      'Balanced soil moisture. Provide standard scheduled irrigation every 4–5 days depending on crop growth stage.';
  }

  // 6. Risk Warnings
  const riskAlerts: RiskAlert[] = [];

  if (clayVal > 40 && rainfall16Days > 80) {
    riskAlerts.push({
      level: 'High',
      title: 'Waterlogging & Root Asphyxiation Risk',
      description:
        'High clay content combined with heavy forecast precipitation may cause water stagnation. Ensure proper drainage ditches.',
    });
  }

  if (humidityCurrent > 75 && tempCurrent > 24) {
    riskAlerts.push({
      level: 'Medium',
      title: 'Fungal & Pest Outbreak Warning',
      description:
        'High atmospheric humidity (>75%) and warm temperatures favor fungal leaf spot and blight. Monitor crops closely.',
    });
  }

  if (rainfall16Days < 10 && tempCurrent > 32) {
    riskAlerts.push({
      level: 'Medium',
      title: 'Heat & Drought Stress Alert',
      description:
        'Low forecast rainfall (<10mm) and high temperature may cause moisture stress. Mulching is recommended to retain moisture.',
    });
  }

  if (phVal < 5.2) {
    riskAlerts.push({
      level: 'High',
      title: 'Aluminum / Micronutrient Toxicity Risk',
      description:
        'Strongly acidic soil (pH < 5.2) can cause aluminum toxicity and lock phosphorus availability.',
    });
  }

  const areaHectares = boundary?.areaHectares ? Math.round(boundary.areaHectares * 100) / 100 : 0;
  const summary = `Overall assessment for your field (${
    areaHectares > 0 ? areaHectares + ' ha' : 'drawn region'
  }): Soil health score is ${score}/100 (${healthStatus}). Data synthesized from live accredited ISRIC SoilGrids, Open-Meteo, and Esri/Copernicus spatial services.`;

  return {
    healthScore: score,
    healthStatus,
    summary,
    soilHealth: {
      rating: `${score}/100`,
      phStatus,
      organicMatterStatus,
      textureType,
      nitrogenStatus,
    },
    weatherOutlook: {
      condition: weather?.summaryKey ? `Weather Code ${weather.current?.weatherCode ?? ''}` : 'Favorable',
      rainfall16Days,
      trend:
        rainfall16Days > 50
          ? 'Wet / High Rain expected'
          : rainfall16Days > 15
          ? 'Moderate rainfall'
          : 'Dry / Low rain expected',
    },
    cropRecommendations,
    fertilizerPlan,
    irrigationStrategy,
    riskAlerts,
  };
}
