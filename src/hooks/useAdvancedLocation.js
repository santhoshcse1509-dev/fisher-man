import { useState, useEffect, useRef, useCallback } from 'react';
import { GeoKalmanFilter, KalmanFilter } from '../utils/kalmanFilter';
import { detectSource } from '../services/locationService';

// Small helper – converts lat/lon delta to bearing (degrees, 0 = North, clockwise)
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  let brng = Math.atan2(y, x);
  brng = (brng * 180 / Math.PI + 360) % 360;
  return brng;
}

export function useAdvancedLocation(options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 30000,           // increased default – more realistic
    seaOptimized = true,
  } = options;

  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    speed: 0,           // we'll keep in **meters/second**
    heading: null,
    accuracy: null,
    source: 'initializing',
    timestamp: null,
    error: null,
  });

  const geoFilter    = useRef(new GeoKalmanFilter(0.0005, 8.0)); // tune these!
  const speedFilter  = useRef(new KalmanFilter(0.08, 0.6));
  const headingFilter = useRef(new KalmanFilter(0.4, 1.8));

  const watchId      = useRef(null);
  const fallbackId   = useRef(null);
  const lastPosition = useRef(null);     // {lat, lng, timestamp}

  // We'll use absolute device orientation when available (most modern way)
  const [deviceHeading, setDeviceHeading] = useState(null);

  const updateLocation = useCallback((pos, forcedSource = null) => {
    const coords = pos.coords;
    if (!coords) return;

    let { latitude, longitude, speed, heading, accuracy } = coords;

    // ── 1. Source detection ───────────────────────────────────────
    let source = forcedSource || detectSource(accuracy, speed) || 'unknown';

    // ── 2. Heading logic ──────────────────────────────────────────
    let finalHeading = heading ?? null;

    if (finalHeading == null) {
      // Try most recent device orientation
      if (deviceHeading != null) {
        finalHeading = deviceHeading;
        source = source === 'GPS' ? 'device+GPS' : source;
      }
      // Fallback: calculate from movement (only if moved enough)
      else if (lastPosition.current) {
        const distMoved = Math.hypot(
          (latitude - lastPosition.current.lat) * 111320,
          (longitude - lastPosition.current.lng) * 111320 * Math.cos(latitude * Math.PI / 180)
        );

        if (distMoved > 8) { // meters
          finalHeading = calculateBearing(
            lastPosition.current.lat,
            lastPosition.current.lng,
            latitude,
            longitude
          );
          source = source === 'GPS' ? 'motion-derived' : source;
        }
      }
    }

    // ── 3. Sea / low-speed cleanup ────────────────────────────────
    let finalSpeed = speed ?? 0; // already in m/s
    if (seaOptimized && finalSpeed < 0.4) { // ~0.8 knots
      finalSpeed = 0;
    }

    // ── 4. Kalman filtering ───────────────────────────────────────
    // Important: filter **only after** first valid point
    let filteredLat = latitude;
    let filteredLng = longitude;

    if (lastPosition.current) {
      const filtered = geoFilter.current.filter(latitude, longitude);
      filteredLat = filtered.lat;
      filteredLng = filtered.lng;
    } else {
      // First point → initialize filter
      geoFilter.current = new GeoKalmanFilter(0.0005, 8.0); // or .setState()
    }

    const filteredSpeed  = speedFilter.current.filter(finalSpeed);
    const filteredHeading = finalHeading != null
      ? headingFilter.current.filter(finalHeading)
      : null;

    // ── 5. Save & publish ─────────────────────────────────────────
    lastPosition.current = { lat: latitude, lng: longitude, timestamp: pos.timestamp };

    setLocation({
      lat: filteredLat,
      lng: filteredLng,
      speed: filteredSpeed,           // kept in m/s
      heading: filteredHeading,
      accuracy,
      source,
      timestamp: pos.timestamp,
      error: null,
    });
  }, [deviceHeading, seaOptimized]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    // ── Main GPS watch ────────────────────────────────────────────
    watchId.current = navigator.geolocation.watchPosition(
      pos => updateLocation(pos),
      err => {
        console.warn('Geolocation error', err);
        let msg = 'Location error';
        if (err.code === err.PERMISSION_DENIED)     msg = 'Permission denied';
        if (err.code === err.POSITION_UNAVAILABLE) msg = 'Position unavailable';
        if (err.code === err.TIMEOUT)              msg = 'Location timeout';

        setLocation(prev => ({ ...prev, error: msg }));

        // Timeout or unavailable → try low-power fallback
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          if (!fallbackId.current) {
            fallbackId.current = navigator.geolocation.watchPosition(
              pos => updateLocation(pos, 'network'),
              e => console.warn('Network fallback failed', e),
              { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
            );
          }
        }
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    // ── Modern device orientation (absolute when available) ───────
    const handleOrientation = (e) => {
      // Prefer absolute heading if available (most recent standard)
      if (typeof e.webkitCompassHeading === 'number') {
        setDeviceHeading(e.webkitCompassHeading);
      } else if (e.absolute && typeof e.alpha === 'number') {
        // Newer spec – alpha is 0..360 from North
        setDeviceHeading(e.alpha);
      }
      // Many browsers still give webkitCompassHeading in 2025 on iOS
    };

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (watchId.current)      navigator.geolocation.clearWatch(watchId.current);
      if (fallbackId.current)   navigator.geolocation.clearWatch(fallbackId.current);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, [enableHighAccuracy, timeout, maximumAge, updateLocation]);

  return location;
}