import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MandiResponse } from '../../types/report';

interface MandiPricesTabProps {
  data: MandiResponse | null;
  loading: boolean;
  error: string | null;
  crop: string | null;
  onRefresh: () => void;
}

function PricePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center rounded-lg border px-3 py-2 ${color}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-base font-bold">₹{value.toLocaleString('en-IN')}</span>
      <span className="text-[10px] opacity-60">/quintal</span>
    </div>
  );
}

function NoPricesTodayModal({ onDismiss, previousDayDate }: { onDismiss: () => void; previousDayDate?: string }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-amber-100 px-6 py-5">
          <h2 className="text-lg font-bold text-amber-900">
            ⚠️ No Prices Today
          </h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-earth-700">
            Price data is not yet available for today. We're showing prices from{' '}
            <strong>{previousDayDate ? new Date(previousDayDate).toLocaleDateString('en-IN', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            }) : 'yesterday'}</strong> instead.
          </p>
          <p className="mt-3 text-xs text-earth-500">
            Price updates typically happen during market hours. Try refreshing later today for the latest prices.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-amber-100 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function MandiPricesTab({ data, loading, error, crop, onRefresh }: MandiPricesTabProps) {
  const { t } = useTranslation();
  const [showNoPricesWarning, setShowNoPricesWarning] = useState(true);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-sm font-medium text-earth-700">
            {t('mandi.loading')}
          </p>
          <p className="text-xs text-earth-500">Source: Agmarknet / data.gov.in</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-800">⚠️ Could not load mandi prices</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* No Prices Today Warning Modal */}
      {data?.isNoPricesToday && showNoPricesWarning && (
        <NoPricesTodayModal
          onDismiss={() => setShowNoPricesWarning(false)}
          previousDayDate={data.previousDayDate}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            <span>🏪</span> Live Mandi Prices
          </div>
          <h3 className="mt-2 text-xl font-bold text-earth-900">
            {crop ? `${crop} — Market Prices` : 'Market Prices'}
          </h3>
          {data && (
            <p className="text-sm text-earth-500">
              Region: <strong className="text-earth-700">{data.detectedState}</strong>
              {' '}· Source: {data.source === 'agmarknet' ? 'Agmarknet (data.gov.in)' : 'Not available'}
              {data.isNoPricesToday && data.previousDayDate && (
                <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  📅 From {new Date(data.previousDayDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0 rounded-lg border border-earth-200 bg-white px-4 py-2 text-sm font-medium text-earth-700 hover:bg-earth-50 disabled:opacity-60"
        >
          ↑ {t('mandi.refresh')}
        </button>
      </div>

      {/* Fallback / No Key Message */}
      {data?.source === 'fallback' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">🔑 API Key Required</p>
          <p className="mt-1 text-sm text-amber-800">{data.note}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://data.gov.in/user/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800"
            >
              Register at data.gov.in →
            </a>
          </div>
          <p className="mt-3 text-xs text-amber-700">
            After registration, add <code className="rounded bg-amber-100 px-1">AGMARKNET_API_KEY</code> in your Vercel environment variables and redeploy.
          </p>
        </div>
      )}

      {/* Price Table */}
      {data && data.prices.length > 0 ? (
        <>
          {/* Summary Stats */}
          {(() => {
            const modal = data.prices.map((p) => p.modalPrice);
            const avgModal = Math.round(modal.reduce((a, b) => a + b, 0) / modal.length);
            const maxModal = Math.max(...modal);
            const minModal = Math.min(...modal);
            return (
              <div className="grid grid-cols-3 gap-3">
                <PricePill label="Avg Modal" value={avgModal} color="bg-field-50 border-field-200 text-field-900" />
                <PricePill label="Best Price" value={maxModal} color="bg-emerald-50 border-emerald-200 text-emerald-900" />
                <PricePill label="Lowest" value={minModal} color="bg-earth-50 border-earth-200 text-earth-700" />
              </div>
            );
          })()}

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto rounded-xl border border-earth-200 bg-white shadow-sm sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-earth-100 bg-earth-50 text-left text-xs font-semibold uppercase tracking-wider text-earth-500">
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Variety</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Min ₹</th>
                  <th className="px-4 py-3 text-right font-extrabold text-field-700">Modal ₹</th>
                  <th className="px-4 py-3 text-right">Max ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-50">
                {data.prices.map((price, i) => (
                  <tr key={i} className="hover:bg-earth-50/50">
                    <td className="px-4 py-3 font-medium text-earth-900">{price.market}</td>
                    <td className="px-4 py-3 text-earth-600">{price.district}</td>
                    <td className="px-4 py-3 text-earth-500 text-xs">{price.variety || '—'}</td>
                    <td className="px-4 py-3 text-earth-500 text-xs whitespace-nowrap">{price.arrivalDate}</td>
                    <td className="px-4 py-3 text-right text-earth-600">₹{price.minPrice.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-bold text-field-700">₹{price.modalPrice.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">₹{price.maxPrice.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {data.prices.map((price, i) => (
              <div key={i} className="rounded-xl border border-earth-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-earth-900">{price.market}</p>
                    <p className="text-xs text-earth-500">{price.district} · {price.arrivalDate}</p>
                    {price.variety && <p className="text-xs text-earth-400">{price.variety}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-field-700">₹{price.modalPrice.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-earth-400">modal/quintal</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-earth-500">
                  <span>Min: ₹{price.minPrice.toLocaleString('en-IN')}</span>
                  <span>Max: ₹{price.maxPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-earth-400">
            Data sourced from Agmarknet (National Agriculture Market) · data.gov.in · Prices in ₹/quintal
          </p>
        </>
      ) : data && data.prices.length === 0 && data.source === 'agmarknet' ? (
        <div className="rounded-xl border border-earth-200 bg-earth-50 p-6 text-center">
          <p className="text-sm text-earth-600">
            No price records found for <strong>{crop}</strong> in <strong>{data.detectedState}</strong> in the last 2 days.
          </p>
          <p className="mt-1 text-xs text-earth-500">
            Try refreshing, or check Agmarknet directly for regional price data.
          </p>
          <a
            href="https://agmarknet.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-earth-300 px-4 py-2 text-xs font-medium text-earth-700 hover:bg-earth-100"
          >
            Visit Agmarknet.gov.in →
          </a>
        </div>
      ) : null}
    </div>
  );
}
