/**
 * WeatherWidget.jsx — Real-time Marine Weather Panel
 * Uses Open-Meteo via weatherService (no API key needed)
 */
import React from 'react';
import { Cloud, CloudRain, CloudLightning, Wind, Sun, Waves, Thermometer, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export default function WeatherWidget({ isNight, weather, onRefresh }) {
  // If no data yet, show loading skeleton
  if (!weather) {
    return (
      <div className={clsx(
        'relative rounded-xl sm:rounded-2xl p-2 sm:p-3 border backdrop-blur-md animate-pulse',
        isNight ? 'bg-slate-800/80 border-slate-600' : 'bg-white/80 border-white/50'
      )}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-400/30" />
          <div className="space-y-1">
            <div className="w-12 h-3 rounded bg-slate-400/30" />
            <div className="w-16 h-2 rounded bg-slate-400/20" />
          </div>
        </div>
      </div>
    );
  }

  const { windSpeed, windDirLabel, waveHeight, temperature, condition, stormInfo } = weather;
  const isHighWind = windSpeed >= 25;

  const getIcon = (size = 16) => {
    switch (condition) {
      case 'cyclone':
      case 'storm':
      case 'thunderstorm':
        return <CloudLightning size={size} className="text-yellow-400 animate-pulse" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain size={size} className="text-blue-300" />;
      case 'rough':
        return <Wind size={size} className="text-orange-400 animate-pulse" />;
      case 'cloudy':
      case 'partly-cloudy':
        return <Cloud size={size} className={isNight ? 'text-slate-400' : 'text-slate-500'} />;
      default:
        return isNight
          ? <Cloud size={size} className="text-slate-400" />
          : <Sun size={size} className="text-orange-400" />;
    }
  };

  // Background color driven by storm level
  const bgColor = {
    cyclone: 'bg-purple-600/30 border-purple-400/60',
    storm:   'bg-red-500/20 border-red-500/50',
    rough:   'bg-orange-500/20 border-orange-400/50',
    safe:    isNight ? 'bg-slate-800/80 border-slate-600' : 'bg-white/80 border-white/50',
  }[stormInfo?.level ?? 'safe'];

  return (
    <div className={clsx(
      'relative rounded-xl sm:rounded-2xl transition-all duration-500 border backdrop-blur-md',
      'p-2 sm:p-3',
      bgColor,
      stormInfo?.level === 'cyclone' && 'animate-pulse'
    )}>
      {/* Storm badge */}
      {isHighWind && (
        <div
          className={clsx(
            'absolute -top-2 -right-2 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-bounce font-black shadow-lg whitespace-nowrap z-10',
            stormInfo?.level === 'cyclone' ? 'bg-purple-600' :
            stormInfo?.level === 'storm'   ? 'bg-red-600' : 'bg-orange-500'
          )}
        >
          {stormInfo?.emoji ?? '⚠️'}
        </div>
      )}

      {/* Compact layout */}
      <div className="flex items-center gap-2 sm:gap-0 sm:flex-col sm:gap-y-2">
        {/* Icon + temp */}
        <div className="flex items-center gap-1.5">
          {getIcon(14)}
          <span className={clsx(
            'font-black',
            isNight ? 'text-white' : 'text-slate-800',
            'text-sm sm:text-xl'
          )}>
            {temperature}°
          </span>
        </div>

        {/* Divider */}
        <div className={clsx('bg-white/20', 'w-px h-5 sm:w-full sm:h-px')} />

        {/* Wind */}
        <div className="flex items-center gap-1">
          <Wind size={11} className={clsx(
            isHighWind ? (stormInfo?.level === 'cyclone' ? 'text-purple-300' : 'text-red-400') :
            (isNight ? 'text-slate-400' : 'text-slate-500')
          )} />
          <span className={clsx(
            'font-bold',
            isHighWind ? (stormInfo?.level === 'cyclone' ? 'text-purple-300' : 'text-red-400') :
            (isNight ? 'text-white' : 'text-slate-800'),
            'text-sm sm:text-lg'
          )}>
            {windSpeed}
          </span>
          <span className="text-[10px] text-slate-400">km/h {windDirLabel}</span>
        </div>
      </div>

      {/* Expanded detail on sm+ */}
      <div className="hidden sm:block mt-1 pt-1.5 border-t border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Waves size={10} className="text-blue-400" />
            <span className={clsx('text-xs font-bold', isNight ? 'text-slate-400' : 'text-slate-500')}>
              {waveHeight}m
            </span>
          </div>
          <span className={clsx(
            'text-xs font-black uppercase truncate',
            stormInfo?.level === 'cyclone' ? 'text-purple-300' :
            stormInfo?.level === 'storm'   ? 'text-red-400' :
            stormInfo?.level === 'rough'   ? 'text-orange-400' :
            (isNight ? 'text-slate-400' : 'text-slate-500')
          )}>
            {stormInfo?.level ?? condition}
          </span>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-0.5 rounded-full hover:bg-white/20 transition"
              title="Refresh weather"
            >
              <RefreshCw size={10} className={isNight ? 'text-slate-400' : 'text-slate-500'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
