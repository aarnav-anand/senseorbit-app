import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchGeocodeResults } from '../utils/api';
import type { GeocodeResult } from '../utils/api';

interface LocationSearchProps {
  onSelect: (lat: number, lon: number, name: string) => void;
}

export function LocationSearch({ onSelect }: LocationSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const data = await fetchGeocodeResults(query.trim());
      setResults(data);
      if (data.length === 0) setError(t('common.error'));
    } catch {
      setError(t('common.error'));
    } finally {
      setIsSearching(false);
    }
  }, [query, t]);

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('map.searchPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border border-earth-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-field-500 focus:outline-none focus:ring-2 focus:ring-field-200"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="shrink-0 rounded-lg bg-field-600 px-4 py-2 text-sm font-medium text-white hover:bg-field-700 disabled:opacity-60"
        >
          {t('map.searchButton')}
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-[1200] mt-1 max-h-48 overflow-auto rounded-lg border border-earth-200 bg-white shadow-lg">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lon}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-earth-50"
                onClick={() => {
                  onSelect(r.lat, r.lon, r.displayName);
                  setResults([]);
                  setQuery(r.displayName.split(',')[0]);
                }}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
