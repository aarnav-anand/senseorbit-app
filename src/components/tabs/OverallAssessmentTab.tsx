import { useTranslation } from 'react-i18next';
import { useFarmStore } from '../../store/farmStore';
import { generateOverallAssessment } from '../../utils/assessment';

export function OverallAssessmentTab() {
  const { t } = useTranslation();
  const soil = useFarmStore((s) => s.soil);
  const weather = useFarmStore((s) => s.weather);
  const satellite = useFarmStore((s) => s.satellite);
  const boundary = useFarmStore((s) => s.boundary);

  const assessment = generateOverallAssessment(soil, weather, satellite, boundary);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-field-700 bg-field-50 border-field-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getBadgeColor = (level: string) => {
    if (level === 'High') return 'bg-red-100 text-red-800 border-red-200';
    if (level === 'Medium') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-earth-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-field-50 px-3 py-1 text-xs font-semibold text-field-800 border border-field-200">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t('assessment.badge', 'AI & Multi-Source Synthesized')}
            </div>
            <h3 className="mt-2 text-2xl font-bold text-earth-900">
              {t('assessment.title', 'Overall Farm & Field Assessment')}
            </h3>
            <p className="mt-1 text-sm text-earth-600">{assessment.summary}</p>
          </div>

          {/* Health Score Gauge */}
          <div
            className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border px-6 py-4 text-center shadow-xs ${getScoreColor(
              assessment.healthScore,
            )}`}
          >
            <span className="text-3xl font-extrabold">{assessment.healthScore}/100</span>
            <span className="text-xs font-semibold uppercase tracking-wider mt-0.5">
              {assessment.healthStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Soil Health & Weather Outlook */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Soil Health Summary */}
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-earth-100 pb-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V8.054M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-earth-900">{t('assessment.soilTitle', 'Soil Profile Analysis')}</h4>
              <p className="text-xs text-earth-500">{t('soil.source', 'Source: ISRIC SoilGrids')}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-earth-50 pb-2">
              <span className="text-earth-600">{t('assessment.phLevel', 'pH Reaction')}:</span>
              <span className="font-medium text-earth-900">{assessment.soilHealth.phStatus}</span>
            </div>
            <div className="flex justify-between border-b border-earth-50 pb-2">
              <span className="text-earth-600">{t('assessment.texture', 'Texture Type')}:</span>
              <span className="font-medium text-earth-900">{assessment.soilHealth.textureType}</span>
            </div>
            <div className="flex justify-between border-b border-earth-50 pb-2">
              <span className="text-earth-600">{t('assessment.organicMatter', 'Organic Carbon')}:</span>
              <span className="font-medium text-earth-900">{assessment.soilHealth.organicMatterStatus}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-earth-600">{t('assessment.nitrogen', 'Nitrogen Stock')}:</span>
              <span className="font-medium text-earth-900">{assessment.soilHealth.nitrogenStatus}</span>
            </div>
          </div>
        </div>

        {/* Weather Outlook */}
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-earth-100 pb-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-800">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-earth-900">{t('assessment.weatherTitle', 'Microclimate & Rainfall Outlook')}</h4>
              <p className="text-xs text-earth-500">{t('weather.source', 'Source: Open-Meteo')}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-earth-50 pb-2">
              <span className="text-earth-600">{t('assessment.rain16Days', '16-Day Rainfall Sum')}:</span>
              <span className="font-medium text-earth-900">{assessment.weatherOutlook.rainfall16Days} mm</span>
            </div>
            <div className="flex justify-between border-b border-earth-50 pb-2">
              <span className="text-earth-600">{t('assessment.precipitationTrend', 'Rainfall Trend')}:</span>
              <span className="font-medium text-earth-900">{assessment.weatherOutlook.trend}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-earth-600">{t('assessment.currTemp', 'Current Temp / Humidity')}:</span>
              <span className="font-medium text-earth-900">
                {weather?.current?.temperature ?? '--'}°C / {weather?.current?.humidity ?? '--'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Crop Suitability & Advice */}
      <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
        <h4 className="font-bold text-earth-900 text-lg border-b border-earth-100 pb-3">
          🌾 {t('assessment.cropTitle', 'Recommended Crops & Agricultural Advice')}
        </h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {assessment.cropRecommendations.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-earth-100 bg-earth-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-earth-900">{item.crop}</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${
                    item.suitability === 'High'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {item.suitability} Suitability
                </span>
              </div>
              <p className="mt-1.5 text-xs text-earth-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fertilizer & Irrigation Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Fertilizer Plan */}
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-earth-900 border-b border-earth-100 pb-3">
            🧪 {t('assessment.fertilizerTitle', 'Fertilizer & Soil Amendment Plan')}
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-earth-700">
            {assessment.fertilizerPlan.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-field-600" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Irrigation Strategy */}
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-earth-900 border-b border-earth-100 pb-3">
            💧 {t('assessment.irrigationTitle', 'Irrigation & Water Management')}
          </h4>
          <p className="mt-4 text-sm text-earth-700 leading-relaxed">
            {assessment.irrigationStrategy}
          </p>
        </div>
      </div>

      {/* Agronomic Risk Alerts */}
      {assessment.riskAlerts.length > 0 && (
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-earth-900 border-b border-earth-100 pb-3">
            ⚠️ {t('assessment.riskTitle', 'Agronomic Risks & Warnings')}
          </h4>
          <div className="mt-4 space-y-3">
            {assessment.riskAlerts.map((risk, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-earth-100 bg-white p-3.5 shadow-2xs">
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold border ${getBadgeColor(risk.level)}`}>
                  {risk.level}
                </span>
                <div>
                  <h5 className="text-sm font-semibold text-earth-900">{risk.title}</h5>
                  <p className="mt-0.5 text-xs text-earth-600">{risk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
