# SenseOrbit - GitHub & Vercel Deployment Guide

This guide provides step-by-step instructions on deploying the SenseOrbit application to **GitHub** and **Vercel**.

---

## 1. Deploying to GitHub

### Step 1: Initialize Git & Commit Code
Open your terminal in the project directory (`c:\Users\Dell\Desktop\senseorbit-app`) and run:

```bash
# Initialize git repository
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "Refactor SenseOrbit: DIF code login, Supabase credits, accredited APIs, overall assessment"
```

### Step 2: Create a GitHub Repository
1. Go to [GitHub.com](https://github.com/new).
2. Enter Repository Name: `senseorbit-app`.
3. Choose **Public** or **Private**.
4. Leave "Add a README", ".gitignore", and "License" unchecked (we already created them).
5. Click **Create repository**.

### Step 3: Link & Push to GitHub
Run the commands provided by GitHub:

```bash
# Rename branch to main
git branch -M main

# Link remote origin (replace YOUR_GITHUB_USERNAME with your username)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/senseorbit-app.git

# Push code to GitHub
git push -u origin main
```

---

## 2. Deploying to Vercel

### Option A: Vercel Dashboard Deployment (Recommended)

1. Go to [Vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Import your `senseorbit-app` GitHub repository.
4. In the **Configure Project** screen:
   - **Framework Preset**: Select `Vite`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Add Environment Variables**:
   Expand **Environment Variables** and add the following keys:

   | Key | Value |
   | :--- | :--- |
   | `VITE_SUPABASE_URL` | `https://wicmrtvumrovpjiwuash.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpY21ydHZ1bXJvdnBqaXd1YXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTAwODQsImV4cCI6MjEwMjM2NjA4NH0.zinB9VBZ-GEWsfkQk8QAIk1Z_Jatd5CV0SJzpM_i56I` |
   | `OPEN_METEO_API_KEY` | *(Optional for commercial tier)* |
   | `ESRI_API_KEY` | *(Optional for premium ArcGIS services)* |
   | `SENTINEL_HUB_CLIENT_ID` | *(Optional for Copernicus Sentinel)* |

6. Click **Deploy**. Vercel will build your project, set up API routes (`/api/weather`, `/api/soil`, `/api/satellite`, `/api/geocode`), and generate a live URL.

---

### Option B: Vercel CLI Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 3. Automatic Continuous Deployment
Once linked, every `git push` to your `main` branch on GitHub will automatically trigger a Vercel deployment.
