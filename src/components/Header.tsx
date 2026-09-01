import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { useFarmStore } from '../store/farmStore';

export function Header() {
  const { t } = useTranslation();
  const farmer = useFarmStore((s) => s.farmer);
  const logoutFarmer = useFarmStore((s) => s.logoutFarmer);
  const currentView = useFarmStore((s) => s.currentView);
  const setCurrentView = useFarmStore((s) => s.setCurrentView);
  const showReport = useFarmStore((s) => s.showReport);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logoutFarmer();
  };

  return (
    <header className="no-print sticky top-0 z-[1100] border-b border-earth-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="min-w-0 cursor-pointer" onClick={() => farmer && setCurrentView('dashboard')}>
            <h1 className="truncate text-lg font-bold text-field-700 sm:text-xl">{t('app.name')}</h1>
            <p className="hidden truncate text-xs text-earth-600 sm:block">{t('app.tagline', 'Accredited Satellite & AI Agronomy Portal')}</p>
          </div>

          {/* View Switcher Navigation */}
          {farmer && (
            <nav className="flex items-center gap-1 rounded-xl bg-earth-100/70 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-white text-field-800 shadow-2xs font-bold'
                    : 'text-earth-600 hover:text-earth-900'
                }`}
              >
                🏠 Dashboard
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('map')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  currentView === 'map'
                    ? 'bg-white text-field-800 shadow-2xs font-bold'
                    : 'text-earth-600 hover:text-earth-900'
                }`}
              >
                🗺️ Draw Farm
              </button>
              {showReport && (
                <button
                  type="button"
                  onClick={() => setCurrentView('report')}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    currentView === 'report'
                      ? 'bg-white text-field-800 shadow-2xs font-bold'
                      : 'text-earth-600 hover:text-earth-900'
                  }`}
                >
                  📊 Report
                </button>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {farmer && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-earth-900">{farmer.farmer_name}</span>
                <span className="text-xs text-earth-500">DIF: {farmer.dif_code}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-field-50 px-3 py-1 text-xs font-bold text-field-800 border border-field-200">
                <svg className="h-3.5 w-3.5 text-field-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {farmer.senseorbit} {t('header.credits', 'Credits')}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-earth-200 px-2.5 py-1 text-xs font-medium text-earth-700 hover:bg-earth-50 focus:outline-none"
              >
                {t('header.logout', 'Sign Out')}
              </button>
            </div>
          )}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
