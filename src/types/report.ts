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