export interface SoilProperty {
  depth: string;
  value: number;
  unit: string;
}

export interface SoilResponse {
  properties: {
    ph: SoilProperty[];
    organicCarbon: SoilProperty[];
    clay: SoilProperty[];
    sand: SoilProperty[];
    silt: SoilProperty[];
    nitrogen: SoilProperty[];
    bulkDensity: SoilProperty[];
  };
  summaryKeys: {
    ph: string;
    texture: string;
    organicMatter: string;
  };
}

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
}

export interface WeatherDaily {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

export interface WeatherResponse {
  current: WeatherCurrent;
  forecast: WeatherDaily[];
  historicalRainfall: { month: string; precipitation: number }[];
  summaryKey: string;
}

export interface NdviStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  num: number;
  date: number;
}

export interface NdviResponse {
  current: NdviStats | null;
  history: NdviStats[];
  polygonId: string | null;
  captureDate: string;
  error?: string;
}

export interface SatelliteLayer {
  id: string;
  nameKey: string;
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  isEnhanced: boolean;
}

export interface SatelliteResponse {
  layers: SatelliteLayer[];
  defaultLayerId: string;
  centroid: { lat: number; lon: number };
  captureDate: string;
}

// ─── Irrigation Advisory ──────────────────────────────────────────────────────

export interface IrrigationDay {
  date: string;
  expectedRainMm: number;
  et0: number;
  irrigationMm: number;
  advisory: string;
}

export interface IrrigationAdvisory {
  crop: string;
  sowingDate: string;
  daysFromSowing: number;
  growthStage: string;
  days: IrrigationDay[];
  totalIrrigation7Days: number;
  totalRain7Days: number;
  soilNote: string;
}

// ─── Fertilizer Advice ────────────────────────────────────────────────────────

export interface FertilizerStep {
  timing: string;
  fertilizer: string;
  npkGrade: string;
  qtyPerHectare: string;
  method: string;
  notes: string;
}

export interface MicronutrientRec {
  nutrient: string;
  product: string;
  dose: string;
  timing: string;
}

export interface FertilizerAdvice {
  schedule: FertilizerStep[];
  micronutrients: MicronutrientRec[];
  placementGuidance: string;
  organicAmendments: string;
  warnings: string[];
  summary: string;
}

// ─── Gemini Crop Advice (new sowing) ──────────────────────────────────────────

export interface CropAlternative {
  crop: string;
  suitability: string;
  reason: string;
}

export interface GeminiCropAdvice {
  topCrop: string;
  topCropReason: string;
  alternatives: CropAlternative[];
  bestSowingWindow: string;
  keyRisks: string[];
  summary: string;
}

// ─── Mandi Prices ─────────────────────────────────────────────────────────────

export interface MandiPrice {
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

export interface MandiResponse {
  prices: MandiPrice[];
  detectedState: string;
  source: 'agmarknet' | 'fallback';
  note?: string;
}