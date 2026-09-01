# SenseOrbit — GitHub & Vercel Deployment Guide

This comprehensive guide details the step-by-step instructions to deploy SenseOrbit to **Supabase**, **GitHub**, and **Vercel**.

---

## 1. Supabase Setup (Database & Farmland Table)

Before deploying the frontend, ensure your Supabase project contains the `farmlands` table so farmers can save and retrieve their farm polygons.

### Step 1: Open Supabase SQL Editor
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`wicmrtvumrovpjiwuash`).
3. Click **SQL Editor** in the left sidebar.

### Step 2: Execute Table & Security Script
Paste and run the following SQL script:

```sql
-- 1. Create farmlands table
CREATE TABLE IF NOT EXISTS public.farmlands (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  farmer_id    UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'My Farm',
  area_ha      NUMERIC(10,4) NOT NULL,
  area_acres   NUMERIC(10,4) NOT NULL,
  centroid_lat DOUBLE PRECISION NOT NULL,
  centroid_lon DOUBLE PRECISION NOT NULL,
  polygon      JSONB NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.farmlands ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Access Policy
CREATE POLICY "Allow public read/write for farmlands"
  ON public.farmlands
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

---

## 2. API Keys Acquisition

SenseOrbit uses two key public/free APIs:

1. **Google Gemini API** (`GEMINI_API_KEY`):
   - Used for LLM-based crop selection (new sowing) and detailed fertilizer schedules (crop updates).
   - Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).

2. **Government of India Agmarknet API** (`AGMARKNET_API_KEY`):
   - Used for live mandi prices in nearby markets.
   - Get a free API key at [data.gov.in](https://data.gov.in/user/register) (2-minute signup).

---

## 3. Deploying to GitHub

### Step 1: Commit Your Code
Open terminal in `c:\Users\Dell\Desktop\senseorbit-app` and execute:

```bash
# Stage all modified and new files
git add .

# Commit changes
git commit -m "Add farmland management, Gemini crop/fertilizer advice, irrigation forecast & mandi prices"
```

### Step 2: Push to GitHub Remote
```bash
# Push to main branch
git push -u origin main
```

---

## 4. Deploying to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Sign in to [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your `senseorbit-app` GitHub repository.
4. **Build Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**: Add the following keys under Project Settings:

   | Environment Variable | Description / Value | Required? |
   | :--- | :--- | :--- |
   | `VITE_SUPABASE_URL` | `https://wicmrtvumrovpjiwuash.supabase.co` | Yes |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI...` | Yes |
   | `GEMINI_API_KEY` | Your Google AI Studio Key | Yes |
   | `AGMARKNET_API_KEY` | Your Data.gov.in API Key | Yes |
   | `OPEN_METEO_API_KEY` | *(Optional for commercial tier Open-Meteo)* | Optional |
   | `ESRI_API_KEY` | *(Optional for premium Esri Basemaps)* | Optional |

6. Click **Deploy**. Vercel will deploy the web app and all 7 serverless functions:
   - `/api/check-water`
   - `/api/geocode`
   - `/api/ndvi`
   - `/api/satellite`
   - `/api/soil`
   - `/api/weather`
   - `/api/gemini-advisor` *(New)*
   - `/api/irrigation` *(New)*
   - `/api/mandi` *(New)*

---

### Option B: Vercel CLI

```bash
# Deploy to production using CLI
vercel --prod
```

---

## 5. Verification Checklist

After deployment:
1. Log in with a 4-character DIF code (e.g. `AB27`).
2. Draw a polygon on the map:
   - Click **Save as Farm** → Enter farm name → Verify it appears under **My Farms**.
   - Click **Analyze This Boundary**.
3. Choose **Plan New Sowing**:
   - Verify full scan runs (Soil, Weather, Satellite, NDVI).
   - Check Overall Assessment tab for **Gemini AI Crop Selection Advisor**.
4. Choose **Updates on Existing Crop**:
   - Select crop & sowing date → Click Run Full Scan.
   - Verify **7-Day Irrigation Advisory** tab appears with Open-Meteo + SoilGrids data.
   - Verify **Fertilizer Schedule** tab appears with Gemini AI NPK guidance.
   - Verify **Mandi Prices** tab shows market prices for auto-detected state.
