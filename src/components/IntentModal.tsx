import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface IntentModalProps {
  onNewSowing: () => void;
  onCropUpdate: (crop: string, sowingDate: string) => void;
  onCancel: () => void;
}

const COMMON_CROPS = [
  'Wheat', 'Rice/Paddy', 'Cotton', 'Sugarcane', 'Soybean', 'Maize',
  'Groundnut', 'Onion', 'Tomato', 'Sunflower', 'Chickpea', 'Mustard',
  'Jowar', 'Bajra', 'Lentil (Masoor)', 'Moong Dal', 'Tur/Arhar',
];

export function IntentModal({ onNewSowing, onCropUpdate, onCancel }: IntentModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'intent' | 'crop-details'>('intent');
  const [cropName, setCropName] = useState('');
  const [customCrop, setCustomCrop] = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  // Max sowing date: 365 days ago
  const minDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const handleCropUpdateSelect = () => {
    setStep('crop-details');
  };

  const effectiveCrop = cropName === '__custom__' ? customCrop.trim() : cropName;

  const handleConfirmCropUpdate = () => {
    if (!effectiveCrop) {
      setError('Please select or enter the crop name.');
      return;
    }
    if (!sowingDate) {
      setError('Please enter the sowing date.');
      return;
    }
    setError(null);
    onCropUpdate(effectiveCrop, sowingDate);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-earth-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-earth-100 px-6 py-5">
          <h2 className="text-xl font-bold text-earth-900">
            🌱 {t('intent.title')}
          </h2>
          <p className="mt-1 text-sm text-earth-500">
            {t('intent.subtitle')}
          </p>
        </div>

        <div className="p-6">
          {step === 'intent' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* New Sowing Card */}
              <button
                type="button"
                onClick={onNewSowing}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-field-200 bg-field-50 p-5 text-left transition-all hover:border-field-500 hover:bg-field-100 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-field-600 text-2xl shadow-sm group-hover:bg-field-700">
                  🌾
                </div>
                <div>
                  <h3 className="font-bold text-earth-900">
                    {t('intent.newSowing.title')}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-earth-600">
                    {t(
                      'intent.newSowing.desc',
                      'Get AI-powered crop recommendations based on NDVI, soil, weather & region data. Full farm scan included.',
                    )}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-1">
                  {['NDVI', 'Soil', 'Weather', 'AI Crop Pick'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-field-200 px-2 py-0.5 text-xs font-medium text-field-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>

              {/* Crop Updates Card */}
              <button
                type="button"
                onClick={handleCropUpdateSelect}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-5 text-left transition-all hover:border-blue-500 hover:bg-blue-100 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl shadow-sm group-hover:bg-blue-700">
                  💧
                </div>
                <div>
                  <h3 className="font-bold text-earth-900">
                    {t('intent.cropUpdate.title')}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-earth-600">
                    {t(
                      'intent.cropUpdate.desc',
                      'Get 7-day irrigation advisory, detailed fertilizer schedule & mandi prices for your sowed crop.',
                    )}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-1">
                  {['Irrigation', 'Fertilizer', 'Mandi Prices', 'AI Advice'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            </div>
          ) : (
            /* Crop Details Form */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('intent')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-earth-200 text-earth-600 hover:bg-earth-50"
                >
                  ←
                </button>
                <h3 className="font-semibold text-earth-900">
                  {t('intent.cropDetails.title')}
                </h3>
              </div>

              {/* Crop Selection */}
              <div>
                <label className="block text-sm font-medium text-earth-800">
                  {t('intent.cropDetails.cropLabel')} *
                </label>
                <select
                  value={cropName}
                  onChange={(e) => { setCropName(e.target.value); setError(null); }}
                  className="mt-1.5 w-full rounded-xl border border-earth-300 bg-white px-3 py-2.5 text-sm text-earth-900 focus:border-field-500 focus:outline-none focus:ring-2 focus:ring-field-500/20"
                >
                  <option value="">— Select crop —</option>
                  {COMMON_CROPS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">Other (type below)</option>
                </select>
                {cropName === '__custom__' && (
                  <input
                    type="text"
                    value={customCrop}
                    onChange={(e) => { setCustomCrop(e.target.value); setError(null); }}
                    placeholder="Enter crop name"
                    className="mt-2 w-full rounded-xl border border-earth-300 px-3 py-2.5 text-sm text-earth-900 focus:border-field-500 focus:outline-none focus:ring-2 focus:ring-field-500/20"
                  />
                )}
              </div>

              {/* Sowing Date */}
              <div>
                <label className="block text-sm font-medium text-earth-800">
                  {t('intent.cropDetails.sowingDateLabel')} *
                </label>
                <input
                  type="date"
                  value={sowingDate}
                  max={today}
                  min={minDate}
                  onChange={(e) => { setSowingDate(e.target.value); setError(null); }}
                  className="mt-1.5 w-full rounded-xl border border-earth-300 px-3 py-2.5 text-sm text-earth-900 focus:border-field-500 focus:outline-none focus:ring-2 focus:ring-field-500/20"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-700 leading-relaxed">
                💡 {t('intent.cropDetails.info')}
              </div>

              <button
                type="button"
                onClick={handleConfirmCropUpdate}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t('intent.cropDetails.confirm')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-earth-100 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-earth-500 hover:text-earth-800"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
