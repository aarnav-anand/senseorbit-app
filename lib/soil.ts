import { getCached, setCache, CACHE_TTL } from './cache.js';

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

const SOILGRIDS_PROPERTIES = 'phh2o,ocd,clay,sand,silt,nitrogen,bdod';
const DEPTHS = '0-5cm,5-15cm,15-30cm';

function convertValue(property: string, rawValue: number): number {
  switch (property) {
    case 'phh2o':
      return Math.round((rawValue / 10) * 100) / 100;
    case 'ocd':
      return Math.round((rawValue / 10) * 100) / 100;
    case 'clay':
    case 'sand':
    case 'silt':
      return Math.round((rawValue / 10) * 10) / 10;
    case 'nitrogen':
      return Math.round((rawValue / 100) * 100) / 100;
    case 'bdod':
      return Math.round((rawValue / 100) * 100) / 100;
    default:
      return rawValue;
  }
}

function getUnit(property: string): string {
  const units: Record<string, string> = {
    phh2o: 'pH',
    ocd: 'g/kg',
    clay: '%',
    sand: '%',
    silt: '%',
    nitrogen: 'g/kg',
    bdod: 'kg/dm³',
  };
  return units[property] ?? '';
}

function classifyPh(ph: number): string {
  if (ph < 5.5) return 'soil.summary.ph.acidic';
  if (ph < 6.5) return 'soil.summary.ph.slightlyAcidic';
  if (ph < 7.5) return 'soil.summary.ph.neutral';
  if (ph < 8.5) return 'soil.summary.ph.slightlyAlkaline';
  return 'soil.summary.ph.alkaline';
}

function classifyTexture(clay: number, sand: number, silt: number): string {
  if (clay >= 40) return 'soil.summary.texture.clay';
  if (sand >= 70) return 'soil.summary.texture.sandy';
  if (silt >= 50) return 'soil.summary.texture.silty';
  if (clay >= 27 && sand >= 20 && sand <= 45) return 'soil.summary.texture.clayLoam';
  if (sand >= 43 && clay < 20) return 'soil.summary.texture.loamySand';
  return 'soil.summary.texture.loam';
}

function classifyOrganicMatter(oc: number): string {
  if (oc < 1) return 'soil.summary.organic.low';
  if (oc < 2) return 'soil.summary.organic.moderate';
  return 'soil.summary.organic.high';
}

async function fetchWithTimeout(url: string, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function fetchSoil(lat: number, lon: number): Promise<SoilResponse> {
  const cacheKey = `soil:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  const cached = getCached<SoilResponse>(cacheKey);
  if (cached) return cached;

  const url = new URL('https://rest.isric.org/soilgrids/v2.0/properties/query');
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('property', SOILGRIDS_PROPERTIES);
  url.searchParams.set('depth', DEPTHS);
  url.searchParams.set('value', 'mean');

  const res = await fetchWithTimeout(url.toString(), 4000);

  if (!res.ok) {
    throw new Error(`SoilGrids API error: ${res.status}`);
  }

  const data = await res.json();
  const layers = data.properties?.layers ?? [];

  const parseLayer = (name: string): SoilProperty[] => {
    const layer = layers.find((l: { name: string }) => l.name === name);
    if (!layer?.depths) return [];
    return layer.depths.map(
      (d: { label: string; values: { mean: number } }) => ({
        depth: d.label,
        value: convertValue(name, d.values.mean),
        unit: getUnit(name),
      }),
    );
  };

  const ph = parseLayer('phh2o');
  const organicCarbon = parseLayer('ocd');
  const clay = parseLayer('clay');
  const sand = parseLayer('sand');
  const silt = parseLayer('silt');
  const nitrogen = parseLayer('nitrogen');
  const bulkDensity = parseLayer('bdod');

  const surfacePh = ph[0]?.value ?? 6.8;
  const surfaceClay = clay[0]?.value ?? 25;
  const surfaceSand = sand[0]?.value ?? 45;
  const surfaceSilt = silt[0]?.value ?? 30;
  const surfaceOc = organicCarbon[0]?.value ?? 1.5;

  const result: SoilResponse = {
    properties: {
      ph,
      organicCarbon,
      clay,
      sand,
      silt,
      nitrogen,
      bulkDensity,
    },
    summaryKeys: {
      ph: classifyPh(surfacePh),
      texture: classifyTexture(surfaceClay, surfaceSand, surfaceSilt),
      organicMatter: classifyOrganicMatter(surfaceOc),
    },
  };

  setCache(cacheKey, result, CACHE_TTL.soil);
  return result;
}
