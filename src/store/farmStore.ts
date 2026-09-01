import { create } from 'zustand';
import type { Feature, Polygon } from 'geojson';
import type {
  WeatherResponse, SoilResponse, SatelliteResponse, NdviResponse,
  IrrigationAdvisory, FertilizerAdvice, GeminiCropAdvice, MandiResponse
} from '../types/report';
import type { Farmer } from '../lib/supabase';
import type { Farmland } from '../lib/farmlands';

export interface FarmBoundary {
  polygon: Feature<Polygon>;
  areaHectares: number;
  areaAcres: number;
  centroid: [number, number];
  isValid: boolean;
}

export type ReportTab = 'assessment' | 'weather' | 'satellite' | 'irrigation' | 'fertilizer' | 'mandi';

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
  currentView: 'dashboard' | 'map' | 'report';
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
  ndvi: NdviResponse | null;
  weatherError: string | null;
  soilError: string | null;
  satelliteError: string | null;
  ndviError: string | null;

  // Farmland management
  farmlands: Farmland[];
  farmlandsLoading: boolean;

  // Sowing intent
  sowingIntent: 'new' | 'update' | null;
  selectedCrop: string | null;
  sowingDate: string | null;

  // Crop update data
  irrigationAdvisory: IrrigationAdvisory | null;
  irrigationLoading: boolean;
  irrigationError: string | null;
  fertilizerAdvice: FertilizerAdvice | null;
  fertilizerLoading: boolean;
  fertilizerError: string | null;

  // New sowing Gemini advice
  geminiCropAdvice: GeminiCropAdvice | null;
  geminiCropLoading: boolean;
  geminiCropError: string | null;

  // Mandi prices
  mandiResponse: MandiResponse | null;
  mandiLoading: boolean;
  mandiError: string | null;

  setCurrentView: (view: 'dashboard' | 'map' | 'report') => void;
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
    ndvi: NdviResponse | null;
    weatherError?: string | null;
    soilError?: string | null;
    satelliteError?: string | null;
    ndviError?: string | null;
    locationName?: string;
  }) => void;
  setLoadingReport: (loading: boolean) => void;
  setReportError: (error: string | null) => void;
  setCreditExhaustedMessage: (msg: string | null) => void;
  setWaterBodyError: (msg: string | null) => void;
  resetReport: () => void;

  setFarmlands: (farmlands: Farmland[]) => void;
  addFarmland: (farmland: Farmland) => void;
  removeFarmland: (id: string) => void;
  setFarmlandsLoading: (loading: boolean) => void;

  setSowingIntent: (intent: 'new' | 'update' | null) => void;
  setSelectedCrop: (crop: string | null) => void;
  setSowingDate: (date: string | null) => void;

  setIrrigationAdvisory: (advisory: IrrigationAdvisory | null) => void;
  setIrrigationLoading: (loading: boolean) => void;
  setIrrigationError: (error: string | null) => void;
  setFertilizerAdvice: (advice: FertilizerAdvice | null) => void;
  setFertilizerLoading: (loading: boolean) => void;
  setFertilizerError: (error: string | null) => void;

  setGeminiCropAdvice: (advice: GeminiCropAdvice | null) => void;
  setGeminiCropLoading: (loading: boolean) => void;
  setGeminiCropError: (error: string | null) => void;

  setMandiResponse: (response: MandiResponse | null) => void;
  setMandiLoading: (loading: boolean) => void;
  setMandiError: (error: string | null) => void;
}

export const useFarmStore = create<FarmState>((set) => ({
  currentView: 'dashboard',
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
  ndvi: null,
  weatherError: null,
  soilError: null,
  satelliteError: null,
  ndviError: null,

  farmlands: [],
  farmlandsLoading: false,

  sowingIntent: null,
  selectedCrop: null,
  sowingDate: null,

  irrigationAdvisory: null,
  irrigationLoading: false,
  irrigationError: null,
  fertilizerAdvice: null,
  fertilizerLoading: false,
  fertilizerError: null,

  geminiCropAdvice: null,
  geminiCropLoading: false,
  geminiCropError: null,

  mandiResponse: null,
  mandiLoading: false,
  mandiError: null,

  setCurrentView: (currentView) => set({ currentView }),
  setFarmer: (farmer) => {
    saveStoredFarmer(farmer);
    set({ farmer });
  },

  logoutFarmer: () => {
    saveStoredFarmer(null);
    set({
      currentView: 'dashboard',
      farmer: null,
      showReport: false,
      boundary: null,
      weather: null,
      soil: null,
      satellite: null,
      ndvi: null,
      creditExhaustedMessage: null,
      waterBodyError: null,
      farmlands: [],
      sowingIntent: null,
      selectedCrop: null,
      sowingDate: null,
      irrigationAdvisory: null,
      fertilizerAdvice: null,
      geminiCropAdvice: null,
      mandiResponse: null,
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
      ndvi: data.ndvi,
      weatherError: data.weatherError ?? null,
      soilError: data.soilError ?? null,
      satelliteError: data.satelliteError ?? null,
      ndviError: data.ndviError ?? null,
      locationName: data.locationName ?? null,
      reportError: null,
    }),
  setLoadingReport: (isLoadingReport) => set({ isLoadingReport }),
  setReportError: (reportError) => set({ reportError }),
  setCreditExhaustedMessage: (creditExhaustedMessage) => set({ creditExhaustedMessage }),
  setWaterBodyError: (waterBodyError) => set({ waterBodyError }),
  resetReport: () =>
    set({
      currentView: 'dashboard',
      showReport: false,
      weather: null,
      soil: null,
      satellite: null,
      ndvi: null,
      weatherError: null,
      soilError: null,
      satelliteError: null,
      ndviError: null,
      reportError: null,
      isLoadingReport: false,
      creditExhaustedMessage: null,
      waterBodyError: null,
      sowingIntent: null,
      selectedCrop: null,
      sowingDate: null,
      irrigationAdvisory: null,
      irrigationLoading: false,
      irrigationError: null,
      fertilizerAdvice: null,
      fertilizerLoading: false,
      fertilizerError: null,
      geminiCropAdvice: null,
      geminiCropLoading: false,
      geminiCropError: null,
      mandiResponse: null,
      mandiLoading: false,
      mandiError: null,
    }),

  setFarmlands: (farmlands) => set({ farmlands }),
  addFarmland: (farmland) => set((state) => ({ farmlands: [...state.farmlands, farmland] })),
  removeFarmland: (id) => set((state) => ({ farmlands: state.farmlands.filter((f) => f.id !== id) })),
  setFarmlandsLoading: (farmlandsLoading) => set({ farmlandsLoading }),

  setSowingIntent: (sowingIntent) => set({ sowingIntent }),
  setSelectedCrop: (selectedCrop) => set({ selectedCrop }),
  setSowingDate: (sowingDate) => set({ sowingDate }),

  setIrrigationAdvisory: (irrigationAdvisory) => set({ irrigationAdvisory }),
  setIrrigationLoading: (irrigationLoading) => set({ irrigationLoading }),
  setIrrigationError: (irrigationError) => set({ irrigationError }),
  setFertilizerAdvice: (fertilizerAdvice) => set({ fertilizerAdvice }),
  setFertilizerLoading: (fertilizerLoading) => set({ fertilizerLoading }),
  setFertilizerError: (fertilizerError) => set({ fertilizerError }),

  setGeminiCropAdvice: (geminiCropAdvice) => set({ geminiCropAdvice }),
  setGeminiCropLoading: (geminiCropLoading) => set({ geminiCropLoading }),
  setGeminiCropError: (geminiCropError) => set({ geminiCropError }),

  setMandiResponse: (mandiResponse) => set({ mandiResponse }),
  setMandiLoading: (mandiLoading) => set({ mandiLoading }),
  setMandiError: (mandiError) => set({ mandiError }),
}));