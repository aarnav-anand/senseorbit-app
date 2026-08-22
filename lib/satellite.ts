import { getCached, setCache, CACHE_TTL } from './cache.js';

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

const ATTRIBUTION =
  'Imagery from Esri, other data from OpenStreetMap contributors · Contains modified Copernicus Sentinel data · Soil data © ISRIC SoilGrids · Weather data © Open-Meteo';

function getRecentDate(daysAgo = 3): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export async function fetchSatellite(lat: number, lon: number): Promise<SatelliteResponse> {
  const cacheKey = `satellite:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached<SatelliteResponse>(cacheKey);
  if (cached) return cached;

  const date = getRecentDate(3);

  const layers: SatelliteLayer[] = [
    {
      id: 'modis-true-color',
      nameKey: 'satellite.layers.modisTrueColor',
      tileUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      attribution: ATTRIBUTION,
      maxZoom: 9,
      isEnhanced: false,
    },
    {
      id: 'modis-ndvi',
      nameKey: 'satellite.layers.modisNdvi',
      tileUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
      attribution: ATTRIBUTION,
      maxZoom: 9,
      isEnhanced: false,
    },
    {
      id: 'esri-imagery',
      nameKey: 'satellite.layers.esriImagery',
      tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: ATTRIBUTION,
      maxZoom: 19,
      isEnhanced: false,
    },
  ];

  const result: SatelliteResponse = {
    layers,
    defaultLayerId: 'esri-imagery',
    centroid: { lat, lon },
    captureDate: date,
  };

  setCache(cacheKey, result, CACHE_TTL.satellite);
  return result;
}
