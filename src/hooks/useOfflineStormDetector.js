import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useOfflineStormDetector.js
 * 
 * Uses the device's Barometer hardware sensor (if available) to detect
 * sudden atmospheric pressure drops offline, which indicate an approaching cyclone/storm.
 * Includes a simulation mode for browsers that do not support the generic sensor API.
 */
export function useOfflineStormDetector() {
  const [pressure, setPressure] = useState(null); // Current pressure in hPa
  const [isSupported, setIsSupported] = useState(true);
  const [sensorStatus, setSensorStatus] = useState('initializing'); // initializing, active, denied, unsupported
  const [offlineStormAlert, setOfflineStormAlert] = useState(false);
  
  // Keep track of historical pressure readings to detect rapid drops
  // We want to detect a drop of > 3 hPa over a short period.
  const historyRef = useRef([]);

  // A rapid drop of >3 hPa within 5 minutes signals an approaching storm
  const THRESHOLD_HPA_DROP = 3.0;
  const HISTORY_WINDOW_MS  = 5 * 60 * 1000; // 5 minutes

  const checkPressureDrop = useCallback((currentPressure) => {
    const now = Date.now();
    
    // Clean history older than 5 minutes
    historyRef.current = historyRef.current.filter(
      entry => now - entry.time < HISTORY_WINDOW_MS
    );

    // Get the highest pressure in the recent history
    if (historyRef.current.length > 0) {
      const highestRecent = Math.max(...historyRef.current.map(h => h.value));
      
      if (highestRecent - currentPressure >= THRESHOLD_HPA_DROP) {
        setOfflineStormAlert(true);
      }
    }
    
    // Add current to history
    historyRef.current.push({ time: now, value: currentPressure });
  }, []);

  // Manual simulation for demonstration purposes
  const simulatePressureDrop = useCallback(() => {
    setSensorStatus('simulating');
    setPressure(1012); // Normal sea level pressure
    historyRef.current = []; // Reset history
    
    // Simulate a rapid pressure drop
    setTimeout(() => {
      setPressure(1008);
      historyRef.current.push({ time: Date.now(), value: 1012 });
    }, 1000);
    
    setTimeout(() => {
      setPressure(1004);
      historyRef.current.push({ time: Date.now(), value: 1008 });
      checkPressureDrop(1004);
    }, 2500);
  }, [checkPressureDrop]);

  const clearAlert = useCallback(() => {
    setOfflineStormAlert(false);
    historyRef.current = [];
  }, []);

  // NOTE: Auto-simulation removed — it was causing false SOS alarms.
  // Use the simulatePressureDrop() function from a manual test button (e.g. in Profile)
  // to safely test the pressure-drop detection in development.

  useEffect(() => {
    let barometer = null;

    try {
      if ('Barometer' in window) {
        // eslint-disable-next-line no-undef
        barometer = new Barometer({ frequency: 1 }); // 1 Hz
        
        barometer.addEventListener('reading', () => {
          const currentP = barometer.pressure; // pressure in hPa
          setPressure(currentP);
          checkPressureDrop(currentP);
        });

        barometer.addEventListener('error', (event) => {
          console.warn("[Barometer Error]", event.error.name, event.error.message);
          if (event.error.name === 'NotAllowedError') {
            setSensorStatus('denied');
          } else {
            setSensorStatus('unsupported');
            setIsSupported(false);
          }
        });

        barometer.start();
        setSensorStatus('active');
        setIsSupported(true);
      } else {
        setSensorStatus('unsupported');
        setIsSupported(false);
      }
    } catch (err) {
      console.warn("[Barometer Init Error]", err);
      setSensorStatus('unsupported');
      setIsSupported(false);
    }

    return () => {
      if (barometer) {
        barometer.stop();
      }
    };
  }, [checkPressureDrop]);

  return {
    pressure,
    isSupported,
    sensorStatus,
    offlineStormAlert,
    simulatePressureDrop,
    clearAlert
  };
}
