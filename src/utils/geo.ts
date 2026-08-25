import area from '@turf/area';
import centroid from '@turf/centroid';
import kinks from '@turf/kinks';
import type { Feature, Polygon } from 'geojson';

const HECTARES_PER_SQM = 1 / 10_000;
const ACRES_PER_HECTARE = 2.47105;
const MIN_AREA_HECTARES = 0.001;
// Agromonitoring NDVI API accepts polygons up to 3000 ha.
// Larger polygons are still allowed for the general report, but NDVI will
// be fetched using a clamped 100 ha box centred on the farm centroid.
export const NDVI_MAX_AREA_HECTARES = 3000;

export function analyzePolygon(feature: Feature<Polygon>): {
  areaHectares: number;
  areaAcres: number;
  centroid: [number, number];
  isValid: boolean;
  hasSelfIntersection: boolean;
  isTooSmall: boolean;
  exceedsNdviLimit: boolean;
} {
  const sqMeters = area(feature);
  const areaHectares = sqMeters * HECTARES_PER_SQM;
  const areaAcres = areaHectares * ACRES_PER_HECTARE;
  const center = centroid(feature);
  const [lon, lat] = center.geometry.coordinates;
  const kinkResult = kinks(feature);
  const hasSelfIntersection = kinkResult.features.length > 0;
  const isTooSmall = areaHectares < MIN_AREA_HECTARES;
  const exceedsNdviLimit = areaHectares > NDVI_MAX_AREA_HECTARES;

  return {
    areaHectares,
    areaAcres,
    centroid: [lat, lon],
    isValid: !hasSelfIntersection && !isTooSmall,
    hasSelfIntersection,
    isTooSmall,
    exceedsNdviLimit,
  };
}

export function formatNumber(value: number, locale: string, decimals = 2): string {
  return new Intl.NumberFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatMonth(monthStr: string, locale: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}