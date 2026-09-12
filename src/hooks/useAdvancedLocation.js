import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GeoKalmanFilter, KalmanFilter } from '../utils/kalmanFilter';
import { detectSource, getLastKnownLocation, saveLastKnownLocation, fetchIpLocation } from '../services/locationService';

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
    timeout = 30000,
    maximumAge = 30000,
    seaOptimized = true,
  } = options;

  // Initialize state with last known position from localStorage for 0ms startup
  const [location, setLocation] = useState(() => {
    const cached = getLastKnownLocation();
    if (cached) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        speed: 0,
        heading: null,
        accuracy: cached.accuracy,
        source: cached.source || 'Cached Position',
        timestamp: cached.timestamp,
        error: null,
      };
    }
    return {
      lat: null,
      lng: null,
      speed: 0,
      heading: null,
      accuracy: null,
      source: 'initializing',
      timestamp: null,
      error: null,
    };
  });

  const geoFilter     = useRef(new GeoKalmanFilter(0.0005, 8.0));
  const speedFilter   = useRef(new KalmanFilter(0.08, 0.6));
  const headingFilter = useRef(new KalmanFilter(0.4, 1.8));

  const watchId        = useRef(null);
  const fallbackId     = useRef(null);
  const lastPosition   = useRef(null);
  const retryCount     = useRef(0);
  const retryTimer     = useRef(null);
  const startWatchingRef = useRef(null);

  // Track if high-accuracy GPS has delivered a fix yet
  const hasGpsFix      = useRef(false);

  // Store deviceHeading in a ref so updateLocation doesn't need it as a dependency
  const deviceHeadingRef = useRef(null);
  const [deviceHeading, setDeviceHeading] = useState(null);

  // Keep the ref in sync with state
  useEffect(() => {
    deviceHeadingRef.current = deviceHeading;
  }, [deviceHeading]);

  // Store seaOptimized in a ref to avoid callback re-creation
  const seaOptimizedRef = useRef(seaOptimized);
  useEffect(() => {
    seaOptimizedRef.current = seaOptimized;
  }, [seaOptimized]);

  // ── Stable updateLocation callback (no state dependencies) ──────────────────
  const updateLocation = useCallback((pos, forcedSource = null) => {
    const coords = pos.coords;
    if (!coords) return;

    let { latitude, longitude, speed, heading, accuracy } = coords;

    // ── 1. Source detection
    let source = forcedSource || detectSource(accuracy, speed) || 'unknown';
    if (source === 'GPS' || accuracy < 50) {
      hasGpsFix.current = true;
    }

    // ── 2. Heading logic (reads from ref, not state)
    let finalHeading = heading ?? null;

    if (finalHeading == null) {
      const currentDeviceHeading = deviceHeadingRef.current;
      if (currentDeviceHeading != null) {
        finalHeading = currentDeviceHeading;
        source = source === 'GPS' ? 'device+GPS' : source;
      } else if (lastPosition.current) {
        const distMoved = Math.hypot(
          (latitude - lastPosition.current.lat) * 111320,
          (longitude - lastPosition.current.lng) * 111320 * Math.cos(latitude * Math.PI / 180)
        );
        if (distMoved > 8) {
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

    // ── 3. Sea / low-speed cleanup
    let finalSpeed = speed ?? 0;
    if (seaOptimizedRef.current && finalSpeed < 0.4) {
      finalSpeed = 0;
    }

    // ── 4. Kalman filtering
    let filteredLat = latitude;
    let filteredLng = longitude;

    if (lastPosition.current) {
      const filtered = geoFilter.current.filter(latitude, longitude);
      filteredLat = filtered.lat;
      filteredLng = filtered.lng;
    } else {
      geoFilter.current = new GeoKalmanFilter(0.0005, 8.0);
    }

    const filteredSpeed   = speedFilter.current.filter(finalSpeed);
    const filteredHeading = finalHeading != null
      ? headingFilter.current.filter(finalHeading)
      : null;

    // ── 5. Save & publish
    lastPosition.current = { lat: latitude, lng: longitude, timestamp: pos.timestamp };
    retryCount.current = 0;

    const updatedLoc = {
      lat: filteredLat,
      lng: filteredLng,
      speed: filteredSpeed,
      heading: filteredHeading,
      accuracy,
      source,
      timestamp: pos.timestamp || Date.now(),
      error: null,
    };

    saveLastKnownLocation(updatedLoc);
    setLocation(updatedLoc);
  }, []);

  // ── Start / restart GPS watching with Multi-Tier Fallback ──────────────────
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      // Try IP location if Geolocation API is missing
      fetchIpLocation().then(ipLoc => {
        if (ipLoc) {
          setLocation(prev => ({ ...prev, ...ipLoc, error: null }));
          saveLastKnownLocation(ipLoc);
        } else {
          setLocation(prev => ({ ...prev, error: 'Geolocation not supported', source: 'unavailable' }));
        }
      });
      return;
    }

    // Clear existing watches
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (fallbackId.current != null) {
      navigator.geolocation.clearWatch(fallbackId.current);
      fallbackId.current = null;
    }

    // ── Tier 1: Fast cached position (low accuracy, max age 5 min, 3s timeout)
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (!hasGpsFix.current) {
          updateLocation(pos, 'fast-cache');
          console.log('[GPS] Fast cached position acquired');
        }
      },
      err => {
        console.warn('[GPS] Fast position check skipped:', err.message);
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
    );

    // ── Tier 2: IP Fallback if high accuracy GPS takes longer than 2.5s and no fix exists
    setTimeout(async () => {
      if (!hasGpsFix.current) {
        const ipLoc = await fetchIpLocation();
        if (ipLoc && !hasGpsFix.current) {
          console.log('[GPS] IP Geolocation fallback acquired');
          setLocation(prev => {
            if (prev.source === 'GPS' || prev.source === 'High-Accuracy GPS') return prev;
            return {
              ...prev,
              lat: ipLoc.lat,
              lng: ipLoc.lng,
              accuracy: ipLoc.accuracy,
              source: ipLoc.source,
              error: null
            };
          });
        }
      }
    }, 2500);

    // ── Tier 3: Main Continuous High-Accuracy GPS watch
    watchId.current = navigator.geolocation.watchPosition(
      pos => updateLocation(pos),
      err => {
        console.warn('[GPS] watchPosition error:', err.code, err.message);
        let msg = 'Location error';
        let source = 'error';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enable location access in browser settings.';
          source = 'denied';
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Position unavailable — searching for GPS satellite...';
          source = 'unavailable';
        }
        if (err.code === err.TIMEOUT) {
          msg = 'GPS timeout — searching for signal...';
          source = 'timeout';
        }

        // If we don't have any location at all, attempt IP fallback immediately
        setLocation(prev => {
          if (prev.lat !== null && prev.lng !== null) {
            // Keep current location but note signal status
            return { ...prev, error: msg };
          }
          return { ...prev, error: msg, source };
        });

        // Try IP location if denied/timeout and no lat/lng exists yet
        if (err.code !== err.PERMISSION_DENIED) {
          fetchIpLocation().then(ipLoc => {
            if (ipLoc) {
              setLocation(prev => ({
                ...prev,
                lat: prev.lat ?? ipLoc.lat,
                lng: prev.lng ?? ipLoc.lng,
                accuracy: prev.accuracy ?? ipLoc.accuracy,
                source: prev.source === 'initializing' ? ipLoc.source : prev.source,
              }));
            }
          });
        }

        // Timeout or unavailable → try low-power network fallback
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          if (fallbackId.current == null) {
            console.log('[GPS] Starting network fallback watch...');
            fallbackId.current = navigator.geolocation.watchPosition(
              pos => {
                updateLocation(pos, 'Network (Fallback)');
                console.log('[GPS] Network fallback position acquired');
              },
              e => console.warn('[GPS] Network fallback failed:', e.message),
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
            );
          }

          // Auto-retry high accuracy GPS
          if (retryCount.current < 3) {
            retryCount.current++;
            const retryDelay = retryCount.current * 4000;
            console.log(`[GPS] Retry #${retryCount.current} in ${retryDelay}ms`);
            if (retryTimer.current) clearTimeout(retryTimer.current);
            retryTimer.current = setTimeout(() => {
              startWatchingRef.current?.();
            }, retryDelay);
          }
        }
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [enableHighAccuracy, timeout, maximumAge, updateLocation]);

  useEffect(() => {
    startWatchingRef.current = startWatching;
  }, [startWatching]);

  // ── Manual retry / permission request ───────────────────────────────────────
  const requestPermission = useCallback(async () => {
    hasGpsFix.current = false;
    setLocation(prev => ({ ...prev, error: null, source: 'detecting...' }));
    retryCount.current = 0;

    // Fast check for permissions if API supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          const ipLoc = await fetchIpLocation();
          if (ipLoc) {
            setLocation({
              ...ipLoc,
              speed: 0,
              heading: null,
              error: 'Location permission blocked. Showing IP-based location.',
            });
            return;
          }
          setLocation(prev => ({
            ...prev,
            error: 'Location permission is blocked. Please enable it in browser settings.',
            source: 'denied',
          }));
          return;
        }
      } catch {
        // query not supported
      }
    }

    startWatching();
  }, [startWatching]);

  // ── Main effect — start GPS on mount ────────────────────────────────────────
  useEffect(() => {
    startWatching();

    // ── Device orientation (absolute when available)
    const handleOrientation = (e) => {
      if (typeof e.webkitCompassHeading === 'number') {
        setDeviceHeading(e.webkitCompassHeading);
      } else if (e.absolute && typeof e.alpha === 'number') {
        setDeviceHeading(e.alpha);
      }
    };

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (fallbackId.current != null) navigator.geolocation.clearWatch(fallbackId.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, [startWatching]);

  return useMemo(() => ({
    ...location,
    requestPermission,
    reDetectLocation: requestPermission,
  }), [location, requestPermission]);
}