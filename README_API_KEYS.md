# API Keys Configuration Guide

SenseOrbit integrates with accredited environmental & spatial data providers and Supabase. Below is a guide on where to place your API keys.

---

## 1. Where to Place API Keys

Place your keys in the `.env` file at the root of the project:
`c:\Users\Dell\Desktop\senseorbit-app\.env`

For production deployment (e.g. Vercel), add these variables in your Vercel Project Settings under **Environment Variables**.

---

## 2. API Key Details & Provider Links

### A. Supabase Database (`VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`)
- **Purpose**: Authenticates farmers via 4-character DIF code and manages scan credits (`senseorbit` column).
- **Default Configured**:
  - `VITE_SUPABASE_URL`: `https://wicmrtvumrovpjiwuash.supabase.co`
  - `VITE_SUPABASE_ANON_KEY`: Set in `.env`

### B. Weather Data: Open-Meteo (`OPEN_METEO_API_KEY`)
- **Purpose**: Fetches real-time microclimate weather forecast, temperature, humidity, and 6-month historical rainfall.
- **Access**: Open-Meteo provides free open access for standard non-commercial use out-of-the-box. If using commercial high-volume API keys, paste your key into `OPEN_METEO_API_KEY`.

### C. Soil Data: ISRIC SoilGrids
- **Purpose**: Fetches 250m global soil property profiles (pH, Organic Carbon, Nitrogen, Clay/Sand/Silt, Bulk Density across depths).
- **Access**: Uses standard open REST endpoints from ISRIC World Soil Information (`https://rest.isric.org/soilgrids/v2.0/properties/query`). No API key required.

### D. Satellite Imagery: Esri World Imagery & NASA GIBS / Copernicus
- **Purpose**: High-resolution satellite basemaps and Earth observation layers.
- **Access**: Esri World Imagery tiles are accessed via ArcGIS services. Optional premium ArcGIS key can be set under `ESRI_API_KEY`.
- **Copernicus / Sentinel-2**: Optional `SENTINEL_HUB_CLIENT_ID` and `SENTINEL_HUB_CLIENT_SECRET` for direct Sentinel-2 L2A tile processing.

---

## 3. Data Attribution Summary
All scan reports and map visualizers display the required accredited attribution:
`Imagery from Esri, other data from OpenStreetMap contributors · Contains modified Copernicus Sentinel data · Soil data © ISRIC SoilGrids · Weather data © Open-Meteo`
