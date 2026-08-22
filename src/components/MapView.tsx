import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import type { Feature, Polygon } from 'geojson';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '../store/farmStore';
import { analyzePolygon } from '../utils/geo';
import { LocationSearch } from './LocationSearch';

const INDIA_CENTER: L.LatLngExpression = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

const ATTRIBUTION =
  'Imagery from Esri, other data from OpenStreetMap contributors · Contains modified Copernicus Sentinel data · Soil data © ISRIC SoilGrids · Weather data © Open-Meteo';

function layerToFeature(layer: L.Layer): Feature<Polygon> | null {
  if (!(layer instanceof L.Polygon)) return null;
  const geo = layer.toGeoJSON();
  if (geo.type !== 'Feature' || geo.geometry.type !== 'Polygon') return null;
  return geo as Feature<Polygon>;
}

interface MapViewProps {
  onConfirm: () => void;
}

export function MapView({ onConfirm }: MapViewProps) {
  const { t, i18n } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const geomanInitialized = useRef(false);
  const boundary = useFarmStore((s) => s.boundary);
  const setBoundary = useFarmStore((s) => s.setBoundary);
  const setLocationName = useFarmStore((s) => s.setLocationName);

  const updateBoundaryFromLayer = useCallback(
    (layer: L.Layer) => {
      if (polygonLayerRef.current && polygonLayerRef.current !== layer) {
        if (polygonLayerRef.current.pm) polygonLayerRef.current.pm.disable();
        mapRef.current?.removeLayer(polygonLayerRef.current);
      }

      const feature = layerToFeature(layer);
      if (!feature) return;

      polygonLayerRef.current = layer as L.Polygon;
      const analysis = analyzePolygon(feature);

      setBoundary({
        polygon: feature,
        areaHectares: analysis.areaHectares,
        areaAcres: analysis.areaAcres,
        centroid: analysis.centroid,
        isValid: analysis.isValid,
      });
    },
    [setBoundary],
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: INDIA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ATTRIBUTION,
      maxZoom: 19,
    });

    const esriLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: ATTRIBUTION,
        maxZoom: 19,
      },
    );

    osmLayer.addTo(map);
    L.control
      .layers(
        { [t('map.basemap.street')]: osmLayer, [t('map.basemap.satellite')]: esriLayer },
        {},
        { collapsed: true },
      )
      .addTo(map);

    mapRef.current = map;

    const resizeTimeout = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(resizeTimeout);
      map.remove();
      mapRef.current = null;
      geomanInitialized.current = false;
      polygonLayerRef.current = null;
    };
  }, [t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || geomanInitialized.current) return;

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawText: false,
      drawPolygon: true,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });

    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false,
    });

    const onCreate = (e: { layer: L.Layer }) => {
      updateBoundaryFromLayer(e.layer);
    };

    const onEdit = (e: { layer: L.Layer }) => {
      updateBoundaryFromLayer(e.layer);
    };

    const onRemove = () => {
      polygonLayerRef.current = null;
      setBoundary(null);
    };

    map.on('pm:create', onCreate);
    map.on('pm:edit', onEdit);
    map.on('pm:remove', onRemove);

    geomanInitialized.current = true;

    return () => {
      map.off('pm:create', onCreate);
      map.off('pm:edit', onEdit);
      map.off('pm:remove', onRemove);
      map.pm.removeControls();
      geomanInitialized.current = false;
    };
  }, [setBoundary, updateBoundaryFromLayer]);

  const handleLocationSelect = useCallback(
    (lat: number, lon: number, name: string) => {
      mapRef.current?.setView([lat, lon], 14);
      setLocationName(name);
    },
    [setLocationName],
  );

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert(t('map.locationError'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 16);
      },
      () => alert(t('map.locationDenied')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [t]);

  const handleClear = useCallback(() => {
    if (polygonLayerRef.current) {
      if (polygonLayerRef.current.pm) polygonLayerRef.current.pm.disable();
      mapRef.current?.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    setBoundary(null);
  }, [setBoundary]);

  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-IN';

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-earth-900">{t('map.title')}</h2>
        <p className="mt-1 text-sm text-earth-600">{t('map.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <LocationSearch onSelect={handleLocationSelect} />
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="shrink-0 rounded-lg border border-earth-200 bg-white px-4 py-2 text-sm font-medium text-earth-800 hover:bg-earth-50"
        >
          {t('map.useMyLocation')}
        </button>
      </div>

      <p className="text-xs text-earth-500">{t('map.drawHint')}</p>

      <div
        ref={mapContainerRef}
        className="h-[50vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-earth-200 shadow-sm sm:h-[55vh]"
        aria-label={t('map.title')}
      />

      {boundary && (
        <div className="rounded-xl border border-earth-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <span className="text-earth-500">{t('map.area')}: </span>
              <span className="font-medium">
                {boundary.areaHectares.toLocaleString(locale, { maximumFractionDigits: 2 })}{' '}
                {t('map.hectares')} /{' '}
                {boundary.areaAcres.toLocaleString(locale, { maximumFractionDigits: 2 })}{' '}
                {t('map.acres')}
              </span>
            </div>
            <div>
              <span className="text-earth-500">{t('map.centroid')}: </span>
              <span className="font-medium">
                {boundary.centroid[0].toFixed(4)}, {boundary.centroid[1].toFixed(4)}
              </span>
            </div>
          </div>

          {!boundary.isValid && (
            <p className="mt-2 text-sm text-amber-700">
              {analyzePolygon(boundary.polygon).hasSelfIntersection
                ? t('map.invalidPolygon')
                : t('map.polygonTooSmall')}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={!boundary.isValid}
              className="rounded-lg bg-field-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-field-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('map.confirmBoundary')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-earth-200 px-5 py-2.5 text-sm font-medium text-earth-700 hover:bg-earth-50"
            >
              {t('map.clearBoundary')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
