/**
 * weatherService.js — Real Marine Weather via Open-Meteo
 * -------------------------------------------------------
 * Uses Open-Meteo Marine API — completely FREE, no API key required.
 * Fetches wind speed, wave height, direction, and sea condition.
 *
 * Storm Level Classification (Indian Coast Guard standard):
 *   safe      → wind < 25 km/h
 *   rough     → wind 25–40 km/h  (rough sea)
 *   storm     → wind 40–60 km/h  (storm, don't sail)
 *   cyclone   → wind > 60 km/h   (cyclone, return immediately)
 */

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache

let weatherCache = null;
let lastFetchedLat = null;
let lastFetchedLng = null;
let lastFetchTime = 0;

/**
 * Classify storm level from wind speed (km/h)
 * @param {number} windKmh
 * @returns {{ level: string, color: string, label: string, labelTa: string }}
 */
export function classifyStorm(windKmh) {
  if (windKmh >= 60) return {
    level: 'cyclone',
    color: '#7c3aed',       // Purple
    label: 'CYCLONE ALERT – Return to Port Immediately!',
    labelTa: 'சூறாவளி எச்சரிக்கை – உடனே துறைமுகம் திரும்பவும்!',
    emoji: '🌀',
  };
  if (windKmh >= 40) return {
    level: 'storm',
    color: '#ef4444',       // Red
    label: 'Storm Warning – Dangerous Conditions',
    labelTa: 'புயல் எச்சரிக்கை – ஆபத்தான கடல் நிலை',
    emoji: '⛈️',
  };
  if (windKmh >= 25) return {
    level: 'rough',
    color: '#f97316',       // Orange
    label: 'Rough Sea – Exercise Caution',
    labelTa: 'கடினமான கடல் – கவனமாக இருங்கள்',
    emoji: '🌊',
  };
  return {
    level: 'safe',
    color: '#10b981',       // Green
    label: 'Sea Conditions Safe',
    labelTa: 'கடல் நிலை பாதுகாப்பானது',
    emoji: '✅',
  };
}

/**
 * Get wind direction arrow from degrees
 * @param {number} deg
 */
export function windDirectionLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Fetch real marine weather from Open-Meteo (no key, free, unlimited)
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{
 *   windSpeed: number,       // km/h at 10m
 *   windSpeedKnots: number,
 *   windDirection: number,   // degrees
 *   windDirLabel: string,    // e.g. "NE"
 *   waveHeight: number,      // metres
 *   wavePeriod: number,      // seconds
 *   temperature: number,     // °C
 *   condition: string,       // 'clear'|'clouds'|'rain'|'storm'
 *   stormInfo: object,
 *   updatedAt: Date
 * }>}
 */
export async function fetchMarineWeather(lat, lng) {
  const now = Date.now();

  // Return cached result if position hasn't changed much and cache is fresh
  const distMoved = lastFetchedLat !== null
    ? Math.abs(lat - lastFetchedLat) + Math.abs(lng - lastFetchedLng)
    : Infinity;

  if (
    weatherCache &&
    now - lastFetchTime < CACHE_DURATION_MS &&
    distMoved < 0.05         // less than ~5km position change
  ) {
    return weatherCache;
  }

  try {
    // Open-Meteo Marine + Forecast combo
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      hourly: [
        'wind_speed_10m',
        'wind_direction_10m',
        'wave_height',
        'wave_period',
        'precipitation_probability',
        'temperature_2m',
        'weather_code',
      ].join(','),
      forecast_days: 1,
      timezone: 'Asia/Kolkata',
      wind_speed_unit: 'kmh',
    });

    const [forecastRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    if (!forecastRes.ok) throw new Error(`Open-Meteo status ${forecastRes.status}`);

    const forecastData = await forecastRes.json();

    // Get current hour index
    const currentHour = new Date().getHours();
    const H = forecastData.hourly;

    const windSpeed     = H.wind_speed_10m?.[currentHour]    ?? 0;
    const windDirection = H.wind_direction_10m?.[currentHour] ?? 0;
    const waveHeight    = H.wave_height?.[currentHour]        ?? 0;
    const wavePeriod    = H.wave_period?.[currentHour]        ?? 0;
    const temperature   = H.temperature_2m?.[currentHour]     ?? 28;
    const weatherCode   = H.weather_code?.[currentHour]       ?? 0;
    const precipProb    = H.precipitation_probability?.[currentHour] ?? 0;

    // Map WMO weather code to simple condition
    const condition = mapWeatherCode(weatherCode, windSpeed);

    const result = {
      windSpeed: Math.round(windSpeed),
      windSpeedKnots: Math.round(windSpeed / 1.852),
      windDirection: Math.round(windDirection),
      windDirLabel: windDirectionLabel(windDirection),
      waveHeight: parseFloat(waveHeight.toFixed(1)),
      wavePeriod: Math.round(wavePeriod),
      temperature: Math.round(temperature),
      precipProb: Math.round(precipProb),
      condition,
      stormInfo: classifyStorm(windSpeed),
      updatedAt: new Date(),
      // Next 6 hours forecast
      forecast: Array.from({ length: 6 }).map((_, i) => ({
        hour: (currentHour + i + 1) % 24,
        windSpeed: Math.round(H.wind_speed_10m?.[currentHour + i + 1] ?? 0),
        waveHeight: parseFloat((H.wave_height?.[currentHour + i + 1] ?? 0).toFixed(1)),
      })),
    };

    // Update cache
    weatherCache = result;
    lastFetchedLat = lat;
    lastFetchedLng = lng;
    lastFetchTime = now;

    return result;
  } catch (err) {
    console.error('[Weather] Fetch failed:', err.message);

    // Return last cache if available, else default
    if (weatherCache) return weatherCache;

    return {
      windSpeed: 0,
      windSpeedKnots: 0,
      windDirection: 0,
      windDirLabel: 'N',
      waveHeight: 0,
      wavePeriod: 0,
      temperature: 28,
      precipProb: 0,
      condition: 'unknown',
      stormInfo: classifyStorm(0),
      updatedAt: null,
      forecast: [],
      error: err.message,
    };
  }
}

/** Map WMO weather code + wind to a simple condition string */
function mapWeatherCode(code, windKmh) {
  if (windKmh >= 60) return 'cyclone';
  if (windKmh >= 40) return 'storm';
  if (code >= 95) return 'thunderstorm';
  if (code >= 80) return 'rain';
  if (code >= 61) return 'rain';
  if (code >= 51) return 'drizzle';
  if (code >= 3)  return 'cloudy';
  if (code >= 1)  return 'partly-cloudy';
  return 'clear';
}
