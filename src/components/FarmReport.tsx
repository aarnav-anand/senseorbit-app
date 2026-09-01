import { useTranslation } from 'react-i18next';
import { useFarmStore, type ReportTab } from '../store/farmStore';
import { OverallAssessmentTab } from './tabs/OverallAssessmentTab';
import { WeatherTab } from './tabs/WeatherTab';
import { SatelliteTab } from './tabs/SatelliteTab';
import { IrrigationAdvisoryTab } from './tabs/IrrigationAdvisoryTab';
import { FertilizerTab } from './tabs/FertilizerTab';
import { MandiPricesTab } from './tabs/MandiPricesTab';
import { formatNumber } from '../utils/geo';
import { fetchMandiPrices } from '../utils/api';

type TabConfig = {
  id: ReportTab;
  labelKey: string;
  fallback: string;
  icon: string;
  onlyForUpdate?: boolean;
};

const ALL_TABS: TabConfig[] = [
  { id: 'assessment', labelKey: 'report.tabs.assessment', fallback: 'Overall', icon: '📊' },
  { id: 'weather', labelKey: 'report.tabs.weather', fallback: 'Weather', icon: '☁️' },
  { id: 'satellite', labelKey: 'report.tabs.satellite', fallback: 'Satellite', icon: '🛰️' },
  { id: 'irrigation', labelKey: 'report.tabs.irrigation', fallback: 'Irrigation', icon: '💧', onlyForUpdate: true },
  { id: 'fertilizer', labelKey: 'report.tabs.fertilizer', fallback: 'Fertilizer', icon: '🧪', onlyForUpdate: true },
  { id: 'mandi', labelKey: 'report.tabs.mandi', fallback: 'Mandi Prices', icon: '🏪' },
];

export function FarmReport() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('hi') ? 'hi' : 'en';
  const activeTab = useFarmStore((s) => s.activeTab);
  const setActiveTab = useFarmStore((s) => s.setActiveTab);
  const boundary = useFarmStore((s) => s.boundary);
  const locationName = useFarmStore((s) => s.locationName);
  const isLoading = useFarmStore((s) => s.isLoadingReport);
  const error = useFarmStore((s) => s.reportError);
  const weather = useFarmStore((s) => s.weather);
  const satellite = useFarmStore((s) => s.satellite);
  const weatherError = useFarmStore((s) => s.weatherError);
  const satelliteError = useFarmStore((s) => s.satelliteError);
  const resetReport = useFarmStore((s) => s.resetReport);
  const sowingIntent = useFarmStore((s) => s.sowingIntent);
  const selectedCrop = useFarmStore((s) => s.selectedCrop);
  const irrigationAdvisory = useFarmStore((s) => s.irrigationAdvisory);
  const irrigationLoading = useFarmStore((s) => s.irrigationLoading);
  const irrigationError = useFarmStore((s) => s.irrigationError);
  const fertilizerAdvice = useFarmStore((s) => s.fertilizerAdvice);
  const fertilizerLoading = useFarmStore((s) => s.fertilizerLoading);
  const fertilizerError = useFarmStore((s) => s.fertilizerError);
  const mandiResponse = useFarmStore((s) => s.mandiResponse);
  const mandiLoading = useFarmStore((s) => s.mandiLoading);
  const mandiError = useFarmStore((s) => s.mandiError);
  const setMandiResponse = useFarmStore((s) => s.setMandiResponse);
  const setMandiLoading = useFarmStore((s) => s.setMandiLoading);
  const setMandiError = useFarmStore((s) => s.setMandiError);

  const languageWarning = useFarmStore((s) => s.languageWarning);
  const setLanguageWarning = useFarmStore((s) => s.setLanguageWarning);

  // Compute visible tabs based on intent
  const visibleTabs = ALL_TABS.filter((tab) => {
    if (tab.onlyForUpdate) return sowingIntent === 'update';
    return true;
  });

  const handleMandiRefresh = async () => {
    if (!boundary) return;
    setMandiLoading(true);
    setMandiError(null);
    const crop = selectedCrop ?? 'Wheat';
    try {
      const data = await fetchMandiPrices(crop, boundary.centroid[0], boundary.centroid[1]);
      setMandiResponse(data);
    } catch (err) {
      setMandiError(err instanceof Error ? err.message : 'Failed to load mandi prices');
    } finally {
      setMandiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-field-600 border-t-transparent" />
          <p className="font-medium text-earth-700">{t('report.loading', 'Loading live accredited scan data…')}</p>
          {sowingIntent === 'update' && (
            <p className="text-xs text-earth-500">Fetching irrigation advisory + fertilizer advice…</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">{t('report.error')}</p>
        <button
          type="button"
          onClick={resetReport}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800"
        >
          {t('report.backToMap')}
        </button>
      </div>
    );
  }

  if (!boundary) {
    return (
      <div className="rounded-2xl border border-earth-200 bg-white p-8 text-center shadow-xs space-y-4">
        <p className="text-earth-700 font-medium">{t('map.noPolygon')}</p></p>
        <button
          type="button"
          onClick={resetReport}
          className="rounded-xl bg-field-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-field-700"
        >
            {t('report.backToMap')}
        </button>
      </div>
    );
  }

  return (
    <section id="farm-report-content" className="space-y-6">
      {languageWarning && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-xl shrink-0">⚠️</span>
            <p className="text-xs font-semibold sm:text-sm leading-relaxed">
              {languageWarning}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLanguageWarning(null)}
            className="shrink-0 rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-300"
          >
            ✕ {t('common.close')}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-earth-900">{t('report.title')}</h2>
            {sowingIntent === 'update' && selectedCrop && (
              <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                💧 Crop Update: {selectedCrop}
              </span>
            )}
            {sowingIntent === 'new' && (
              <span className="rounded-full bg-field-100 border border-field-200 px-2.5 py-0.5 text-xs font-semibold text-field-800">
                🌾 New Sowing Advisory
              </span>
            )}
          </div>
          {locationName && (
            <p className="mt-1 text-sm text-earth-600">
              {t('report.location')}: {locationName}
            </p>
          )}
          <p className="mt-1 text-sm text-earth-500">
            {t('map.area')}: {formatNumber(boundary.areaHectares, locale)}{' '}
            {t('map.hectares')} · {t('map.centroid')}:{' '}
            {boundary.centroid[0].toFixed(4)}, {boundary.centroid[1].toFixed(4)}
          </p>
        </div>
        <div className="no-print flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={resetReport}
            className="text-sm font-medium text-earth-600 underline hover:text-earth-900"
          >
            {t('report.backToMap')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="no-print flex gap-1 overflow-x-auto rounded-xl border border-earth-200 bg-earth-100/60 p-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-field-800 shadow-xs font-bold'
                : 'text-earth-600 hover:text-earth-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {t(tab.labelKey, tab.fallback)}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="rounded-xl border border-earth-200 bg-white p-4 sm:p-6 shadow-xs">
        {activeTab === 'assessment' && <OverallAssessmentTab />}
        {activeTab === 'weather' && <WeatherTab data={weather} error={weatherError} />}
        {activeTab === 'satellite' && <SatelliteTab data={satellite} error={satelliteError} />}
        {activeTab === 'irrigation' && (
          <IrrigationAdvisoryTab
            data={irrigationAdvisory}
            loading={irrigationLoading}
            error={irrigationError}
          />
        )}
        {activeTab === 'fertilizer' && (
          <FertilizerTab
            data={fertilizerAdvice}
            loading={fertilizerLoading}
            error={fertilizerError}
            crop={selectedCrop}
          />
        )}
        {activeTab === 'mandi' && (
          <MandiPricesTab
            data={mandiResponse}
            loading={mandiLoading}
            error={mandiError}
            crop={selectedCrop}
            onRefresh={handleMandiRefresh}
          />
        )}
      </div>

      {/* Print view: tabs stacked */}
      <div className="print-only space-y-8">
        <div>
          <h3 className="mb-4 text-lg font-bold">{t('report.tabs.assessment', 'Overall Assessment')}</h3>
          <OverallAssessmentTab />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-bold">{t('report.tabs.weather')}</h3>
          <WeatherTab data={weather} error={weatherError} />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-bold">{t('report.tabs.satellite')}</h3>
          <SatelliteTab data={satellite} error={satelliteError} />
        </div>
        {sowingIntent === 'update' && (
          <>
            <div>
              <h3 className="mb-4 text-lg font-bold">💧 Irrigation Advisory</h3>
              <IrrigationAdvisoryTab data={irrigationAdvisory} loading={false} error={null} />
            </div>
            <div>
              <h3 className="mb-4 text-lg font-bold">🧪 Fertilizer Plan</h3>
              <FertilizerTab data={fertilizerAdvice} loading={false} error={null} crop={selectedCrop} />
            </div>
          </>
        )}
        <div className="pt-4 text-center text-xs text-earth-500">
          {t('footer.attribution', 'Imagery from Esri, other data from OpenStreetMap contributors · Contains modified Copernicus Sentinel data · Soil data © ISRIC SoilGrids · Weather data © Open-Meteo')}
        </div>
      </div>
    </section>
  );
}
