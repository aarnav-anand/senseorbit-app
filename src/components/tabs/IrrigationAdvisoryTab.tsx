import { useTranslation } from 'react-i18next';
import type { IrrigationAdvisory } from '../../types/report';

interface IrrigationAdvisoryTabProps {
  data: IrrigationAdvisory | null;
  loading: boolean;
  error: string | null;
}

function GrowthStageBadge({ stage }: { stage: string }) {
  const colorMap: Record<string, string> = {
    Establishment: 'bg-amber-100 text-amber-800 border-amber-200',
    Vegetative: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Reproductive: 'bg-field-100 text-field-800 border-field-200',
    'Grain Filling': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Maturity: 'bg-earth-100 text-earth-700 border-earth-200',
  };
  const cls = colorMap[stage] ?? 'bg-earth-100 text-earth-700 border-earth-200';
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {stage}
    </span>
  );
}

function IrrigationBar({ mm, maxMm }: { mm: number; maxMm: number }) {
  const pct = maxMm > 0 ? Math.min(100, (mm / maxMm) * 100) : 0;
  const color = mm === 0 ? 'bg-emerald-400' : mm < 10 ? 'bg-field-400' : mm < 20 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-earth-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-earth-900">{mm.toFixed(1)} mm</span>
    </div>
  );
}

export function IrrigationAdvisoryTab({ data, loading, error }: IrrigationAdvisoryTabProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm font-medium text-earth-700">
            {t('irrigation.loading')}
          </p>
          <p className="text-xs text-earth-500">Open-Meteo · SoilGrids · NDVI</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-800">⚠️ {error}</p>
        <p className="mt-2 text-xs text-red-600">
          {t('irrigation.errorNote')}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-earth-200 bg-earth-50 p-6 text-center">
        <p className="text-sm text-earth-600">
          {t('irrigation.noData')}
        </p>
      </div>
    );
  }

  const maxIrrigation = Math.max(...data.days.map((d) => d.irrigationMm), 1);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
              <span>💧</span> 7-Day Irrigation Advisory
            </div>
            <h3 className="mt-2 text-xl font-bold text-earth-900">
              {data.crop}
            </h3>
            <p className="text-sm text-earth-500">
              Sown: {new Date(data.sowingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' '}· {data.daysFromSowing} days ago
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <GrowthStageBadge stage={data.growthStage} />
            <div className="flex gap-3 text-xs text-earth-600">
              <span>🌧️ Total Rain: <strong>{data.totalRain7Days.toFixed(1)} mm</strong></span>
              <span>💧 Total Need: <strong>{data.totalIrrigation7Days.toFixed(1)} mm</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Soil Note */}
      {data.soilNote && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">🪱 Soil Note:</span> {data.soilNote}
        </div>
      )}

      {/* Day-by-Day Table */}
      <div className="rounded-xl border border-earth-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-earth-100 px-5 py-3">
          <h4 className="font-bold text-earth-900">📅 7-Day Irrigation Schedule</h4>
          <p className="text-xs text-earth-500 mt-0.5">
            Source: Open-Meteo precipitation forecast · SoilGrids · NDVI
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-earth-100 bg-earth-50 text-left text-xs font-semibold uppercase tracking-wider text-earth-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Expected Rain</th>
                <th className="px-4 py-3">ET₀</th>
                <th className="px-4 py-3">Irrigation Needed</th>
                <th className="px-4 py-3">Advisory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-50">
              {data.days.map((day, i) => (
                <tr key={i} className={`hover:bg-earth-50/50 ${i === 0 ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-earth-900">
                    {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {i === 0 && <span className="ml-1 text-xs text-blue-600 font-semibold">(Today)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${day.expectedRainMm > 5 ? 'text-blue-700' : 'text-earth-600'}`}>
                      {day.expectedRainMm.toFixed(1)} mm
                    </span>
                  </td>
                  <td className="px-4 py-3 text-earth-600">{day.et0.toFixed(1)} mm</td>
                  <td className="px-4 py-3">
                    <IrrigationBar mm={day.irrigationMm} maxMm={maxIrrigation} />
                  </td>
                  <td className="px-4 py-3 text-xs text-earth-600 max-w-[200px]">{day.advisory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-earth-100">
          {data.days.map((day, i) => (
            <div key={i} className={`p-4 ${i === 0 ? 'bg-blue-50/40' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-earth-900">
                  {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {i === 0 && <span className="ml-1 text-xs text-blue-600">(Today)</span>}
                </p>
                <IrrigationBar mm={day.irrigationMm} maxMm={maxIrrigation} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-earth-600">
                <span>🌧️ Rain: <strong>{day.expectedRainMm.toFixed(1)} mm</strong></span>
                <span>ET₀: <strong>{day.et0.toFixed(1)} mm</strong></span>
              </div>
              <p className="mt-2 text-xs text-earth-700">{day.advisory}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-earth-200 bg-earth-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-earth-500">Legend</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-emerald-400 inline-block" /> No irrigation needed</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-field-400 inline-block" /> Light irrigation (&lt;10 mm)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-amber-400 inline-block" /> Moderate (10–20 mm)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-red-400 inline-block" /> Heavy (&gt;20 mm)</span>
        </div>
        <p className="mt-2 text-xs text-earth-500">
          ET₀ = Reference Evapotranspiration (FAO-56 Penman-Monteith). Irrigation = max(0, Crop ET – Expected Rain).
        </p>
      </div>
    </div>
  );
}
