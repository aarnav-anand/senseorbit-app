import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '../store/farmStore';
import { listFarmlands, deleteFarmland, type Farmland } from '../lib/farmlands';
import { IntentModal } from './IntentModal';
import type { Feature, Polygon } from 'geojson';

interface DashboardProps {
  onStartScan: (intent: 'new' | 'update', crop?: string, sowingDate?: string) => void;
  onCreateNewFarm: () => void;
}

export function Dashboard({ onStartScan, onCreateNewFarm }: DashboardProps) {
  const { t } = useTranslation();
  const farmer = useFarmStore((s) => s.farmer);
  const farmlands = useFarmStore((s) => s.farmlands);
  const farmlandsLoading = useFarmStore((s) => s.farmlandsLoading);
  const setFarmlands = useFarmStore((s) => s.setFarmlands);
  const removeFarmland = useFarmStore((s) => s.removeFarmland);
  const setFarmlandsLoading = useFarmStore((s) => s.setFarmlandsLoading);
  const setBoundary = useFarmStore((s) => s.setBoundary);
  const setLocationName = useFarmStore((s) => s.setLocationName);
  const setSowingIntent = useFarmStore((s) => s.setSowingIntent);
  const setSelectedCrop = useFarmStore((s) => s.setSelectedCrop);
  const setSowingDate = useFarmStore((s) => s.setSowingDate);
  const setCurrentView = useFarmStore((s) => s.setCurrentView);

  const [selectedFarmForScan, setSelectedFarmForScan] = useState<Farmland | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    if (!farmer) return;
    setFarmlandsLoading(true);
    setLoadError(null);
    try {
      const data = await listFarmlands(farmer.id);
      setFarmlands(data);
    } catch (err) {
      console.error('Error fetching farmlands:', err);
      setLoadError(t('dashboard.loadError', 'Could not load your saved farmlands.'));
    } finally {
      setFarmlandsLoading(false);
    }
  }, [farmer, setFarmlands, setFarmlandsLoading, t]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  const handleSelectFarmForScan = (farm: Farmland) => {
    // Set the boundary in store for this saved farm
    setBoundary({
      polygon: farm.polygon as Feature<Polygon>,
      areaHectares: farm.area_ha,
      areaAcres: farm.area_acres,
      centroid: [farm.centroid_lat, farm.centroid_lon],
      isValid: true,
    });
    setLocationName(farm.name);
    setSelectedFarmForScan(farm);
  };

  const handleViewFarmOnMap = (farm: Farmland) => {
    setBoundary({
      polygon: farm.polygon as Feature<Polygon>,
      areaHectares: farm.area_ha,
      areaAcres: farm.area_acres,
      centroid: [farm.centroid_lat, farm.centroid_lon],
      isValid: true,
    });
    setLocationName(farm.name);
    setCurrentView('map');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(t('dashboard.confirmDelete', 'Are you sure you want to delete this farmland?'))) return;
    setDeletingId(id);
    try {
      await deleteFarmland(id);
      removeFarmland(id);
    } catch (err) {
      alert(t('dashboard.deleteError', 'Failed to delete farmland.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleIntentNewSowing = () => {
    if (!selectedFarmForScan) return;
    setSelectedFarmForScan(null);
    setSowingIntent('new');
    setSelectedCrop(null);
    setSowingDate(null);
    onStartScan('new');
  };

  const handleIntentCropUpdate = (crop: string, sowingDate: string) => {
    if (!selectedFarmForScan) return;
    setSelectedFarmForScan(null);
    setSowingIntent('update');
    setSelectedCrop(crop);
    setSowingDate(sowingDate);
    onStartScan('update', crop, sowingDate);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-emerald-800 bg-emerald-900 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-100 border border-emerald-700/50">
              <span>🌾</span> SenseOrbit Farmland Portal
            </div>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl drop-shadow-xs">
              {t('dashboard.welcome', 'Welcome back')}, {farmer?.farmer_name}!
            </h2>
            <p className="mt-1 text-sm font-medium text-emerald-100">
              DIF Code: <span className="font-bold tracking-wider text-white underline decoration-emerald-400">{farmer?.dif_code}</span> · Manage your farmlands and run AI scans
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 px-5 py-3 border border-emerald-700/60 shadow-inner">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Available Credits</p>
                <p className="text-2xl font-black text-white">{farmer?.senseorbit ?? 0} Scans</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCreateNewFarm}
              className="w-full sm:w-auto rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-emerald-950 shadow-md hover:bg-emerald-50 transition-all hover:scale-105"
            >
              ➕ {t('dashboard.createNew', 'Create New Farmland')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-earth-900">
            🏡 {t('dashboard.myFarmsTitle', 'My Farmlands')}
          </h3>
          <p className="text-xs text-earth-500">
            Select an existing farm to run a scan or view details, or create a new farmland polygon.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFarms}
            disabled={farmlandsLoading}
            className="rounded-lg border border-earth-200 bg-white px-3.5 py-2 text-xs font-semibold text-earth-700 hover:bg-earth-50 disabled:opacity-50"
          >
            ↻ {farmlandsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onCreateNewFarm}
            className="rounded-lg bg-field-600 px-4 py-2 text-xs font-bold text-white hover:bg-field-700 shadow-xs"
          >
            ➕ Draw New Farm
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ {loadError}
        </div>
      )}

      {/* Farmlands Grid */}
      {farmlandsLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-field-600 border-t-transparent" />
            <p className="text-sm font-medium text-earth-700">Loading your saved farmlands…</p>
          </div>
        </div>
      ) : farmlands.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border-2 border-dashed border-earth-200 bg-white p-10 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-field-50 text-3xl shadow-xs">
            🌱
          </div>
          <h4 className="mt-4 text-lg font-bold text-earth-900">
            {t('dashboard.noFarmsTitle', 'No Farmlands Saved Yet')}
          </h4>
          <p className="mx-auto mt-1 max-w-md text-sm text-earth-600">
            {t('dashboard.noFarmsDesc', 'Draw your farm boundary on the interactive map to save it to your account and get satellite-based crop, soil, weather & market advice.')}
          </p>
          <button
            type="button"
            onClick={onCreateNewFarm}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-field-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-field-700 transition-all hover:scale-105"
          >
            🗺️ Draw Your First Farm →
          </button>
        </div>
      ) : (
        /* Farmland Cards Grid */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Create New Card (always first item in grid for easy access) */}
          <div
            onClick={onCreateNewFarm}
            className="group flex cursor-pointer flex-col items-center justify-center min-h-[200px] rounded-2xl border-2 border-dashed border-field-300 bg-field-50/50 p-6 text-center transition-all hover:border-field-500 hover:bg-field-50 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-field-600 text-white text-xl shadow-xs group-hover:scale-110 transition-transform">
              ➕
            </div>
            <h4 className="mt-3 font-bold text-field-900">Create New Farmland</h4>
            <p className="mt-1 text-xs text-field-700">Draw a new polygon on the interactive map</p>
          </div>

          {farmlands.map((farm) => (
            <div
              key={farm.id}
              className="flex flex-col justify-between rounded-2xl border border-earth-200 bg-white p-5 shadow-xs transition-all hover:border-field-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-block rounded-md bg-field-50 border border-field-200 px-2 py-0.5 text-[10px] font-bold text-field-800 uppercase tracking-wide">
                      Saved Farm
                    </span>
                    <h4 className="mt-1 truncate text-lg font-bold text-earth-900">{farm.name}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, farm.id)}
                    disabled={deletingId === farm.id}
                    title="Delete farm"
                    className="rounded-lg p-1.5 text-earth-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-earth-50 p-2.5">
                    <span className="text-earth-500 block">Area</span>
                    <span className="font-bold text-earth-900">{farm.area_ha.toFixed(2)} ha</span>
                    <span className="text-earth-400 block text-[10px]">({farm.area_acres.toFixed(2)} acres)</span>
                  </div>
                  <div className="rounded-lg bg-earth-50 p-2.5">
                    <span className="text-earth-500 block">Coordinates</span>
                    <span className="font-semibold text-earth-900">{farm.centroid_lat.toFixed(3)}, {farm.centroid_lon.toFixed(3)}</span>
                  </div>
                </div>

                {farm.created_at && (
                  <p className="mt-3 text-[11px] text-earth-400">
                    Added: {new Date(farm.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="mt-5 flex gap-2 pt-3 border-t border-earth-100">
                <button
                  type="button"
                  onClick={() => handleSelectFarmForScan(farm)}
                  className="flex-1 rounded-xl bg-field-600 py-2.5 text-xs font-bold text-white hover:bg-field-700 shadow-xs transition-colors"
                >
                  🔬 Scan Farm
                </button>
                <button
                  type="button"
                  onClick={() => handleViewFarmOnMap(farm)}
                  className="rounded-xl border border-earth-200 bg-earth-50 px-3 py-2.5 text-xs font-semibold text-earth-700 hover:bg-earth-100 transition-colors"
                >
                  🗺️ Map
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Intent Modal when scanning a saved farm */}
      {selectedFarmForScan && (
        <IntentModal
          onNewSowing={handleIntentNewSowing}
          onCropUpdate={handleIntentCropUpdate}
          onCancel={() => setSelectedFarmForScan(null)}
        />
      )}
    </div>
  );
}
