import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import { useFarmStore } from '../store/farmStore';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith('hi') ? 'hi' : 'en';
  const showReport = useFarmStore((s) => s.showReport);
  const setLanguageWarning = useFarmStore((s) => s.setLanguageWarning);
  const clearLanguageDependentData = useFarmStore((s) => s.clearLanguageDependentData);

  const handleSelectLanguage = (lang: 'en' | 'hi') => {
    if (current !== lang && showReport) {
      const msg =
        lang === 'hi'
          ? 'स्कैन पूरा होने के बाद भाषा बदलने से स्कैन नई भाषा में अपडेट नहीं होगा। कृपया पुनः प्रयास करें।'
          : 'Change of language after scan is completed will NOT reupdate the scan in the new language. Please try again.';
      setLanguageWarning(msg);
      // Clear all language-dependent advisory data to force fresh scan in new language
      clearLanguageDependentData();
    }
    setLanguage(lang);
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-earth-200 bg-white p-1 shadow-sm">
      <span className="sr-only">{t('nav.language')}</span>
      {(['en', 'hi'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => handleSelectLanguage(lang)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            current === lang
              ? 'bg-field-600 text-white font-bold'
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
