import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { FarmReport } from './components/FarmReport';
import { LoginPage } from './components/LoginPage';
import { useFarmStore } from './store/farmStore';
import { fetchFullReport, fetchWaterCheck } from './utils/api';
import { deductFarmerCredit } from './lib/supabase';

export default function App() {
  const { t } = useTranslation();
  const farmer = useFarmStore((s) => s.farmer);
  const showReport = useFarmStore((s) => s.showReport);
  const boundary = useFarmStore((s) => s.boundary);
  const setShowReport = useFarmStore((s) => s.setShowReport);
  const setLoadingReport = useFarmStore((s) => s.setLoadingReport);
  const setReportData = useFarmStore((s) => s.setReportData);
  const setReportError = useFarmStore((s) => s.setReportError);
  const updateCredits = useFarmStore((s) => s.updateCredits);
  const creditExhaustedMessage = useFarmStore((s) => s.creditExhaustedMessage);
  const setCreditExhaustedMessage = useFarmStore((s) => s.setCreditExhaustedMessage);
  const waterBodyError = useFarmStore((s) => s.waterBodyError);
  const setWaterBodyError = useFarmStore((s) => s.setWaterBodyError);

  const handleConfirmBoundary = useCallback(async () => {
    if (!boundary?.isValid) return;

    setCreditExhaustedMessage(null);
    setWaterBodyError(null);

    // 1. Check if credits are exhausted (senseorbit <= 0)
    if (!farmer || farmer.senseorbit <= 0) {
      setCreditExhaustedMessage(
        'Credits exhausted. Please purchase more scans from agrifusion-hub.vercel.app',
      );
      return;
    }

    const [lat, lon] = boundary.centroid;

    setLoadingReport(true);

    // 2. Check if boundary is drawn over a water body
    try {
      const waterCheck = await fetchWaterCheck(lat, lon);
      if (waterCheck.isWater) {
        setLoadingReport(false);
        setWaterBodyError(
          t(
            'map.waterBodyRejected',
            'The drawn boundary is over a water body (ocean, lake, or river). Please redraw your farm boundary over agricultural land. No credits were deducted.',
          ),
        );
        return;
      }
    } catch (waterErr) {
      console.warn('Water body check failed, continuing scan:', waterErr);
    }

    setShowReport(true);
    setReportError(null);

    try {
      const data = await fetchFullReport(lat, lon);

      setReportData({
        ...data,
        locationName: data.locationName ?? undefined,
      });

      // 3. On successful scan, deduct 1 credit from Supabase database
      try {
        const updatedCredits = await deductFarmerCredit(farmer.id, farmer.senseorbit);
        updateCredits(updatedCredits);
      } catch (creditErr) {
        console.error('Could not deduct credit on Supabase:', creditErr);
        // Fallback local credit deduction
        updateCredits(Math.max(0, farmer.senseorbit - 1));
      }
    } catch (err) {
      // 4. Failed scan deducts 0 credits
      setReportError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoadingReport(false);
    }
  }, [boundary, farmer, setCreditExhaustedMessage, setLoadingReport, setReportData, setReportError, setShowReport, setWaterBodyError, t, updateCredits]);

  // If farmer is not logged in, render LoginPage
  if (!farmer) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-full flex-col bg-earth-50">
      <Header />

      {creditExhaustedMessage && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center shadow-xs">
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <span className="font-semibold text-amber-900">{creditExhaustedMessage}</span>
              <a
                href="https://agrifusion-hub.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800"
              >
                agrifusion-hub.vercel.app
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {waterBodyError && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6">
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-center shadow-xs">
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 text-blue-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold text-blue-900">{waterBodyError}</span>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {!showReport ? (
          <MapView onConfirm={handleConfirmBoundary} />
        ) : (
          <FarmReport />
        )}
      </main>

      <footer className="no-print mt-auto border-t border-earth-200 bg-white py-4 text-center text-xs text-earth-500">
        <div className="mx-auto max-w-7xl px-4">
          {t('footer.attribution', 'Imagery from Esri, other data from OpenStreetMap contributors · Contains modified Copernicus Sentinel data · Soil data © ISRIC SoilGrids · Weather data © Open-Meteo')}
        </div>
      </footer>
    </div>
  );
}
