export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

export const getBearing = (startLat, startLng, destLat, destLng) => {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) *
      Math.cos(destLatRad) *
      Math.cos(destLngRad - startLngRad);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

// Official IMBL coordinates (India-Sri Lanka) from 1974 & 1976 agreements
export const BORDER_POINTS = [
  // Palk Strait Sector
  { lat: 10.0833, lng: 80.05 }, // Position 1: 10° 05' N, 80° 03' E
  { lat: 9.95, lng: 79.5833 }, // Position 2: 09° 57' N, 79° 35' E
  { lat: 9.6692, lng: 79.3767 }, // Position 3: 09° 40.15' N, 79° 22.60' E
  { lat: 9.3633, lng: 79.5117 }, // Position 4: 09° 21.80' N, 79° 30.70' E
  { lat: 9.2167, lng: 79.5333 }, // Position 5: 09° 13' N, 79° 32' E
  { lat: 9.1, lng: 79.5333 }, // Position 6: 09° 06' N, 79° 32' E

  // Gulf of Mannar Sector
  { lat: 9.0, lng: 79.5217 }, // Position 2m: 09° 00.0' N, 79° 31.3' E
  { lat: 8.8833, lng: 79.4883 }, // Position 3m: 08° 53.0' N, 79° 29.3' E
  { lat: 8.6667, lng: 79.3033 }, // Position 4m: 08° 40.0' N, 79° 18.2' E
  { lat: 8.62, lng: 79.2167 }, // Position 5m: 08° 37.2' N, 79° 13.0' E
  { lat: 8.52, lng: 79.0783 }, // Position 6m: 08° 31.2' N, 79° 04.7' E
  { lat: 8.37, lng: 78.9233 }, // Position 7m: 08° 22.2' N, 78° 55.4' E
  { lat: 8.2033, lng: 78.895 }, // Position 8m: 08° 12.2' N, 78° 53.7' E
];

// Helper: cross-track distance to great-circle segment (in meters)
function crossTrackDistanceToSegment(
  lat, lng,          // current position
  lat1, lng1, lat2, lng2 // segment start/end
) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const λ1 = lng1 * Math.PI / 180;
  const θ12 = getBearing(lat1, lng1, lat2, lng2) * Math.PI / 180;

  const δ13 = calculateDistance(lat1, lng1, lat, lng) / R;
  const θ13 = getBearing(lat1, lng1, lat, lng) * Math.PI / 180;

  const dxt = Math.asin(Math.sin(δ13) * Math.sin(θ13 - θ12)) * R;

  // Check if projection falls on segment
  const alongTrack = Math.acos(Math.cos(δ13) / Math.cos(dxt / R)) * R;
  const total = calculateDistance(lat1, lng1, lat2, lng2);

  if (alongTrack < 0 || alongTrack > total) {
    // Closest is to endpoint
    const d1 = calculateDistance(lat, lng, lat1, lng1);
    const d2 = calculateDistance(lat, lng, lat2, lng2);
    return Math.min(d1, d2);
  }

  return Math.abs(dxt);
}

export const getDistanceToBorder = (currentLat, currentLng) => {
  let minDist = Infinity;

  for (let i = 0; i < BORDER_POINTS.length - 1; i++) {
    const p1 = BORDER_POINTS[i];
    const p2 = BORDER_POINTS[i + 1];
    const dist = crossTrackDistanceToSegment(
      currentLat, currentLng,
      p1.lat, p1.lng, p2.lat, p2.lng
    );
    if (dist < minDist) minDist = dist;
  }

  return minDist;
};

export const getSafeDirection = (currentLat, currentLng) => {
  // Find the closest point on the border
  let minDistance = Infinity;
  let closestPoint = BORDER_POINTS[0];

  BORDER_POINTS.forEach((point) => {
    const dist = calculateDistance(currentLat, currentLng, point.lat, point.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = point;
    }
  });

  // Calculate bearing FROM border TO user
  return getBearing(closestPoint.lat, closestPoint.lng, currentLat, currentLng);
};

export const getStatus = (distanceInMeters) => {
  if (distanceInMeters < 5000) return "danger"; // 5km
  if (distanceInMeters < 30000) return "warning"; // 30km
  return "safe";
};