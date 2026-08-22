import { useTranslation } from 'react-i18next';
import type { SoilResponse } from '../../types/report';
import { formatNumber } from '../../utils/geo';

interface SoilTabProps {
  data: SoilResponse | null;
  error?: string | null;
}

const PROPERTY_KEYS = [
  { key: 'ph' as const, labelKey: 'soil.properties.ph' },
  { key: 'organicCarbon' as const, labelKey: 'soil.properties.organicCarbon' },
  { key: 'clay' as const, labelKey: 'soil.properties.clay' },
  { key: 'sand' as const, labelKey: 'soil.properties.sand' },
  { key: 'silt' as const, labelKey: 'soil.properties.silt' },
  { key: 'nitrogen' as const, labelKey: 'soil.properties.nitrogen' },
  { key: 'bulkDensity' as const, labelKey: 'soil.properties.bulkDensity' },
];

export function SoilTab({ data, error }: SoilTabProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('hi') ? 'hi' : 'en';

  if (error || !data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-semibold text-amber-850 text-amber-800">{t('soil.errorTitle', 'Soil Data Unavailable')}</h3>
        <p className="mt-1 text-sm text-amber-700">
          {t('soil.errorMessage', 'The soil information service (ISRIC SoilGrids) is currently slow or down. Please try again later.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-earth-500">{t('soil.source')}</p>

      <div className="rounded-lg bg-field-50 p-4">
        <h3 className="font-semibold text-field-800">{t('soil.summary.title')}</h3>
        <ul className="mt-2 space-y-1 text-sm text-earth-800">
          <li>{t(data.summaryKeys.ph)}</li>
          <li>{t(data.summaryKeys.texture)}</li>
          <li>{t(data.summaryKeys.organicMatter)}</li>
        </ul>
      </div>

      {PROPERTY_KEYS.map(({ key, labelKey }) => {
        const rows = data.properties[key];
        if (!rows.length) return null;
        return (
          <div key={key}>
            <h4 className="mb-2 font-medium text-earth-900">{t(labelKey)}</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b border-earth-200 text-left text-earth-500">
                    <th className="py-2 pr-4">{t('soil.depth')}</th>
                    <th className="py-2">{t(labelKey)}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.depth} className="border-b border-earth-100">
                      <td className="py-2 pr-4">{row.depth}</td>
                      <td className="py-2">
                        {formatNumber(row.value, locale)}{' '}
                        <span className="text-earth-500">{row.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
