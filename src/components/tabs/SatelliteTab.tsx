import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import type { SatelliteResponse } from '../../types/report';
import { useFarmStore } from '../../store/farmStore';

interface SatelliteTabProps {
  data: SatelliteResponse | null;
  error?: string | null;
}

export function SatelliteTab({ data, error }: SatelliteTabProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const boundary = useFarmStore((s) => s.boundary);

  const [activeLayerId, setActiveLayerId] = useState(data?.defaultLayerId ?? '');

  const activeLayer = data
    ? (data.layers.find((l) => l.id === activeLayerId) ?? data.layers[0])
    : null;

  useEffect(() => {
    if (!mapRef.current || !data || !activeLayer) return;

    const { lat, lon } = data.centroid;
    const map = L.map(mapRef.current, {
      center: [lat, lon],
      zoom: 12,
      zoomControl: true,
    });

    const tile = L.tileLayer(activeLayer.tileUrl, {
      attribution: activeLayer.attribution,
      maxZoom: activeLayer.maxZoom,
    }).addTo(map);

    if (boundary?.polygon) {
      const geoLayer = L.geoJSON(boundary.polygon, {
        style: {
          color: '#16a34a',
          weight: 3,
          fillColor: '#22c55e',
          fillOpacity: 0.2,
        },
      }).addTo(map);
      map.fitBounds(geoLayer.getBounds(), { padding: [24, 24] });
    }

    leafletMapRef.current = map;

    return () => {
      tile.remove();
      map.remove();
      leafletMapRef.current = null;
    };
  }, [activeLayer, boundary, data?.centroid]);

  if (error || !data || !activeLayer) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-semibold text-amber-800">{t('satellite.errorTitle', 'Satellite Imagery Unavailable')}</h3>
        <p className="mt-1 text-sm text-amber-700">
          {t('satellite.errorMessage', 'The satellite configuration service is currently down. Please try again later.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-earth-500">{t('satellite.source')}</p>

      <p className="text-sm text-earth-700">
        {t('satellite.captureDate')}: {data.captureDate}
      </p>

      <div>
        <label htmlFor="satellite-layer" className="mb-1 block text-sm font-medium text-earth-800">
          {t('satellite.selectLayer')}
        </label>
        <select
          id="satellite-layer"
          value={activeLayerId}
          onChange={(e) => setActiveLayerId(e.target.value)}
          className="w-full rounded-lg border border-earth-200 bg-white px-3 py-2 text-sm"
        >
          {data.layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {t(layer.nameKey)}
            </option>
          ))}
        </select>
      </div>

      {activeLayer.id === 'modis-ndvi' && (
        <p className="text-sm text-earth-600">{t('satellite.ndviHint')}</p>
      )}

      <div
        ref={mapRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-earth-200 sm:h-80"
      />

      <p className="text-xs text-earth-500">{t('satellite.enhancedNote')}</p>
    </div>
  );
}
