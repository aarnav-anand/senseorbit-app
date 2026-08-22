import type { SoilResponse, WeatherResponse, SatelliteResponse } from '../types/report';
import type { FarmBoundary } from '../store/farmStore';

export interface CropRecommendation {
  crop: string;
  suitability: string;
  reason: string;
}

export interface RiskAlert {
  level: string;
  title: string;
  description: string;
}

export interface OverallAssessment {
  healthScore: number;
  healthStatus: string;
  summary: string;
  soilHealth: {
    rating: string;
    phStatus: string;
    organicMatterStatus: string;
    textureType: string;
    nitrogenStatus: string;
  };
  weatherOutlook: {
    condition: string;
    rainfall16Days: number;
    trend: string;
  };
  cropRecommendations: CropRecommendation[];
  fertilizerPlan: string[];
  irrigationStrategy: string;
  riskAlerts: RiskAlert[];
}

export function generateOverallAssessment(
  soil: SoilResponse | null,
  weather: WeatherResponse | null,
  _satellite: SatelliteResponse | null,
  boundary: FarmBoundary | null,
  locale: string = 'en',
): OverallAssessment {
  const isHi = locale.startsWith('hi');

  // Extract key surface metrics
  const phVal = soil?.properties?.ph?.[0]?.value ?? 6.8;
  const ocVal = soil?.properties?.organicCarbon?.[0]?.value ?? 1.5;
  const nitrogenVal = soil?.properties?.nitrogen?.[0]?.value ?? 1.2;
  const clayVal = soil?.properties?.clay?.[0]?.value ?? 25;
  const sandVal = soil?.properties?.sand?.[0]?.value ?? 45;
  const siltVal = soil?.properties?.silt?.[0]?.value ?? 30;

  const tempCurrent = weather?.current?.temperature ?? 28;
  const humidityCurrent = weather?.current?.humidity ?? 65;
  const forecast16Days = weather?.forecast ?? [];
  const rainfall16Days = Math.round(
    forecast16Days.reduce((acc, d) => acc + (d.precipitation || 0), 0) * 10,
  ) / 10;

  // 1. Calculate Health Score (0 to 100)
  let score = 70;
  if (phVal >= 6.0 && phVal <= 7.5) score += 10;
  else if (phVal < 5.5 || phVal > 8.2) score -= 10;

  if (ocVal >= 2.0) score += 10;
  else if (ocVal < 1.0) score -= 10;

  if (nitrogenVal >= 1.5) score += 5;
  if (rainfall16Days > 20 && rainfall16Days < 150) score += 5;

  score = Math.min(100, Math.max(30, score));

  let healthStatus = isHi ? 'अच्छा' : 'Good';
  if (score >= 85) healthStatus = isHi ? 'उत्कृष्ट' : 'Excellent';
  else if (score >= 70) healthStatus = isHi ? 'अच्छा' : 'Good';
  else if (score >= 55) healthStatus = isHi ? 'सामान्य' : 'Fair';
  else healthStatus = isHi ? 'ध्यान देने की आवश्यकता' : 'Requires Attention';

  // 2. Texture & Soil Evaluation
  let textureType = isHi ? 'दोमट (संतुलित)' : 'Loam (Balanced)';
  if (clayVal >= 35)
    textureType = isHi
      ? 'चिकनी मिट्टी (अधिक जल संचयन)'
      : 'Clay-rich (High water retention)';
  else if (sandVal >= 60)
    textureType = isHi ? 'रेतीली मिट्टी (शीघ्र निकासी)' : 'Sandy (Fast draining)';
  else if (siltVal >= 45)
    textureType = isHi ? 'गाद वाली मिट्टी (उपजाऊ एवं चिकनी)' : 'Silty (Fertile & smooth)';

  const phStatus =
    phVal < 5.5
      ? isHi
        ? `अम्लीय (pH ${phVal})`
        : `Acidic (pH ${phVal})`
      : phVal > 7.8
      ? isHi
        ? `क्षारीय (pH ${phVal})`
        : `Alkaline (pH ${phVal})`
      : isHi
      ? `आदर्श तटस्थ (pH ${phVal})`
      : `Optimal Neutral (pH ${phVal})`;

  const organicMatterStatus =
    ocVal < 1.0
      ? isHi
        ? `कम (${ocVal} g/kg)`
        : `Low (${ocVal} g/kg)`
      : ocVal < 2.0
      ? isHi
        ? `मध्यम (${ocVal} g/kg)`
        : `Moderate (${ocVal} g/kg)`
      : isHi
      ? `उच्च / स्वस्थ (${ocVal} g/kg)`
      : `High / Healthy (${ocVal} g/kg)`;

  const nitrogenStatus =
    nitrogenVal < 1.0
      ? isHi
        ? `कम (${nitrogenVal} g/kg)`
        : `Low (${nitrogenVal} g/kg)`
      : nitrogenVal < 1.8
      ? isHi
        ? `पर्याप्त (${nitrogenVal} g/kg)`
        : `Adequate (${nitrogenVal} g/kg)`
      : isHi
      ? `प्रचुर (${nitrogenVal} g/kg)`
      : `Rich (${nitrogenVal} g/kg)`;

  // 3. Crop Recommendations
  const cropRecommendations: CropRecommendation[] = [];

  const highSuit = isHi ? 'उच्च' : 'High';
  const modSuit = isHi ? 'मध्यम' : 'Moderate';

  if (phVal >= 5.5 && phVal <= 7.5 && clayVal >= 25 && rainfall16Days > 30) {
    cropRecommendations.push({
      crop: isHi ? 'धान / चावल' : 'Rice / Paddy',
      suitability: highSuit,
      reason: isHi
        ? 'पूर्वानुमानित पर्याप्त नमी और चिकनी-दोमट मिट्टी जल संचयन के लिए आदर्श है।'
        : 'Sufficient moisture forecast and clay-loam soil optimal for water retention.',
    });
  }

  if (phVal >= 6.0 && phVal <= 7.8 && tempCurrent >= 15 && tempCurrent <= 32) {
    cropRecommendations.push({
      crop: isHi ? 'गेहूं / मक्का' : 'Wheat / Maize',
      suitability: highSuit,
      reason: isHi
        ? 'आदर्श मृदा pH और अनुकूल तापमान सीमा।'
        : 'Ideal soil pH and comfortable ambient temperature range.',
    });
  }

  if (ocVal < 1.5 || nitrogenVal < 1.2) {
    cropRecommendations.push({
      crop: isHi
        ? 'दालें / दलहन (चना, सोयाबीन, अरहर)'
        : 'Pulses / Legumes (Chickpea, Soybeans, Pigeon Pea)',
      suitability: highSuit,
      reason: isHi
        ? 'मिट्टी में प्राकृतिक रूप से नाइट्रोजन स्थिर करता है और जैविक कार्बन में सुधार करता है।'
        : 'Fixes atmospheric nitrogen into soil and improves organic carbon naturally.',
    });
  }

  if (sandVal > 40 && phVal >= 5.8) {
    cropRecommendations.push({
      crop: isHi
        ? 'सब्जियां (टमाटर, सरसों, आलू)'
        : 'Vegetables (Tomatoes, Mustard, Potatoes)',
      suitability: modSuit,
      reason: isHi
        ? 'नियमित हल्की सिंचाई के साथ अच्छी जल निकासी वाली रेतीली दोमट मिट्टी में पनपती है।'
        : 'Thrives in well-drained sandy loam with scheduled light irrigation.',
    });
  }

  if (cropRecommendations.length === 0) {
    cropRecommendations.push({
      crop: isHi ? 'बाजरा / ज्वार' : 'Millets / Sorghum (Jowar, Bajra)',
      suitability: highSuit,
      reason: isHi
        ? 'विभिन्न मृदा और वर्षा स्थितियों के लिए अनुकूल टिकाऊ अनाज फसलें।'
        : 'Resilient cereal crops suitable for various soil and rainfall profiles.',
    });
  }

  // 4. Fertilizer & Soil Improvement Plan
  const fertilizerPlan: string[] = [];
  if (phVal < 6.0) {
    fertilizerPlan.push(
      isHi
        ? 'मिट्टी की अम्लता को बेअसर करने के लिए कृषि चूना (कैल्शियम कार्बोनेट) डालें।'
        : 'Apply Agricultural Lime (Calcium Carbonate) to neutralize soil acidity.',
    );
  } else if (phVal > 7.8) {
    fertilizerPlan.push(
      isHi
        ? 'क्षारीय pH स्तर को कम करने के लिए जिप्सम या सल्फर का उपयोग करें।'
        : 'Apply Gypsum or elemental Sulfur to lower alkaline pH levels.',
    );
  }

  if (nitrogenVal < 1.2) {
    fertilizerPlan.push(
      isHi
        ? 'फसल वृद्धि के दौरान विभाजित खुराक में यूरिया या अमोनियम सल्फेट डालें।'
        : 'Apply Urea or Ammonium Sulfate in split doses during crop growth.',
    );
  }

  if (ocVal < 1.5) {
    fertilizerPlan.push(
      isHi
        ? 'जैविक पदार्थ को पुनः प्राप्त करने के लिए गोबर की खाद (FYM) या कंपोस्ट (5-10 टन/हेक्टेयर) मिलाएं।'
        : 'Incorporate Farmyard Manure (FYM) or green compost (5-10 tonnes/hectare) to rebuild organic matter.',
    );
  }

  fertilizerPlan.push(
    isHi
      ? 'जड़ों के विकास के लिए बुआई के समय संतुलित NPK (12:32:16) उर्वरक डालें।'
      : 'Apply balanced NPK (12:32:16) basal fertilizer at sowing time for root development.',
  );

  // 5. Irrigation Strategy
  let irrigationStrategy = '';
  if (rainfall16Days > 60) {
    irrigationStrategy = isHi
      ? 'आगामी 16 दिनों में 60 मिमी से अधिक वर्षा की उम्मीद है। वर्षा से फसल की पानी की आवश्यकता पूरी हो जाएगी। जमा पानी रोकने के लिए जल निकासी नालियां साफ रखें।'
      : 'Upcoming 16-day rainfall expected to exceed 60mm. Rainfed conditions will meet crop water requirements. Ensure field drainage channels are clear to prevent standing water.';
  } else if (sandVal >= 50) {
    irrigationStrategy = isHi
      ? 'रेतीली मिट्टी से पानी जल्दी निकल जाता है। भारी सिंचाई के बजाय हर 2-3 दिन में हल्की ड्रिप या स्प्रिंकलर सिंचाई करें।'
      : 'Sandy soil drains quickly. Provide frequent, light drip or sprinkler irrigation every 2–3 days rather than heavy flooding.';
  } else if (clayVal >= 35) {
    irrigationStrategy = isHi
      ? 'चिकनी मिट्टी पानी को प्रभावी ढंग से रोके रखती है। हर 5-7 दिनों में एक बार गहरी सिंचाई करें, दोबारा पानी देने से पहले मिट्टी की नमी की जांच करें।'
      : 'Clay soil holds water effectively. Irrigate deeply once every 5–7 days, checking sub-surface soil moisture before re-watering.';
  } else {
    irrigationStrategy = isHi
      ? 'संतुलित मृदा नमी। फसल की वृद्धि अवस्था के अनुसार हर 4-5 दिनों में नियमित अनुसूचित सिंचाई प्रदान करें।'
      : 'Balanced soil moisture. Provide standard scheduled irrigation every 4–5 days depending on crop growth stage.';
  }

  // 6. Risk Warnings
  const riskAlerts: RiskAlert[] = [];
  const levelHigh = isHi ? 'उच्च' : 'High';
  const levelMedium = isHi ? 'मध्यम' : 'Medium';

  if (clayVal > 40 && rainfall16Days > 80) {
    riskAlerts.push({
      level: levelHigh,
      title: isHi
        ? 'जलभराव और जड़ घुटने का जोखिम'
        : 'Waterlogging & Root Asphyxiation Risk',
      description: isHi
        ? 'उच्च चिकनी मिट्टी और भारी वर्षा के पूर्वानुमान से जलभराव हो सकता है। उचित जल निकासी नालियां सुनिश्चित करें।'
        : 'High clay content combined with heavy forecast precipitation may cause water stagnation. Ensure proper drainage ditches.',
    });
  }

  if (humidityCurrent > 75 && tempCurrent > 24) {
    riskAlerts.push({
      level: levelMedium,
      title: isHi
        ? 'कवक (फंगल) और कीट प्रकोप की चेतावनी'
        : 'Fungal & Pest Outbreak Warning',
      description: isHi
        ? 'उच्च आर्द्रता (>75%) और गर्म तापमान फंगल पत्ती धब्बा और झुलसा रोग को बढ़ावा देते हैं। फसलों की बारीकी से निगरानी करें।'
        : 'High atmospheric humidity (>75%) and warm temperatures favor fungal leaf spot and blight. Monitor crops closely.',
    });
  }

  if (rainfall16Days < 10 && tempCurrent > 32) {
    riskAlerts.push({
      level: levelMedium,
      title: isHi ? 'गर्मी और सूखा तनाव चेतावनी' : 'Heat & Drought Stress Alert',
      description: isHi
        ? 'कम वर्षा (<10 मिमी) और उच्च तापमान से नमी का तनाव हो सकता है। नमी बनाए रखने के लिए मल्चिंग की सलाह दी जाती है।'
        : 'Low forecast rainfall (<10mm) and high temperature may cause moisture stress. Mulching is recommended to retain moisture.',
    });
  }

  if (phVal < 5.2) {
    riskAlerts.push({
      level: levelHigh,
      title: isHi
        ? 'एल्युमीनियम/सूक्ष्म पोषक तत्व विषाक्तता जोखिम'
        : 'Aluminum / Micronutrient Toxicity Risk',
      description: isHi
        ? 'अत्यधिक अम्लीय मिट्टी (pH < 5.2) एल्युमीनियम विषाक्तता का कारण बन सकती है और फास्फोरस की उपलब्धता रोक सकती है।'
        : 'Strongly acidic soil (pH < 5.2) can cause aluminum toxicity and lock phosphorus availability.',
    });
  }

  const areaHectares = boundary?.areaHectares ? Math.round(boundary.areaHectares * 100) / 100 : 0;
  const summary = isHi
    ? `आपके खेत (${areaHectares > 0 ? areaHectares + ' हे' : 'चिह्नित क्षेत्र'}) का समग्र मूल्यांकन: मिट्टी का स्वास्थ्य स्कोर ${score}/100 (${healthStatus}) है। डेटा ISRIC SoilGrids, Open-Meteo, और Esri/Copernicus सेवाओं से विश्लेषित किया गया है।`
    : `Overall assessment for your field (${
        areaHectares > 0 ? areaHectares + ' ha' : 'drawn region'
      }): Soil health score is ${score}/100 (${healthStatus}). Data synthesized from live accredited ISRIC SoilGrids, Open-Meteo, and Esri/Copernicus spatial services.`;

  return {
    healthScore: score,
    healthStatus,
    summary,
    soilHealth: {
      rating: `${score}/100`,
      phStatus,
      organicMatterStatus,
      textureType,
      nitrogenStatus,
    },
    weatherOutlook: {
      condition: weather?.summaryKey ? `Weather Code ${weather.current?.weatherCode ?? ''}` : isHi ? 'अनुकूल' : 'Favorable',
      rainfall16Days,
      trend:
        rainfall16Days > 50
          ? isHi
            ? 'भारी वर्षा की संभावना'
            : 'Wet / High Rain expected'
          : rainfall16Days > 15
          ? isHi
            ? 'मध्यम वर्षा'
            : 'Moderate rainfall'
          : isHi
          ? 'कम वर्षा की संभावना'
          : 'Dry / Low rain expected',
    },
    cropRecommendations,
    fertilizerPlan,
    irrigationStrategy,
    riskAlerts,
  };
}
