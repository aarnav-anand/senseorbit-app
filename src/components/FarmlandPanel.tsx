import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '../store/farmStore';
import { saveFarmland, listFarmlands, deleteFarmland } from '../lib/farmlands';
import type { Farmland } from '../lib/farmlands';
import type { Feature, Polygon } from 'geojson';

interface FarmlandPanelProps {
  onScan: () => void;
}

export function FarmlandPanel({ onScan }: FarmlandPanelProps) {
  const { t } = useTranslation();
  const farmer = useFarmStore((s) => s.farmer);
  const boundary = useFarmStore((s) => s.boundary);
  const farmlands = useFarmStore((s) => s.farmlands);
  const farmlandsLoading = useFarmStore((s) => s.farmlandsLoading);
  const setFarmlands = useFarmStore((s) => s.setFarmlands);
  const addFarmland = useFarmStore((s) => s.addFarmland);
  const removeFarmland = useFarmStore((s) => s.removeFarmland);
  const setFarmlandsLoading = useFarmStore((s) => s.setFarmlandsLoading);
  const setBoundary = useFarmStore((s) => s.setBoundary);
  const setLocationName = useFarmStore((s) => s.setLocationName);

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [farmName, setFarmName] = useState('My Farm');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFarmList, setShowFarmList] = useState(false);

  const loadFarmlands = useCallback(async () => {
    if (!farmer) return;
    setFarmlandsLoading(true);
    try {
      const list = await listFarmlands(farmer.id);
      setFarmlands(list);
    } catch (err) {
      console.error('Failed to load farmlands:', err);
    } finally {
      setFarmlandsLoading(false);
    }
  }, [farmer, setFarmlands, setFarmlandsLoading]);

  const handleToggleFarmList = () => {
    if (!showFarmList && farmlands.length === 0) {
      loadFarmlands();
    }
    setShowFarmList((v) => !v);
  };

  const handleSaveFarm = async () => {
    if (!farmer || !boundary) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const saved = await saveFarmland(
        farmer.id,
        farmName.trim() || 'My Farm',
        boundary.polygon,
        boundary.areaHectares,
        boundary.areaAcres,
        boundary.centroid[0],
        boundary.centroid[1],
      );
      addFarmland(saved);
      setSaveSuccess(`✅ "${saved.name}" saved successfully!`);
      setShowSaveForm(false);
      setFarmName('My Farm');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save farm.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFarm = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteFarmland(id);
      removeFarmland(id);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadFarm = (farm: Farmland) => {
    setBoundary({
      polygon: farm.polygon as Feature<Polygon>,
      areaHectares: farm.area_ha,
      areaAcres: farm.area_acres,
      centroid: [farm.centroid_lat, farm.centroid_lon],
      isValid: true,
    });
    setLocationName(farm.name);
    setShowFarmList(false);
  };

  if (!boundary?.isValid) return null;

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onScan}
          className="rounded-lg bg-field-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-field-700"
        >
          🔌 {t('map.analyzeButton')}
        </button>
        <button
          type="button"
          onClick={() => { setShowSaveForm((v) => !v); setSaveError(null); setSaveSuccess(null); }}
          className="rounded-lg border border-earth-300 bg-white px-4 py-2.5 text-sm font-medium text-earth-800 hover:bg-earth-50"
        >
          💾 {t('map.saveButton')}
        </button>
        <button
          type="button"
          onClick={handleToggleFarmList}
          className="rounded-lg border border-earth-200 bg-earth-50 px-4 py-2.5 text-sm font-medium text-earth-700 hover:bg-earth-100"
        >
          📋 {t('map.myFarmsButton')} {farmlands.length > 0 && `(${farmlands.length})`}
        </button>
      </div>

      {/* Save Farm Form */}
      {showSaveForm && (
        <div className="rounded-xl border border-field-200 bg-field-50 p-4">
          <p className="mb-3 text-sm font-semibold text-earth-900">
            💾 {t('map.saveFarm.title')}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder={t('map.saveFarm.placeholder')}
              maxLength={60}
              className="flex-1 rounded-lg border border-earth-300 px-3 py-2 text-sm focus:border-field-500 focus:outline-none focus:ring-2 focus:ring-field-500/20"
            />
            <button
              type="button"
              onClick={handleSaveFarm}
              disabled={isSaving}
              className="shrink-0 rounded-lg bg-field-600 px-4 py-2 text-sm font-semibold text-white hover:bg-field-700 disabled:opacity-60"
            >
              {isSaving ? '…' : t('common.save')}
            </button>
          </div>
          {saveError && (
            <p className="mt-2 text-xs text-red-600">{saveError}</p>
          )}
        </div>
      )}

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {saveSuccess}
        </div>
      )}

      {/* Farmland List */}
      {showFarmList && (
        <div className="rounded-xl border border-earth-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-earth-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-earth-900">
              📋 {t('map.myFarmsTitle')}
            </h4>
            <button
              type="button"
              onClick={loadFarmlands}
              disabled={farmlandsLoading}
              className="text-xs text-field-600 hover:underline disabled:opacity-60"
            >
              {farmlandsLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>

          {farmlandsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-field-500 border-t-transparent" />
            </div>
          ) : farmlands.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-earth-500">
              {t('map.noFarms')}
            </p>
          ) : (
            <ul className="divide-y divide-earth-50">
              {farmlands.map((farm) => (
                <li key={farm.id} className="flex items-center justify-between px-4 py-3 hover:bg-earth-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-earth-900">{farm.name}</p>
                    <p className="text-xs text-earth-500">
                      {farm.area_ha.toFixed(2)} ha · {farm.centroid_lat.toFixed(4)}, {farm.centroid_lon.toFixed(4)}
                    </p>
                    <p className="text-xs text-earth-400">
                      {new Date(farm.created_at!).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadFarm(farm)}
                      className="rounded-md bg-field-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-field-700"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFarm(farm.id)}
                      disabled={deletingId === farm.id}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === farm.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
