import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import type { SatelliteResponse, NdviResponse } from '../../types/report';
import { useFarmStore } from '../../store/farmStore';

interface SatelliteTabProps {
  data: SatelliteResponse | null;
  error?: string | null;
}

function getNdviColor(mean: number): string {
  if (mean >= 0.6) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (mean >= 0.4) return 'text-field-700 bg-field-50 border-field-200';
  if (mean >= 0.2) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function NdviPanel({ ndvi }: { ndvi: NdviResponse }) {
  const { t } = useTranslation();

  if (ndvi.error && !ndvi.current) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs text-amber-700">
          {t('ndvi.unavailable', 'NDVI data unavailable')}: {ndvi.error}
        </p>
      </div>
    );
  }

  if (!ndvi.current) return null;

  const c = ndvi.current;
  const colorClass = getNdviColor(c.mean);
  const captureLabel = new Date(c.date * 1000).toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-earth-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-earth-100 pb-3">
        <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <div>
          <h4 className="font-bold text-earth-900 text-sm">
            {t('ndvi.title', 'NDVI — Vegetation Index')}
          </h4>
          <p className="text-xs text-earth-500">
            {t('ndvi.source', 'Source: Agromonitoring (Sentinel-2 / Landsat)')} · {captureLabel}
          </p>
        </div>
      </div>

      {/* Main score */}
      <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${colorClass}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
            {t('ndvi.meanLabel', 'Mean NDVI')}
          </p>
          <p className="text-2xl font-extrabold">{c.mean.toFixed(3)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold">{t('ndvi.range', 'Range')}</p>
          <p className="text-sm font-medium">{c.min.toFixed(3)} – {c.max.toFixed(3)}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-earth-50 p-2 border border-earth-100">
          <p className="text-earth-500 font-medium">P25</p>
          <p className="font-bold text-earth-800">{c.p25.toFixed(3)}</p>
        </div>
        <div className="rounded-lg bg-earth-50 p-2 border border-earth-100">
          <p className="text-earth-500 font-medium">{t('ndvi.median', 'Median')}</p>
          <p className="font-bold text-earth-800">{c.median.toFixed(3)}</p>
        </div>
        <div className="rounded-lg bg-earth-50 p-2 border border-earth-100">
          <p className="text-earth-500 font-medium">P75</p>
          <p className="font-bold text-earth-800">{c.p75.toFixed(3)}</p>
        </div>
      </div>

      {/* History sparkline */}
      {ndvi.history.length > 1 && (
        <div>
          <p className="text-xs font-medium text-earth-600 mb-1.5">
            {t('ndvi.historyLabel', '60-Day NDVI History')}
          </p>
          <div className="flex items-end gap-1 h-10">
            {ndvi.history.slice(-12).map((h, i) => {
              const pct = Math.max(0, Math.min(1, (h.mean + 0.2) / 1.2));
              const heightPx = Math.round(pct * 40);
              return (
                <div
                  key={i}
                  title={`${new Date(h.date * 1000).toISOString().slice(0, 10)}: ${h.mean.toFixed(3)}`}
                  style={{ height: `${heightPx}px` }}
                  className={`flex-1 rounded-sm ${h.mean >= 0.4 ? 'bg-emerald-400' : h.mean >= 0.2 ? 'bg-amber-400' : 'bg-red-400'}`}
                />
              );
            })}
          </div>
          <p className="text-xs text-earth-400 mt-1">
            {new Date(ndvi.history[0].date * 1000).toISOString().slice(0, 10)}
            {' → '}
            {new Date(ndvi.history[ndvi.history.length - 1].date * 1000).toISOString().slice(0, 10)}
          </p>
        </div>
      )}

      <p className="text-xs text-earth-400">
        {t('ndvi.scaleHint', 'Scale: −1 (water/bare) → 0 (no vegetation) → 1 (dense canopy)')}
      </p>
    </div>
  );
}

export function SatelliteTab({ data, error }: SatelliteTabProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const boundary = useFarmStore((s) => s.boundary);
  const ndvi = useFarmStore((s) => s.ndvi);

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
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-800">{t('satellite.errorTitle', 'Satellite Imagery Unavailable')}</h3>
          <p className="mt-1 text-sm text-amber-700">
            {t('satellite.errorMessage', 'The satellite configuration service is currently down. Please try again later.')}
          </p>
        </div>
        {ndvi && <NdviPanel ndvi={ndvi} />}
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

      {ndvi && <NdviPanel ndvi={ndvi} />}
    </div>
  );
}