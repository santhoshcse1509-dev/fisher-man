/**
 * StormBanner.jsx — Full-width Storm/Cyclone Warning Banner
 * ----------------------------------------------------------
 * Displays a dismissible banner at top of screen when sea conditions
 * are rough, stormy, or cyclone-level.
 * Also handles voice announcements + push notifications.
 */

import React, { useState, useEffect } from 'react';
import { X, Wind, Waves, Thermometer, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export default function StormBanner({
  weather,          // object from weatherService.fetchMarineWeather
  language = 'ta',
  muted = false,
  onStormAlert,     // callback(stormLevel) fired when storm detected
}) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prevLevel, setPrevLevel] = useState('safe');

  const stormInfo = weather?.stormInfo;
  const level = stormInfo?.level ?? 'safe';

  // Re-show banner whenever storm level worsens
  useEffect(() => {
    if (!stormInfo) return;
    if (level !== 'safe' && level !== prevLevel) {
      setDismissed(false);
      setExpanded(true);
      setPrevLevel(level);

      // Voice announcement
      if (!muted && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = language === 'ta' ? stormInfo.labelTa : stormInfo.label;
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = language === 'ta' ? 'ta-IN' : 'en-US';
        utt.rate = 0.9;
        utt.volume = 1;
        window.speechSynthesis.speak(utt);
      }

      // Push notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${stormInfo.emoji} ${stormInfo.label}`, {
          body: `Wind: ${weather.windSpeed} km/h | Waves: ${weather.waveHeight}m\n${language === 'ta' ? stormInfo.labelTa : stormInfo.label}`,
          icon: '/vite.svg',
          tag: 'storm-alert',       // replace existing, no spam
          requireInteraction: level === 'cyclone',
        });
      }

      // Vibrate device
      if ('vibrate' in navigator) {
        if (level === 'cyclone') navigator.vibrate([800, 300, 800, 300, 800]);
        else if (level === 'storm') navigator.vibrate([500, 200, 500]);
        else navigator.vibrate([300, 100, 300]);
      }

      // Notify parent
      onStormAlert?.(level);
    }

    if (level === 'safe' && prevLevel !== 'safe') {
      setPrevLevel('safe');
    }
  }, [level, stormInfo, prevLevel, muted, language, onStormAlert, weather]);

  // Don't render for safe conditions or if dismissed
  if (!weather || level === 'safe' || dismissed) return null;

  const bannerColors = {
    rough:   'from-orange-600 to-amber-500',
    storm:   'from-red-700 to-red-500',
    cyclone: 'from-purple-800 to-red-700',
  };

  const borderColor = {
    rough:   'border-orange-300/50',
    storm:   'border-red-300/50',
    cyclone: 'border-purple-300/50',
  };

  return (
    <div
      className={clsx(
        'fixed top-0 w-full flex justify-center z-[60] bg-gradient-to-r text-white shadow-2xl border-b-2',
        bannerColors[level] ?? 'from-orange-600 to-amber-500',
        borderColor[level] ?? 'border-orange-300/50',
        level === 'cyclone' && 'animate-pulse'
      )}
    >
      <div className="w-full max-w-5xl">
        {/* Main row */}
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Animated storm emoji */}
          <span
            className={clsx(
              'text-2xl sm:text-3xl flex-shrink-0',
              level === 'cyclone' ? 'animate-spin-slow' : 'animate-bounce'
            )}
          >
            {stormInfo.emoji}
          </span>

          <div className="min-w-0">
            <p className="font-black text-sm sm:text-base leading-tight truncate">
              {language === 'ta' ? stormInfo.labelTa : stormInfo.label}
            </p>
            <div className="flex items-center gap-3 mt-0.5 text-xs font-bold opacity-90">
              <span className="flex items-center gap-1">
                <Wind size={11} />
                {weather.windSpeed} km/h {weather.windDirLabel}
              </span>
              <span className="flex items-center gap-1">
                <Waves size={11} />
                {weather.waveHeight}m
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <Thermometer size={11} />
                {weather.temperature}°C
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {/* Expand/collapse forecast */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition"
            aria-label="Show forecast"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition"
            aria-label="Dismiss warning"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Expanded 6-hour forecast */}
      {expanded && weather.forecast?.length > 0 && (
        <div className="px-3 sm:px-4 pb-3 border-t border-white/20">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-2 mb-1.5">
            {language === 'ta' ? 'அடுத்த 6 மணி நேர கடல் நிலை' : 'Next 6-Hour Sea Forecast'}
          </p>
          <div className="grid grid-cols-6 gap-1">
            {weather.forecast.slice(0, 6).map((f, i) => {
              const fStorm = f.windSpeed >= 60 ? 'cyclone' : f.windSpeed >= 40 ? 'storm' : f.windSpeed >= 25 ? 'rough' : 'safe';
              return (
                <div
                  key={i}
                  className={clsx(
                    'flex flex-col items-center bg-white/10 rounded-lg py-1.5 px-1 text-center',
                    fStorm !== 'safe' && 'bg-white/20 ring-1 ring-white/40'
                  )}
                >
                  <span className="text-[9px] font-bold opacity-70">
                    {f.hour.toString().padStart(2, '0')}:00
                  </span>
                  <span className="text-xs font-black mt-0.5">{f.windSpeed}</span>
                  <span className="text-[8px] opacity-60">km/h</span>
                  <span className="text-[8px] font-bold opacity-80 mt-0.5">{f.waveHeight}m</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* Cyclone-level: pulsing bottom bar */}
      {level === 'cyclone' && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/40 animate-pulse" />
      )}
    </div>
  );
}
