import { useTranslation } from 'react-i18next';
import { useFarmStore } from '../../store/farmStore';
import { generateOverallAssessment } from '../../utils/assessment';

export function OverallAssessmentTab() {
  const { t, i18n } = useTranslation();
  const soil = useFarmStore((s) => s.soil);
  const weather = useFarmStore((s) => s.weather);
  const satellite = useFarmStore((s) => s.satellite);
  const boundary = useFarmStore((s) => s.boundary);
  const ndvi = useFarmStore((s) => s.ndvi);

  const sowingIntent = useFarmStore((s) => s.sowingIntent);
  const selectedCrop = useFarmStore((s) => s.selectedCrop);
  const geminiCropAdvice = useFarmStore((s) => s.geminiCropAdvice);
  const geminiCropLoading = useFarmStore((s) => s.geminiCropLoading);
  const geminiCropError = useFarmStore((s) => s.geminiCropError);
  const fertilizerAdvice = useFarmStore((s) => s.fertilizerAdvice);
  const setActiveTab = useFarmStore((s) => s.setActiveTab);

  const assessment = generateOverallAssessment(soil, weather, satellite, boundary, i18n.language, ndvi);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-field-700 bg-field-50 border-field-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getNdviBarColor = (val: number) => {
    if (val >= 0.6) return 'bg-emerald-500';
    if (val >= 0.4) return 'bg-field-500';
    if (val >= 0.2) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getBadgeColor = (level: string) => {
    if (level === 'High' || level === 'उच्च') return 'bg-red-100 text-red-800 border-red-200';
    if (level === 'Medium' || level === 'मध्यम') return 'bg-amber-100 text-amber-800 border-amber-200';
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

          <div className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border px-6 py-4 text-center shadow-xs ${getScoreColor(assessment.healthScore)}`}>
            <span className="text-3xl font-extrabold">{assessment.healthScore}/100</span>
            <span className="text-xs font-semibold uppercase tracking-wider mt-0.5">
              {assessment.healthStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Gemini AI New Sowing Advice Card (if user selected New Sowing) */}
      {sowingIntent === 'new' && (
        <div className="rounded-2xl border border-field-300 bg-gradient-to-br from-field-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-field-600 p-1.5 text-white text-xs">✨</span>
            <h4 className="font-bold text-earth-900 text-lg">
              AI Model Crop Selection Advisor
            </h4>
            <span className="ml-auto text-xs font-semibold text-field-700 bg-field-100 border border-field-200 px-2.5 py-0.5 rounded-full">
              NDVI + Weather + Soil Synthesized
            </span>
          </div>

          {geminiCropLoading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-field-600 border-t-transparent" />
              <span className="text-sm font-medium text-earth-700">Consulting AI Model for optimal crop selection...</span>
            </div>
          ) : geminiCropError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <p className="font-semibold">⚠️ Live AI advice status:</p>
              <p className="mt-0.5 text-amber-800">{geminiCropError}</p>
            </div>
          ) : geminiCropAdvice ? (
            <div className="space-y-4">
              {/* Top Choice Highlight */}
              <div className="rounded-xl border border-field-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-field-800 uppercase tracking-wider">Top Choice to Sow</span>
                    <h5 className="text-2xl font-extrabold text-earth-900">{geminiCropAdvice.topCrop}</h5>
                  </div>
                  {geminiCropAdvice.bestSowingWindow && (
                    <div className="text-right">
                      <span className="text-xs text-earth-500">Best Sowing Window</span>
                      <p className="text-sm font-bold text-field-700">📅 {geminiCropAdvice.bestSowingWindow}</p>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-earth-700 leading-relaxed">{geminiCropAdvice.topCropReason}</p>
              </div>

              {/* Alternatives Grid */}
              {geminiCropAdvice.alternatives && geminiCropAdvice.alternatives.length > 0 && (
                <div>
                  <h6 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-2">Alternative Sowing Choices</h6>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {geminiCropAdvice.alternatives.map((alt, idx) => (
                      <div key={idx} className="rounded-lg border border-earth-200 bg-earth-50/50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-earth-900 text-sm">{alt.crop}</span>
                          <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            {alt.suitability} Suitability
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-earth-600">{alt.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Risks */}
              {geminiCropAdvice.keyRisks && geminiCropAdvice.keyRisks.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900">
                  <span className="font-bold">⚠️ Sowing Risks & Considerations:</span>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-800">
                    {geminiCropAdvice.keyRisks.map((risk, rIdx) => (
                      <li key={rIdx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary Narrative */}
              {geminiCropAdvice.summary && (
                <p className="text-xs text-earth-600 italic border-t border-earth-100 pt-3">
                  "{geminiCropAdvice.summary}"
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* NDVI Card */}
      {assessment.ndviStatus && (
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-earth-100 pb-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-earth-900">
                {t('ndvi.assessmentTitle', 'Vegetation Health (NDVI)')}
              </h4>
              <p className="text-xs text-earth-500">
                Source: Copernicus Sentinel-2 Multispectral Data
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-earth-600 mb-1">
                <span className="font-medium">{t('ndvi.meanLabel', 'Mean NDVI')}</span>
                <span className="font-bold text-earth-900">{assessment.ndviStatus.value}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-earth-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getNdviBarColor(parseFloat(assessment.ndviStatus.value))}`}
                  style={{ width: `${Math.max(4, Math.min(100, ((parseFloat(assessment.ndviStatus.value) + 0.2) / 1.2) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-earth-400 mt-0.5">
                <span>−0.2</span><span>0</span><span>0.4</span><span>0.8+</span>
              </div>
            </div>

            <div className="flex justify-between border-b border-earth-50 pb-2 text-sm">
              <span className="text-earth-600">{t('ndvi.status', 'Status')}:</span>
              <span className="font-semibold text-earth-900">{assessment.ndviStatus.label}</span>
            </div>

            <div className="flex justify-between border-b border-earth-50 pb-2 text-sm">
              <span className="text-earth-600">{t('ndvi.trend', '60-Day Trend')}:</span>
              <span className="font-semibold text-earth-900">{assessment.ndviStatus.trend}</span>
            </div>

            <p className="text-xs text-earth-600 leading-relaxed">
              {assessment.ndviStatus.interpretation}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Soil Health & Weather Outlook */}
      <div className="grid gap-6 md:grid-cols-2">
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

      {/* Recommended Crops: ONLY display static list if user did NOT select New Sowing */}
      {sowingIntent !== 'new' && (
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-earth-900 text-lg border-b border-earth-100 pb-3">
            🌾 {t('assessment.cropTitle', 'Recommended Crops & Agricultural Advice')}
          </h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {assessment.cropRecommendations.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-earth-100 bg-earth-50/50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-earth-900">{item.crop}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${
                    item.suitability === 'High' || item.suitability === 'उच्च'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {item.suitability} {t('assessment.suitabilityLabel', 'Suitability')}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-earth-600">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fertilizer & Irrigation Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Fertilizer Card */}
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-earth-100 pb-3">
            <h4 className="font-bold text-earth-900">
              🧪 {t('assessment.fertilizerTitle', 'Fertilizer & Soil Amendment Plan')}
            </h4>
            {fertilizerAdvice && (
              <button
                type="button"
                onClick={() => setActiveTab('fertilizer')}
                className="text-xs font-bold text-field-700 hover:underline"
              >
                View Full Plan →
              </button>
            )}
          </div>

          {fertilizerAdvice ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-earth-700 leading-relaxed font-medium">
                {fertilizerAdvice.summary}
              </p>
              <div className="space-y-2">
                {fertilizerAdvice.schedule.slice(0, 3).map((step, idx) => (
                  <div key={idx} className="rounded-lg border border-earth-100 bg-earth-50/50 p-2.5 text-xs">
                    <div className="flex justify-between font-bold text-earth-900">
                      <span>{step.timing}</span>
                      <span className="text-field-700">{step.qtyPerHectare}</span>
                    </div>
                    <p className="text-earth-700 font-medium mt-0.5">{step.fertilizer} ({step.npkGrade})</p>
                    <p className="text-earth-500 text-[11px] mt-0.5">{step.notes}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('fertilizer')}
                className="w-full rounded-lg bg-field-50 border border-field-200 py-2 text-xs font-bold text-field-800 hover:bg-field-100 text-center"
              >
                View Complete {selectedCrop} Fertilizer Schedule →
              </button>
            </div>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-earth-700">
              {assessment.fertilizerPlan.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-field-600" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Irrigation Card */}
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-earth-100 pb-3">
            <h4 className="font-bold text-earth-900">
              💧 {t('assessment.irrigationTitle', 'Irrigation & Water Management')}
            </h4>
            {sowingIntent === 'update' && (
              <button
                type="button"
                onClick={() => setActiveTab('irrigation')}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                7-Day Forecast →
              </button>
            )}
          </div>
          <p className="mt-4 text-sm text-earth-700 leading-relaxed">
            {assessment.irrigationStrategy}
          </p>
          {sowingIntent === 'update' && (
            <button
              type="button"
              onClick={() => setActiveTab('irrigation')}
              className="mt-4 w-full rounded-lg bg-blue-50 border border-blue-200 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 text-center"
            >
              View 7-Day Day-by-Day Irrigation Table →
            </button>
          )}
        </div>
      </div>

      {/* Risk Alerts */}
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