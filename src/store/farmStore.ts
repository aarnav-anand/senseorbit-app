import { create } from 'zustand';
import type { Feature, Polygon } from 'geojson';
import type { WeatherResponse, SoilResponse, SatelliteResponse } from '../types/report';
import type { Farmer } from '../lib/supabase';

export interface FarmBoundary {
  polygon: Feature<Polygon>;
  areaHectares: number;
  areaAcres: number;
  centroid: [number, number];
  isValid: boolean;
}

export type ReportTab = 'assessment' | 'weather' | 'satellite';

const STORAGE_KEY = 'senseorbit_farmer_session';

function loadStoredFarmer(): Farmer | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveStoredFarmer(farmer: Farmer | null) {
  try {
    if (farmer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(farmer));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

interface FarmState {
  farmer: Farmer | null;
  boundary: FarmBoundary | null;
  locationName: string | null;
  showReport: boolean;
  activeTab: ReportTab;
  isLoadingReport: boolean;
  reportError: string | null;
  creditExhaustedMessage: string | null;
  waterBodyError: string | null;

  weather: WeatherResponse | null;
  soil: SoilResponse | null;
  satellite: SatelliteResponse | null;
  weatherError: string | null;
  soilError: string | null;
  satelliteError: string | null;

  setFarmer: (farmer: Farmer | null) => void;
  logoutFarmer: () => void;
  updateCredits: (credits: number) => void;
  setBoundary: (boundary: FarmBoundary | null) => void;
  setLocationName: (name: string | null) => void;
  setShowReport: (show: boolean) => void;
  setActiveTab: (tab: ReportTab) => void;
  setReportData: (data: {
    weather: WeatherResponse | null;
    soil: SoilResponse | null;
    satellite: SatelliteResponse | null;
    weatherError?: string | null;
    soilError?: string | null;
    satelliteError?: string | null;
    locationName?: string;
  }) => void;
  setLoadingReport: (loading: boolean) => void;
  setReportError: (error: string | null) => void;
  setCreditExhaustedMessage: (msg: string | null) => void;
  setWaterBodyError: (msg: string | null) => void;
  resetReport: () => void;
}

export const useFarmStore = create<FarmState>((set) => ({
  farmer: loadStoredFarmer(),
  boundary: null,
  locationName: null,
  showReport: false,
  activeTab: 'assessment',
  isLoadingReport: false,
  reportError: null,
  creditExhaustedMessage: null,
  waterBodyError: null,

  weather: null,
  soil: null,
  satellite: null,
  weatherError: null,
  soilError: null,
  satelliteError: null,

  setFarmer: (farmer) => {
    saveStoredFarmer(farmer);
    set({ farmer });
  },

  logoutFarmer: () => {
    saveStoredFarmer(null);
    set({
      farmer: null,
      showReport: false,
      boundary: null,
      weather: null,
      soil: null,
      satellite: null,
      creditExhaustedMessage: null,
      waterBodyError: null,
    });
  },

  updateCredits: (senseorbit) =>
    set((state) => {
      if (!state.farmer) return state;
      const updated = { ...state.farmer, senseorbit };
      saveStoredFarmer(updated);
      return { farmer: updated };
    }),

  setBoundary: (boundary) => set({ boundary, waterBodyError: null }),
  setLocationName: (locationName) => set({ locationName }),
  setShowReport: (showReport) => set({ showReport }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setReportData: (data) =>
    set({
      weather: data.weather,
      soil: data.soil,
      satellite: data.satellite,
      weatherError: data.weatherError ?? null,
      soilError: data.soilError ?? null,
      satelliteError: data.satelliteError ?? null,
      locationName: data.locationName ?? null,
      reportError: null,
    }),
  setLoadingReport: (isLoadingReport) => set({ isLoadingReport }),
  setReportError: (reportError) => set({ reportError }),
  setCreditExhaustedMessage: (creditExhaustedMessage) => set({ creditExhaustedMessage }),
  setWaterBodyError: (waterBodyError) => set({ waterBodyError }),
  resetReport: () =>
    set({
      showReport: false,
      weather: null,
      soil: null,
      satellite: null,
      weatherError: null,
      soilError: null,
      satelliteError: null,
      reportError: null,
      isLoadingReport: false,
      creditExhaustedMessage: null,
      waterBodyError: null,
    }),
}));
