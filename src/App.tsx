import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { FarmReport } from './components/FarmReport';
import { LoginPage } from './components/LoginPage';
import { useFarmStore } from './store/farmStore';
import {
  fetchFullReport,
  fetchWaterCheck,
  fetchNdviData,
  fetchGeminiCropAdvice,
  fetchGeminiFertilizerAdvice,
  fetchIrrigationAdvisory,
  fetchMandiPrices,
} from './utils/api';
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

  const setIrrigationAdvisory = useFarmStore((s) => s.setIrrigationAdvisory);
  const setIrrigationLoading = useFarmStore((s) => s.setIrrigationLoading);
  const setIrrigationError = useFarmStore((s) => s.setIrrigationError);
  const setFertilizerAdvice = useFarmStore((s) => s.setFertilizerAdvice);
  const setFertilizerLoading = useFarmStore((s) => s.setFertilizerLoading);
  const setFertilizerError = useFarmStore((s) => s.setFertilizerError);
  const setGeminiCropAdvice = useFarmStore((s) => s.setGeminiCropAdvice);
  const setGeminiCropLoading = useFarmStore((s) => s.setGeminiCropLoading);
  const setGeminiCropError = useFarmStore((s) => s.setGeminiCropError);
  const setMandiResponse = useFarmStore((s) => s.setMandiResponse);
  const setMandiLoading = useFarmStore((s) => s.setMandiLoading);
  const setMandiError = useFarmStore((s) => s.setMandiError);
  const setActiveTab = useFarmStore((s) => s.setActiveTab);

  const handleConfirmBoundary = useCallback(
    async (intent: 'new' | 'update', crop?: string, sowingDate?: string) => {
      if (!boundary?.isValid) return;

      setCreditExhaustedMessage(null);
      setWaterBodyError(null);

      if (!farmer || farmer.senseorbit <= 0) {
        setCreditExhaustedMessage(
          'Credits exhausted. Please purchase more scans from agrifusion-hub.vercel.app',
        );
        return;
      }

      const [lat, lon] = boundary.centroid;

      setLoadingReport(true);

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
      setActiveTab(intent === 'update' ? 'irrigation' : 'assessment');

      try {
        const [data, ndviResult] = await Promise.all([
          fetchFullReport(lat, lon),
          fetchNdviData(lat, lon, boundary.polygon)
            .then((d) => ({ data: d, error: null as string | null }))
            .catch((err) => ({
              data: null,
              error: err instanceof Error ? err.message : 'Failed to load NDVI data',
            })),
        ]);

        const fullSoil = data.soil;
        const fullWeather = data.weather;
        const ndviMean = ndviResult.data?.current?.mean ?? undefined;

        setReportData({
          ...data,
          ndvi: ndviResult.data,
          ndviError: ndviResult.error,
          locationName: data.locationName ?? undefined,
        });

        // Deduct credit
        try {
          const updatedCredits = await deductFarmerCredit(farmer.id, farmer.senseorbit);
          updateCredits(updatedCredits);
        } catch (creditErr) {
          console.error('Could not deduct credit on Supabase:', creditErr);
          updateCredits(Math.max(0, farmer.senseorbit - 1));
        }

        // Fetch Mandi Prices (always)
        const targetCrop = crop || 'Wheat';
        setMandiLoading(true);
        setMandiError(null);
        fetchMandiPrices(targetCrop, lat, lon)
          .then((res) => setMandiResponse(res))
          .catch((err) => setMandiError(err instanceof Error ? err.message : 'Failed to load mandi prices'))
          .finally(() => setMandiLoading(false));

        // Handle Intent-Specific API Calls
        if (intent === 'new') {
          // Gemini AI Crop Recommendation
          setGeminiCropLoading(true);
          setGeminiCropError(null);
          fetchGeminiCropAdvice({
            lat,
            lon,
            mode: 'new_sowing',
            ndviMean,
            soilPh: fullSoil?.properties.ph[0]?.value,
            soilTexture: fullSoil?.summaryKeys.texture,
            soilOC: fullSoil?.properties.organicCarbon[0]?.value,
            soilBD: fullSoil?.properties.bulkDensity[0]?.value,
            soilN: fullSoil?.properties.nitrogen[0]?.value,
            rainfall16Days: fullWeather?.forecast ? fullWeather.forecast.reduce((a, b) => a + b.precipitation, 0) : undefined,
            temperature: fullWeather?.current?.temperature,
            humidity: fullWeather?.current?.humidity,
            region: data.locationName ?? undefined,
            areaHectares: boundary.areaHectares,
          })
            .then((res) => setGeminiCropAdvice(res))
            .catch((err) => setGeminiCropError(err instanceof Error ? err.message : 'Failed to generate Gemini AI crop advice'))
            .finally(() => setGeminiCropLoading(false));
        } else if (intent === 'update' && crop && sowingDate) {
          // 1. Irrigation Advisory
          setIrrigationLoading(true);
          setIrrigationError(null);
          fetchIrrigationAdvisory(
            lat,
            lon,
            crop,
            sowingDate,
            ndviMean,
            fullSoil?.properties.bulkDensity[0]?.value,
            fullSoil?.properties.organicCarbon[0]?.value,
          )
            .then((res) => setIrrigationAdvisory(res))
            .catch((err) => setIrrigationError(err instanceof Error ? err.message : 'Failed to load irrigation advisory'))
            .finally(() => setIrrigationLoading(false));

          // 2. Fertilizer Advice via Gemini
          setFertilizerLoading(true);
          setFertilizerError(null);
          fetchGeminiFertilizerAdvice({
            lat,
            lon,
            mode: 'fertilizer',
            crop,
            sowingDate,
            ndviMean,
            soilPh: fullSoil?.properties.ph[0]?.value,
            soilTexture: fullSoil?.summaryKeys.texture,
            soilOC: fullSoil?.properties.organicCarbon[0]?.value,
            soilBD: fullSoil?.properties.bulkDensity[0]?.value,
            soilN: fullSoil?.properties.nitrogen[0]?.value,
            rainfall16Days: fullWeather?.forecast ? fullWeather.forecast.reduce((a, b) => a + b.precipitation, 0) : undefined,
            temperature: fullWeather?.current?.temperature,
            humidity: fullWeather?.current?.humidity,
            region: data.locationName ?? undefined,
            areaHectares: boundary.areaHectares,
          })
            .then((res) => setFertilizerAdvice(res))
            .catch((err) => setFertilizerError(err instanceof Error ? err.message : 'Failed to load fertilizer advice'))
            .finally(() => setFertilizerLoading(false));
        }
      } catch (err) {
        setReportError(err instanceof Error ? err.message : t('common.error'));
      } finally {
        setLoadingReport(false);
      }
    },
    [
      boundary,
      farmer,
      setCreditExhaustedMessage,
      setFertilizerAdvice,
      setFertilizerError,
      setFertilizerLoading,
      setGeminiCropAdvice,
      setGeminiCropError,
      setGeminiCropLoading,
      setIrrigationAdvisory,
      setIrrigationError,
      setIrrigationLoading,
      setLoadingReport,
      setMandiError,
      setMandiLoading,
      setMandiResponse,
      setReportData,
      setReportError,
      setActiveTab,
      setShowReport,
      setWaterBodyError,
      t,
      updateCredits,
    ],
  );

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
          {t('footer.attribution', 'Imagery from Esri, other data from OpenStreetMap contributors · Contains modified Copernicus Sentinel data · Soil data © ISRIC SoilGrids · Weather data © Open-Meteo · Agmarknet')}
        </div>
      </footer>
    </div>
  );
}