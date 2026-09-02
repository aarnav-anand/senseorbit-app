import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AdvisorRequest {
  lat: number;
  lon: number;
  mode: 'new_sowing' | 'fertilizer';
  locale?: string;
  ndviMean?: number;
  soilPh?: number;
  soilTexture?: string;
  soilOC?: number;
  soilBD?: number;
  soilN?: number;
  rainfall16Days?: number;
  temperature?: number;
  humidity?: number;
  region?: string;
  crop?: string;
  sowingDate?: string;
  areaHectares?: number;
}

function buildNewSowingPrompt(body: AdvisorRequest): string {
  const currentDate = new Date().toISOString().slice(0, 10);
  const region = body.region || `lat ${body.lat?.toFixed(2)}, lon ${body.lon?.toFixed(2)} (India)`;
  const isHindi = body.locale?.startsWith('hi');
  const langInstruction = isHindi
    ? `\nCRITICAL LANGUAGE INSTRUCTION: The farmer selected HINDI language. You MUST write all string values (topCrop, topCropReason, crop names in alternatives, reason in alternatives, bestSowingWindow, keyRisks, summary) in HINDI using Devanagari script (e.g. कपास, गेहूं, मक्का, मूंगफली, धान इत्यादि). Return pure valid JSON.`
    : `\nCRITICAL LANGUAGE INSTRUCTION: The farmer selected ENGLISH language. Write all text in ENGLISH. Return pure valid JSON.`;

  return `You are a senior Indian agricultural scientist. A farmer in ${region} wants to know the best crop to sow this season.

Field Data (real-time from satellites and sensors):
- NDVI (Vegetation Index): ${body.ndviMean != null ? body.ndviMean.toFixed(3) : 'unknown'}
- Soil pH: ${body.soilPh != null ? body.soilPh.toFixed(1) : 'unknown'}
- Soil Texture: ${body.soilTexture || 'unknown'}
- Soil Organic Carbon: ${body.soilOC != null ? body.soilOC.toFixed(2) + ' g/kg' : 'unknown'}
- Soil Bulk Density: ${body.soilBD != null ? body.soilBD.toFixed(2) + ' kg/dm³' : 'unknown'}
- Soil Nitrogen: ${body.soilN != null ? body.soilN.toFixed(2) + ' g/kg' : 'unknown'}
- 16-Day Cumulative Rainfall: ${body.rainfall16Days != null ? body.rainfall16Days.toFixed(1) + ' mm' : 'unknown'}
- Current Temperature: ${body.temperature != null ? body.temperature.toFixed(1) + '°C' : 'unknown'}
- Current Humidity: ${body.humidity != null ? body.humidity.toFixed(0) + '%' : 'unknown'}
- Farm Area: ${body.areaHectares != null ? body.areaHectares.toFixed(2) + ' hectares' : 'unknown'}
- Current Date: ${currentDate}

Based on these signals, provide your best agronomic recommendation. Consider:
1. Season (Kharif/Rabi/Zaid) based on current date and region
2. Soil suitability for each crop
3. Water availability from rainfall and NDVI
4. Temperature requirements
${langInstruction}

Provide your response in this EXACT JSON format (no markdown, no code blocks, pure JSON):
{
  "topCrop": "name of single best crop to sow",
  "topCropReason": "2-3 detailed sentences explaining why this is the best choice, citing specific NDVI, soil pH, rainfall, and temperature signals",
  "alternatives": [
    { "crop": "second best crop", "suitability": "High", "reason": "1-2 sentence reason based on field data" },
    { "crop": "third best crop", "suitability": "Medium", "reason": "1-2 sentence reason based on field data" }
  ],
  "bestSowingWindow": "specific date range e.g. September 5-20, 2025",
  "keyRisks": ["specific risk 1 based on data", "specific risk 2 based on data"],
  "summary": "3-4 sentence recommendation narrative"
}`;
}

function buildFertilizerPrompt(body: AdvisorRequest): string {
  const currentDate = new Date().toISOString().slice(0, 10);
  const region = body.region || `lat ${body.lat?.toFixed(2)}, lon ${body.lon?.toFixed(2)} (India)`;
  const crop = body.crop || 'unknown crop';
  const sowingDate = body.sowingDate || 'unknown';
  let daysElapsed = 0;
  if (body.sowingDate) {
    daysElapsed = Math.floor((Date.now() - new Date(body.sowingDate).getTime()) / (1000 * 60 * 60 * 24));
  }
  const isHindi = body.locale?.startsWith('hi');
  const langInstruction = isHindi
    ? `\nCRITICAL LANGUAGE INSTRUCTION: The farmer selected HINDI language. You MUST write all string values (timing, fertilizer names, method, notes, nutrient, product, dose, placementGuidance, organicAmendments, warnings, summary) in HINDI using Devanagari script (e.g. यूरिया (Urea), डीएपी (DAP), एमओपी (MOP), एनपीके (NPK), बुआई के समय, पहली शीर्ष खाद, छिड़काव, जिंक सल्फेट इत्यादि). Return pure valid JSON.`
    : `\nCRITICAL LANGUAGE INSTRUCTION: The farmer selected ENGLISH language. Write all text in ENGLISH. Return pure valid JSON.`;

  return `You are a senior Indian agronomist and crop nutrition expert. A farmer in ${region} is growing ${crop}, sown on ${sowingDate} (${daysElapsed} days ago) on a ${body.areaHectares?.toFixed(2) ?? 'unknown'} hectare farm.

Current Field Data (from satellites and sensors):
- Soil pH: ${body.soilPh != null ? body.soilPh.toFixed(1) : 'unknown'}
- Soil Texture: ${body.soilTexture || 'unknown'}
- Organic Carbon: ${body.soilOC != null ? body.soilOC.toFixed(2) + ' g/kg' : 'unknown'}
- Bulk Density: ${body.soilBD != null ? body.soilBD.toFixed(2) + ' kg/dm³' : 'unknown'}
- Soil Nitrogen: ${body.soilN != null ? body.soilN.toFixed(2) + ' g/kg' : 'unknown'}
- NDVI: ${body.ndviMean != null ? body.ndviMean.toFixed(3) : 'unknown'}
- 16-Day Rainfall: ${body.rainfall16Days != null ? body.rainfall16Days.toFixed(1) + ' mm' : 'unknown'}
- Current Date: ${currentDate}

Provide a detailed, practical fertilizer advisory suitable for an Indian farmer using government-recognized fertilizers (DAP, Urea, MOP, NPK grades like 12:32:16, 10:26:26, etc.) available in Indian markets.
${langInstruction}

Respond in this EXACT JSON format (no markdown, no code blocks, pure JSON):
{
  "schedule": [
    {
      "timing": "timing description",
      "fertilizer": "fertilizer name",
      "npkGrade": "e.g. 18-46-0",
      "qtyPerHectare": "e.g. 100 kg/ha",
      "method": "application method",
      "notes": "application notes"
    }
  ],
  "micronutrients": [
    { "nutrient": "nutrient name", "product": "product name", "dose": "e.g. 25 kg/ha", "timing": "timing" }
  ],
  "placementGuidance": "2-3 sentences on placement",
  "organicAmendments": "1-2 sentences on organic amendments",
  "warnings": ["warning 1", "warning 2"],
  "summary": "3-4 sentence narrative summary"
}`;
}

async function callAIModel(prompt: string, apiKey: string): Promise<object> {
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => String(response.status));
        lastError = new Error(`AI Model (${model}) error ${response.status}: ${errText}`);
        continue;
      }

      const aiData = await response.json();
      const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error(`Empty response from AI Model ${model}`);
        continue;
      }

      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error('Failed to query AI Model API');
}

async function callAdvancedAIModel(prompt: string, apiKey: string): Promise<object> {
  const models = ['mistral-small-latest', 'mistral-medium-latest', 'open-mistral-7b', 'mistral-tiny'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = 'https://api.mistral.ai/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => String(response.status));
        lastError = new Error(`Advanced AI Model (${model}) error ${response.status}: ${errText}`);
        continue;
      }

      const mistralData = await response.json();
      const rawText = mistralData?.choices?.[0]?.message?.content;
      if (!rawText) {
        lastError = new Error(`Empty response from Advanced AI Model ${model}`);
        continue;
      }

      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error('Failed to query Advanced AI Model API');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!geminiKey && !mistralKey) {
    return res.status(503).json({
      error: 'AI API Key not configured. Add GEMINI_API_KEY or MISTRAL_API_KEY in Vercel environment variables.',
    });
  }

  const body = req.body as AdvisorRequest;
  if (!body || !body.mode) {
    return res.status(400).json({ error: 'Request body with "mode" field is required.' });
  }

  let prompt: string;
  if (body.mode === 'new_sowing') {
    prompt = buildNewSowingPrompt(body);
  } else if (body.mode === 'fertilizer') {
    if (!body.crop) return res.status(400).json({ error: '"crop" is required for fertilizer mode.' });
    prompt = buildFertilizerPrompt(body);
  } else {
    return res.status(400).json({ error: 'Invalid mode. Use "new_sowing" or "fertilizer".' });
  }

  // 1. Try primary AI Model (Gemini) if key available
  if (geminiKey) {
    try {
      const result = await callAIModel(prompt, geminiKey);
      return res.status(200).json({ ...result, provider: 'AI Model' });
    } catch (geminiErr) {
      console.warn('AI Model failed, attempting Advanced AI Model fallback:', geminiErr);
    }
  }

  // 2. Try Advanced AI Model (Mistral) if key available or as fallback
  if (mistralKey) {
    try {
      const result = await callAdvancedAIModel(prompt, mistralKey);
      return res.status(200).json({ ...result, provider: 'Advanced AI Model' });
    } catch (mistralErr) {
      console.error('Advanced AI Model fallback failed:', mistralErr);
    }
  }

  return res.status(500).json({
    error: 'AI advisory services failed. Please verify API key configuration.',
  });
}
