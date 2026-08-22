import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/translation.json';
import hi from '../locales/hi/translation.json';

const STORAGE_KEY = 'senseorbit-lang';

function getInitialLanguage(): string {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang === 'en' || urlLang === 'hi') return urlLang;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'hi') return stored;

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('hi')) return 'hi';
  return 'en';
}

export function setLanguage(lang: 'en' | 'hi') {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);

  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url.toString());
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
