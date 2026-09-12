/**
 * Location Service for WaveGuard
 * Contains business logic for maritime-specific location validation
 */

/**
 * Validates if the location update is realistic for a sea vessel
 * @param {Object} current - Current filtered location
 * @param {Object} raw - New raw geolocation measurement
 * @returns {Boolean}
 */
export const isRealisticMovement = (current, raw) => {
  if (!current.lat || !current.lng) return true;

  // Boats rarely move faster than 50 knots (approx 25 m/s)
  const MAX_BOAT_SPEED_MPS = 25;
  
  const timeDiff = (raw.timestamp - current.timestamp) / 1000;
  if (timeDiff <= 0) return false;

  const distance = calculateRoughDistance(
    current.lat, 
    current.lng, 
    raw.coords.latitude, 
    raw.coords.longitude
  );

  const speed = distance / timeDiff;

  return speed < MAX_BOAT_SPEED_MPS;
};

/**
 * Quick distance approximation in meters
 */
function calculateRoughDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detects if the device is likely using network triangulation or satellite GPS
 * based on accuracy and speed data.
 */
/**
 * Detects if the device is likely using network triangulation or satellite GPS
 * based on accuracy and speed data.
 */
export const detectSource = (accuracy, speed, overrideSource = null) => {
  if (overrideSource) return overrideSource;
  if (!accuracy) return 'Unknown';
  if (accuracy < 15) return 'GPS';
  if (accuracy > 100) return 'Network';
  
  // High accuracy but no speed/heading might be a good network fix
  if (accuracy < 30 && (speed === null || speed === 0)) return 'GPS/Static';
  
  return 'Hybrid';
};

const LAST_LOCATION_KEY = 'waveguard_last_known_location';

/**
 * Saves last known position to LocalStorage for 0ms instant startup
 */
export const saveLastKnownLocation = (location) => {
  try {
    if (location && location.lat && location.lng) {
      localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy || 100,
        source: location.source || 'Cached',
        timestamp: Date.now()
      }));
    }
  } catch (_e) {
    // Ignore localStorage errors (e.g. incognito restriction)
  }
};

/**
 * Retrieves last known position from LocalStorage if fresh (< 7 days)
 */
export const getLastKnownLocation = () => {
  try {
    const saved = localStorage.getItem(LAST_LOCATION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (parsed.lat && parsed.lng && (Date.now() - parsed.timestamp < SEVEN_DAYS_MS)) {
        return {
          ...parsed,
          source: 'Cached Position'
        };
      }
    }
  } catch (_e) {
    // Ignore parse errors
  }
  return null;
};

/**
 * Coarse IP-based Geolocation fallback for fast location detection when browser GPS is slow or blocked
 */
export const fetchIpLocation = async () => {
  const providers = [
    {
      url: 'https://ipapi.co/json/',
      extract: (d) => (d.latitude && d.longitude ? { lat: Number(d.latitude), lng: Number(d.longitude) } : null)
    },
    {
      url: 'https://freeipapi.com/api/json',
      extract: (d) => (d.latitude && d.longitude ? { lat: Number(d.latitude), lng: Number(d.longitude) } : null)
    }
  ];

  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(provider.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const coords = provider.extract(data);
        if (coords) {
          return {
            lat: coords.lat,
            lng: coords.lng,
            accuracy: 10000, // Coarse IP accuracy (~10km)
            source: 'IP Location'
          };
        }
      }
    } catch (err) {
      console.warn(`[LocationService] IP provider (${provider.url}) failed:`, err.message);
    }
  }

  return null;
};
