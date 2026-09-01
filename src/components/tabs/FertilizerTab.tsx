import { useTranslation } from 'react-i18next';
import type { FertilizerAdvice } from '../../types/report';

interface FertilizerTabProps {
  data: FertilizerAdvice | null;
  loading: boolean;
  error: string | null;
  crop: string | null;
}

function NPKBadge({ grade }: { grade: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-field-100 px-2 py-0.5 text-xs font-bold font-mono text-field-800 border border-field-200">
      {grade}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const lower = method.toLowerCase();
  let cls = 'bg-earth-100 text-earth-700 border-earth-200';
  if (lower.includes('basal') || lower.includes('broadcast')) cls = 'bg-amber-100 text-amber-800 border-amber-200';
  else if (lower.includes('top') || lower.includes('dress')) cls = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  else if (lower.includes('fertig')) cls = 'bg-blue-100 text-blue-800 border-blue-200';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {method}
    </span>
  );
}

export function FertilizerTab({ data, loading, error, crop }: FertilizerTabProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-field-600 border-t-transparent" />
          <p className="text-sm font-medium text-earth-700">
            {t('fertilizer.loading')}
          </p>
          <p className="text-xs text-earth-500">Powered by Google Gemini · Soil-calibrated</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-800">⚠️ {error}</p>
        <p className="mt-2 text-xs text-red-600">
          Make sure GEMINI_API_KEY is configured in your Vercel environment variables.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-earth-200 bg-earth-50 p-6 text-center">
        <p className="text-sm text-earth-600">
          {t('fertilizer.noData')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-field-200 bg-gradient-to-br from-field-50 to-white p-5 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-field-100 px-3 py-1 text-xs font-semibold text-field-800 border border-field-200">
          <span>🧪</span> AI-Powered Fertilizer Advisory
        </div>
        <h3 className="mt-2 text-xl font-bold text-earth-900">
          {crop ? `${crop} — Fertilizer Schedule` : 'Fertilizer Schedule'}
        </h3>
        <p className="mt-1 text-sm text-earth-600 leading-relaxed">{data.summary}</p>
      </div>

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 font-semibold text-amber-900">⚠️ Important Warnings</p>
          <ul className="space-y-1">
            {data.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Fertilizer Schedule */}
      <div className="rounded-xl border border-earth-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-earth-100 px-5 py-3">
          <h4 className="font-bold text-earth-900">📋 Fertilizer Application Schedule</h4>
          <p className="text-xs text-earth-500 mt-0.5">Quantities per hectare · NPK grades for Indian market</p>
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-earth-100 bg-earth-50 text-left text-xs font-semibold uppercase tracking-wider text-earth-500">
                <th className="px-4 py-3">Timing</th>
                <th className="px-4 py-3">Fertilizer</th>
                <th className="px-4 py-3">NPK Grade</th>
                <th className="px-4 py-3">Qty / ha</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-50">
              {data.schedule.map((step, i) => (
                <tr key={i} className="hover:bg-earth-50/50">
                  <td className="px-4 py-3 font-semibold text-earth-900 whitespace-nowrap">{step.timing}</td>
                  <td className="px-4 py-3 text-earth-800">{step.fertilizer}</td>
                  <td className="px-4 py-3"><NPKBadge grade={step.npkGrade} /></td>
                  <td className="px-4 py-3 font-semibold text-field-700 whitespace-nowrap">{step.qtyPerHectare}</td>
                  <td className="px-4 py-3"><MethodBadge method={step.method} /></td>
                  <td className="px-4 py-3 text-xs text-earth-600 max-w-[200px]">{step.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-earth-100">
          {data.schedule.map((step, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-earth-900">{step.timing}</span>
                <MethodBadge method={step.method} />
              </div>
              <p className="text-sm font-semibold text-earth-800">{step.fertilizer}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <NPKBadge grade={step.npkGrade} />
                <span className="font-bold text-field-700">{step.qtyPerHectare}</span>
              </div>
              <p className="text-xs text-earth-600">{step.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Micronutrients */}
      {data.micronutrients && data.micronutrients.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-purple-100 bg-purple-50 px-5 py-3">
            <h4 className="font-bold text-earth-900">⚗️ Micronutrient Recommendations</h4>
          </div>
          <div className="divide-y divide-earth-50">
            {data.micronutrients.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold text-earth-900">{m.nutrient}</p>
                  <p className="text-xs text-earth-500">{m.product}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-700">{m.dose}</p>
                  <p className="text-xs text-earth-500">{m.timing}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placement Guidance */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-earth-900 mb-2">📍 Where to Apply</h4>
          <p className="text-sm text-earth-700 leading-relaxed">{data.placementGuidance}</p>
        </div>
        <div className="rounded-xl border border-earth-200 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-earth-900 mb-2">🌿 Organic Amendments</h4>
          <p className="text-sm text-earth-700 leading-relaxed">{data.organicAmendments}</p>
        </div>
      </div>

      {/* Data Source Note */}
      <p className="text-xs text-earth-400 text-center">
        Powered by Google Gemini AI · Based on ISRIC SoilGrids soil data, Open-Meteo weather, and NDVI vegetation index
      </p>
    </div>
  );
}
