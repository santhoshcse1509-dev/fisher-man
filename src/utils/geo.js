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
  // Palk Strait Sector (India-Sri Lanka)
  { lat: 10.0833, lng: 80.05 }, // Position 1: 10° 05' N, 80° 03' E
  { lat: 9.95, lng: 79.5833 }, // Position 2: 09° 57' N, 79° 35' E
  { lat: 9.6692, lng: 79.3767 }, // Position 3: 09° 40.15' N, 79° 22.60' E
  { lat: 9.3633, lng: 79.5117 }, // Position 4: 09° 21.80' N, 79° 30.70' E
  { lat: 9.2167, lng: 79.5333 }, // Position 5: 09° 13' N, 79° 32' E
  { lat: 9.1, lng: 79.5333 }, // Position 6: 09° 06' N, 79° 32' E

  // Gulf of Mannar Sector (India-Sri Lanka)
  { lat: 9.0, lng: 79.5217 }, // Position 2m: 09° 00.0' N, 79° 31.3' E
  { lat: 8.8833, lng: 79.4883 }, // Position 3m: 08° 53.0' N, 79° 29.3' E
  { lat: 8.6667, lng: 79.3033 }, // Position 4m: 08° 40.0' N, 79° 18.2' E
  { lat: 8.62, lng: 79.2167 }, // Position 5m: 08° 37.2' N, 79° 13.0' E
  { lat: 8.52, lng: 79.0783 }, // Position 6m: 08° 31.2' N, 79° 04.7' E
  { lat: 8.37, lng: 78.9233 }, // Position 7m: 08° 22.2' N, 78° 55.4' E
  { lat: 8.2033, lng: 78.895 }, // Position 8m: 08° 12.2' N, 78° 53.7' E
];

// ── India EEZ Western boundary (India-Pakistan / India-Oman) ─────────────────
// Based on India's 200 nautical mile EEZ in the Arabian Sea
// Approximate boundary for Kerala, Karnataka, Goa, Maharashtra, Gujarat coasts
export const BORDER_POINTS_WEST = [
  { lat: 22.5,  lng: 62.5  }, // Gujarat north – Arabian Sea EEZ
  { lat: 20.5,  lng: 63.0  }, // Gujarat south
  { lat: 18.5,  lng: 65.5  }, // Maharashtra/Goa
  { lat: 17.0,  lng: 67.0  }, // Goa/Karnataka
  { lat: 15.0,  lng: 68.5  }, // Karnataka
  { lat: 13.0,  lng: 70.0  }, // Karnataka/Kerala
  { lat: 11.0,  lng: 71.5  }, // Kerala north
  { lat: 9.5,   lng: 72.5  }, // Kerala south / Lakshadweep Sea
  { lat: 8.0,   lng: 73.0  }, // Southern tip EEZ
];

// ── India EEZ Eastern boundary (Bay of Bengal) ───────────────────────────────
// Approximate boundary for Tamil Nadu north, Andhra Pradesh, Odisha, West Bengal
export const BORDER_POINTS_EAST = [
  { lat: 8.0,   lng: 82.5  }, // Tamil Nadu south
  { lat: 10.5,  lng: 82.5  }, // Tamil Nadu / Andhra
  { lat: 13.5,  lng: 83.0  }, // Andhra Pradesh
  { lat: 16.0,  lng: 83.5  }, // Andhra Pradesh
  { lat: 18.5,  lng: 85.5  }, // Odisha
  { lat: 20.0,  lng: 87.0  }, // Odisha
  { lat: 21.5,  lng: 89.5  }, // West Bengal / Bangladesh boundary
];

// Helper: cross-track distance to great-circle segment (in meters)
function crossTrackDistanceToSegment(
  lat, lng,          // current position
  lat1, lng1, lat2, lng2 // segment start/end
) {
  const R = 6371e3;
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
  // Combine all border segments for full Indian coast coverage
  const allBorderSets = [
    BORDER_POINTS,         // Palk Strait + Gulf of Mannar (Tamil Nadu)
    BORDER_POINTS_WEST,    // Arabian Sea (West Coast)
    BORDER_POINTS_EAST,    // Bay of Bengal (East Coast)
  ];

  let minDist = Infinity;

  for (const borderSet of allBorderSets) {
    for (let i = 0; i < borderSet.length - 1; i++) {
      const p1 = borderSet[i];
      const p2 = borderSet[i + 1];
      const dist = crossTrackDistanceToSegment(
        currentLat, currentLng,
        p1.lat, p1.lng, p2.lat, p2.lng
      );
      if (dist < minDist) minDist = dist;
    }
  }

  return minDist;
};

export const getSafeDirection = (currentLat, currentLng) => {
  // Check all border sets for nearest border point
  const allPoints = [
    ...BORDER_POINTS,
    ...BORDER_POINTS_WEST,
    ...BORDER_POINTS_EAST,
  ];

  let minDistance = Infinity;
  let closestPoint = allPoints[0];

  allPoints.forEach((point) => {
    const dist = calculateDistance(currentLat, currentLng, point.lat, point.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = point;
    }
  });

  // Calculate bearing FROM border TO user (i.e. safe direction away)
  return getBearing(closestPoint.lat, closestPoint.lng, currentLat, currentLng);
};

export const getStatus = (distanceInMeters) => {
  if (distanceInMeters < 5000)  return 'danger';  // < 5 km
  if (distanceInMeters < 30000) return 'warning'; // < 30 km
  return 'safe';
};