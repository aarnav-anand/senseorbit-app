import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchFarmerByDifCode } from '../lib/supabase';
import { useFarmStore } from '../store/farmStore';
import { LanguageToggle } from './LanguageToggle';

export function LoginPage() {
  const { t } = useTranslation();
  const setFarmer = useFarmStore((s) => s.setFarmer);
  const [difCode, setDifCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = difCode.trim();
    if (!cleanCode) {
      setErrorMsg(t('login.emptyError', 'Please enter your 4-character DIF code.'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const farmer = await fetchFarmerByDifCode(cleanCode);
      if (!farmer) {
        setErrorMsg(
          t(
            'login.invalidCode',
            'Invalid DIF Code. Please check your 4-character code and try again.',
          ),
        );
      } else {
        setFarmer(farmer);
      }
    } catch (err) {
      setErrorMsg(
        t('login.networkError', 'Could not verify DIF code. Please check your connection.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-earth-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <LanguageToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-field-600 shadow-md">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V8.054M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-earth-900">
          {t('app.name', 'SenseOrbit')}
        </h2>
        <p className="mt-2 text-center text-sm text-earth-600">
          {t('login.subtitle', 'Enter your 4-character DIF code to sign in and view your farm scans')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-earth-200 bg-white py-8 px-6 shadow-sm sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="dif-code" className="block text-sm font-medium text-earth-800">
                {t('login.difCodeLabel', '4-Character DIF Code')}
              </label>
              <div className="mt-2">
                <input
                  id="dif-code"
                  name="difCode"
                  type="text"
                  maxLength={6}
                  required
                  value={difCode}
                  onChange={(e) => setDifCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB27"
                  className="w-full rounded-xl border border-earth-300 px-4 py-3 text-center text-xl font-bold tracking-widest text-earth-900 shadow-sm focus:border-field-600 focus:outline-none focus:ring-2 focus:ring-field-500/20"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center rounded-xl bg-field-600 py-3.5 px-4 text-base font-semibold text-white shadow-sm hover:bg-field-700 focus:outline-none focus:ring-2 focus:ring-field-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {isSubmitting
                  ? t('login.verifying', 'Verifying Code…')
                  : t('login.signInButton', 'Sign In')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
