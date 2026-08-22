import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith('hi') ? 'hi' : 'en';

  return (
    <div className="flex items-center gap-1 rounded-lg border border-earth-200 bg-white p-1 shadow-sm">
      <span className="sr-only">{t('nav.language')}</span>
      {(['en', 'hi'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            current === lang
              ? 'bg-field-600 text-white'
              : 'text-earth-700 hover:bg-earth-100'
          }`}
          aria-pressed={current === lang}
        >
          {t(lang === 'en' ? 'nav.english' : 'nav.hindi')}
        </button>
      ))}
    </div>
  );
}
