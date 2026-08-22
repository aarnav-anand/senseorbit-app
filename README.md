# SenseOrbit

Bilingual (Hindi/English) web app for farmers to draw farm boundaries and receive digital reports covering soil, weather, and satellite imagery — built entirely on free-tier APIs.

## Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server includes built-in API proxy routes (`/api/*`) so third-party APIs are never called from the browser.

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Serverless functions in `/api` handle weather (Open-Meteo), soil (SoilGrids), satellite (NASA GIBS / Esri), and geocoding (Nominatim).

## Project structure

```
src/           React frontend (map, report UI, i18n)
api/           Vercel serverless handlers
lib/           Shared API logic + dev proxy
```

## Features

- Leaflet + Geoman polygon drawing with Turf.js validation
- Hindi/English via react-i18next (`?lang=hi` URL param)
- Tabbed report: Soil · Weather · Satellite
- Client-side PDF export (jspdf + html2canvas)
- Aggressive server-side caching for free-tier limits

## Tech stack

React · Vite · Tailwind CSS · Leaflet · Turf.js · Zustand · i18next · Vercel
