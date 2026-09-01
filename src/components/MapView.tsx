import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import type { Feature, Polygon } from 'geojson';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '../store/farmStore';
import { analyzePolygon } from '../utils/geo';
import { LocationSearch } from './LocationSearch';
import { FarmlandPanel } from './FarmlandPanel';
import { IntentModal } from './IntentModal';

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
  onConfirm: (intent: 'new' | 'update', crop?: string, sowingDate?: string) => void;
}

export function MapView({ onConfirm }: MapViewProps) {
  const { t, i18n } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);

  const boundary = useFarmStore((s) => s.boundary);
  const setBoundary = useFarmStore((s) => s.setBoundary);
  const setLocationName = useFarmStore((s) => s.setLocationName);
  const setSowingIntent = useFarmStore((s) => s.setSowingIntent);
  const setSelectedCrop = useFarmStore((s) => s.setSelectedCrop);
  const setSowingDate = useFarmStore((s) => s.setSowingDate);

  const [showIntentModal, setShowIntentModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

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
      setIsDrawing(false);
    },
    [setBoundary],
  );

  // Initialize Map and Geoman Controls together in a single robust useEffect
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = boundary ? boundary.centroid : INDIA_CENTER;
    const initialZoom = boundary ? 15 : DEFAULT_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
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

    // Setup Leaflet-Geoman controls
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
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
      setIsDrawing(false);
    };

    map.on('pm:create', onCreate);
    map.on('pm:edit', onEdit);
    map.on('pm:remove', onRemove);

    mapRef.current = map;

    // Render initial boundary if present (e.g. loaded from saved farm)
    if (boundary?.polygon) {
      const geoLayer = L.geoJSON(boundary.polygon, {
        style: { color: '#16a34a', weight: 3, fillOpacity: 0.25 },
      }).addTo(map);
      const layers = geoLayer.getLayers();
      if (layers.length > 0 && layers[0] instanceof L.Polygon) {
        polygonLayerRef.current = layers[0] as L.Polygon;
      }
    }

    const resizeTimeout = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(resizeTimeout);
      map.off('pm:create', onCreate);
      map.off('pm:edit', onEdit);
      map.off('pm:remove', onRemove);
      map.remove();
      mapRef.current = null;
      polygonLayerRef.current = null;
    };
  }, [boundary, setBoundary, t, updateBoundaryFromLayer]);

  const handleStartDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.pm.enableDraw('Polygon', {
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false,
    });
    setIsDrawing(true);
  }, []);

  const handleStopDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.pm.disableDraw();
    setIsDrawing(false);
  }, []);

  const handleLocationSelect = useCallback(
    (lat: number, lon: number, name: string) => {
      mapRef.current?.setView([lat, lon], 15);
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
    if (mapRef.current) {
      mapRef.current.pm.disableDraw();
    }
    setBoundary(null);
    setIsDrawing(false);
  }, [setBoundary]);

  const handleScanClick = useCallback(() => {
    if (!boundary?.isValid) return;
    setShowIntentModal(true);
  }, [boundary]);

  const handleIntentNewSowing = useCallback(() => {
    setShowIntentModal(false);
    setSowingIntent('new');
    setSelectedCrop(null);
    setSowingDate(null);
    onConfirm('new');
  }, [onConfirm, setSowingIntent, setSelectedCrop, setSowingDate]);

  const handleIntentCropUpdate = useCallback((crop: string, sowingDate: string) => {
    setShowIntentModal(false);
    setSowingIntent('update');
    setSelectedCrop(crop);
    setSowingDate(sowingDate);
    onConfirm('update', crop, sowingDate);
  }, [onConfirm, setSowingIntent, setSelectedCrop, setSowingDate]);

  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-IN';

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-earth-900">{t('map.title')}</h2>
        <p className="mt-1 text-sm text-earth-600">{t('map.subtitle')}</p>
      </div>

      {/* Location Search Bar */}
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

      {/* Prominent Action Toolbar for Drawing */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-field-200 bg-gradient-to-r from-field-50 to-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          {!isDrawing ? (
            <button
              type="button"
              onClick={handleStartDrawing}
              className="inline-flex items-center gap-2 rounded-xl bg-field-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:bg-field-700 transition-all hover:scale-105"
            >
              ✏️ {t('map.startDrawing', 'Draw Farm Polygon')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopDrawing}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-700"
            >
              🛑 {t('map.stopDrawing', 'Stop Drawing')}
            </button>
          )}

          {boundary && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl border border-earth-200 bg-white px-4 py-2.5 text-sm font-semibold text-earth-700 hover:bg-earth-50"
            >
              🗑️ {t('map.clearBoundary')}
            </button>
          )}
        </div>

        <span className="text-xs text-earth-600 font-medium">
          {isDrawing
            ? '👇 Tap on the map to place boundary corners. Click the first point to complete the farm shape.'
            : 'Click "Draw Farm Polygon" to start outlining your field boundary.'}
        </span>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className="h-[52vh] min-h-[350px] w-full overflow-hidden rounded-2xl border border-earth-200 shadow-md sm:h-[58vh]"
        aria-label={t('map.title')}
      />

      {/* Boundary Details & Farmland Action Panel */}
      {boundary && (
        <div className="rounded-2xl border border-earth-200 bg-white p-5 shadow-sm space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-field-50/60 p-3 border border-field-100">
              <span className="text-earth-500 text-xs block">{t('map.area')}:</span>
              <span className="font-bold text-earth-900 text-base">
                {boundary.areaHectares.toLocaleString(locale, { maximumFractionDigits: 2 })}{' '}
                {t('map.hectares')} /{' '}
                {boundary.areaAcres.toLocaleString(locale, { maximumFractionDigits: 2 })}{' '}
                {t('map.acres')}
              </span>
            </div>
            <div className="rounded-xl bg-earth-50 p-3 border border-earth-100">
              <span className="text-earth-500 text-xs block">{t('map.centroid')}:</span>
              <span className="font-bold text-earth-900 text-base">
                {boundary.centroid[0].toFixed(4)}, {boundary.centroid[1].toFixed(4)}
              </span>
            </div>
          </div>

          {!boundary.isValid && (
            <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 font-medium">
              ⚠️ {analyzePolygon(boundary.polygon).hasSelfIntersection
                ? t('map.invalidPolygon')
                : t('map.polygonTooSmall')}
            </p>
          )}

          {boundary.isValid && analyzePolygon(boundary.polygon).exceedsNdviLimit && (
            <p className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 font-medium">
              ℹ️ {t(
                'map.ndviAreaClamped',
                'Your boundary is larger than 3,000 ha. NDVI vegetation data will be sampled from a 100 ha area at the farm centre.',
              )}
            </p>
          )}

          <div>
            <FarmlandPanel onScan={handleScanClick} />
          </div>
        </div>
      )}

      {/* Intent Modal */}
      {showIntentModal && (
        <IntentModal
          onNewSowing={handleIntentNewSowing}
          onCropUpdate={handleIntentCropUpdate}
          onCancel={() => setShowIntentModal(false)}
        />
      )}
    </section>
  );
}