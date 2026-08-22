import { useTranslation } from 'react-i18next';
import { useFarmStore, type ReportTab } from '../store/farmStore';
import { OverallAssessmentTab } from './tabs/OverallAssessmentTab';
import { WeatherTab } from './tabs/WeatherTab';
import { SatelliteTab } from './tabs/SatelliteTab';
import { formatNumber } from '../utils/geo';

const TABS: ReportTab[] = ['assessment', 'weather', 'satellite'];

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

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-field-600 border-t-transparent" />
          <p className="font-medium text-earth-700">{t('report.loading', 'Loading live accredited scan data…')}</p>
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

  if (!boundary) return null;

  return (
    <section id="farm-report-content" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-earth-900">{t('report.title')}</h2>
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

      <div className="no-print flex gap-1 overflow-x-auto rounded-xl border border-earth-200 bg-earth-100/60 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-field-800 shadow-xs font-bold'
                : 'text-earth-600 hover:text-earth-900'
            }`}
          >
            {t(`report.tabs.${tab}`, tab === 'assessment' ? 'Overall Assessment' : tab)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-earth-200 bg-white p-4 sm:p-6 shadow-xs">
        {activeTab === 'assessment' && <OverallAssessmentTab />}
        {activeTab === 'weather' && <WeatherTab data={weather} error={weatherError} />}
        {activeTab === 'satellite' && <SatelliteTab data={satellite} error={satelliteError} />}
      </div>

      {/* Print view: show tabs stacked */}
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
        <div className="pt-4 text-center text-xs text-earth-500">
          {t('footer.attribution', 'Imagery from Esri, other data from OpenStreetMap contributors · Contains modified Copernicus Sentinel data · Soil data © ISRIC SoilGrids · Weather data © Open-Meteo')}
        </div>
      </div>
    </section>
  );
}
