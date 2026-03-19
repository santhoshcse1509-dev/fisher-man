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
export const detectSource = (accuracy, speed) => {
  if (accuracy < 15) return 'GPS';
  if (accuracy > 100) return 'Network';
  
  // High accuracy but no speed/heading might be a good network fix
  if (accuracy < 30 && (speed === null || speed === 0)) return 'GPS/Static';
  
  return 'Hybrid';
};
