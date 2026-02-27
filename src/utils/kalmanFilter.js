/**
 * Simple Kalman Filter for 2D/1D data
 * Used to smooth GPS coordinates, speed, and heading
 */
export class KalmanFilter {
  constructor(processNoise = 0.001, measurementNoise = 0.1) {
    this.q = processNoise; // Process noise covariance
    this.r = measurementNoise; // Measurement noise covariance
    this.x = null; // Estimated value
    this.p = 1; // Estimation error covariance
    this.k = 0; // Kalman gain
  }

  filter(measurement) {
    if (this.x === null) {
      this.x = measurement;
      return this.x;
    }

    // Prediction update
    this.p = this.p + this.q;

    // Measurement update
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }

  reset(initialValue = null) {
    this.x = initialValue;
    this.p = 1;
    this.k = 0;
  }
}

/**
 * Specialized 2D Kalman Filter for Lat/Lng
 */
export class GeoKalmanFilter {
  constructor(q = 0.00001, r = 0.0001) {
    this.latFilter = new KalmanFilter(q, r);
    this.lngFilter = new KalmanFilter(q, r);
  }

  filter(lat, lng) {
    return {
      lat: this.latFilter.filter(lat),
      lng: this.lngFilter.filter(lng)
    };
  }

  reset() {
    this.latFilter.reset();
    this.lngFilter.reset();
  }
}

// Approximate meters per degree (valid near baseLat, error <1% within ~500 km)
function metersPerDegLat() {
  return 111320; // roughly constant
}

function metersPerDegLon(lat) {
  return 111320 * Math.cos(lat * Math.PI / 180);
}

// Simple equirectangular projection → local x/y in meters from origin
export class LocalProjector {
  constructor(originLat, originLon) {
    this.originLat = originLat;
    this.originLon = originLon;
    this.mPerDegLat = metersPerDegLat();
    this.mPerDegLon = metersPerDegLon(originLat);
  }

  toLocal(lat, lon) {
    const dx = (lon - this.originLon) * this.mPerDegLon;
    const dy = (lat - this.originLat) * this.mPerDegLat;
    return { x: dx, y: dy };
  }

  toGeo(x, y) {
    const lon = this.originLon + x / this.mPerDegLon;
    const lat = this.originLat + y / this.mPerDegLat;
    return { lat, lng: lon };
  }
}