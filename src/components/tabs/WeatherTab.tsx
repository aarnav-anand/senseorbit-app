import { useTranslation } from 'react-i18next';
import type { WeatherResponse } from '../../types/report';
import { formatDate, formatMonth, formatNumber } from '../../utils/geo';

interface WeatherTabProps {
  data: WeatherResponse | null;
  error?: string | null;
}

export function WeatherTab({ data, error }: WeatherTabProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('hi') ? 'hi' : 'en';

  if (error || !data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-semibold text-amber-800">{t('weather.errorTitle', 'Weather Data Unavailable')}</h3>
        <p className="mt-1 text-sm text-amber-700">
          {t('weather.errorMessage', 'The weather information service is currently down or timed out. Please try again later.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-earth-500">{t('weather.source')}</p>

      <div className="rounded-lg bg-sky-50 p-4">
        <p className="text-sm font-medium text-sky-900">{t(data.summaryKey)}</p>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-earth-900">{t('weather.current')}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: t('weather.temperature'),
              value: `${formatNumber(data.current.temperature, locale, 1)} ${t('weather.units.celsius')}`,
            },
            {
              label: t('weather.humidity'),
              value: `${formatNumber(data.current.humidity, locale, 0)} ${t('weather.units.percent')}`,
            },
            {
              label: t('weather.precipitation'),
              value: `${formatNumber(data.current.precipitation, locale, 1)} ${t('weather.units.mm')}`,
            },
            {
              label: t('weather.windSpeed'),
              value: `${formatNumber(data.current.windSpeed, locale, 1)} ${t('weather.units.kmh')}`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-earth-100 bg-white p-3">
              <p className="text-xs text-earth-500">{item.label}</p>
              <p className="mt-1 font-semibold text-earth-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-earth-900">{t('weather.forecast')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-earth-200 text-left text-earth-500">
                <th className="py-2 pr-3">{t('weather.date')}</th>
                <th className="py-2 pr-3">{t('weather.tempMax')}</th>
                <th className="py-2 pr-3">{t('weather.tempMin')}</th>
                <th className="py-2">{t('weather.rainfall')}</th>
              </tr>
            </thead>
            <tbody>
              {data.forecast.slice(0, 16).map((day) => (
                <tr key={day.date} className="border-b border-earth-100">
                  <td className="py-2 pr-3">{formatDate(day.date, locale)}</td>
                  <td className="py-2 pr-3">
                    {formatNumber(day.tempMax, locale, 1)} {t('weather.units.celsius')}
                  </td>
                  <td className="py-2 pr-3">
                    {formatNumber(day.tempMin, locale, 1)} {t('weather.units.celsius')}
                  </td>
                  <td className="py-2">
                    {formatNumber(day.precipitation, locale, 1)} {t('weather.units.mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.historicalRainfall.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-earth-900">{t('weather.historical')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[240px] text-sm">
              <thead>
                <tr className="border-b border-earth-200 text-left text-earth-500">
                  <th className="py-2 pr-3">{t('weather.month')}</th>
                  <th className="py-2">{t('weather.rainfall')}</th>
                </tr>
              </thead>
              <tbody>
                {data.historicalRainfall.map((row) => (
                  <tr key={row.month} className="border-b border-earth-100">
                    <td className="py-2 pr-3">{formatMonth(row.month, locale)}</td>
                    <td className="py-2">
                      {formatNumber(row.precipitation, locale, 1)} {t('weather.units.mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
