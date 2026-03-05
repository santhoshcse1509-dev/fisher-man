import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudLightning, Wind, Sun } from 'lucide-react';
import clsx from 'clsx';

export default function WeatherWidget({ isNight, simulate }) {
  const [data, setData] = useState({ temp: 28, windSpeed: 12, condition: 'clear' });

  useEffect(() => {
    const interval = setInterval(() => {
      if (simulate) {
        setData(prev => {
          const newSpeed = prev.windSpeed > 45 ? 10 : prev.windSpeed + 2;
          return {
            ...prev,
            windSpeed: newSpeed,
            condition: newSpeed > 30 ? 'stormy' : (newSpeed > 20 ? 'windy' : 'clear')
          };
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [simulate]);

  const getIcon = (size = 16) => {
    switch (data.condition) {
      case 'stormy': return <CloudLightning size={size} className="text-yellow-400 animate-pulse" />;
      case 'windy':  return <Wind size={size} className="text-slate-300 animate-pulse" />;
      case 'rain':   return <CloudRain size={size} className="text-blue-300" />;
      default: return isNight
        ? <Cloud size={size} className="text-slate-400" />
        : <Sun size={size} className="text-orange-400" />;
    }
  };

  const isHighWind = data.windSpeed > 30;

  return (
    <div className={clsx(
      "relative rounded-xl sm:rounded-2xl transition-all duration-500 border backdrop-blur-md",
      // Compact on mobile, full size on sm+
      "p-2 sm:p-3",
      isHighWind
        ? "bg-red-500/20 border-red-500/50"
        : (isNight ? "bg-slate-800/80 border-slate-600" : "bg-white/80 border-white/50")
    )}>
      {/* High wind badge */}
      {isHighWind && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-bounce font-bold shadow-lg whitespace-nowrap z-10">
          ⚠
        </div>
      )}

      {/* Compact mobile layout */}
      <div className="flex items-center gap-2 sm:gap-0 sm:flex-col sm:gap-y-2">
        {/* Condition + temp row */}
        <div className="flex items-center gap-1.5">
          {getIcon(14)}
          <span className={clsx(
            "font-black",
            // Temperature
            isNight ? "text-white" : "text-slate-800",
            "text-sm sm:text-xl"
          )}>
            {data.temp}°
          </span>
        </div>

        {/* Divider on mobile = vertical line; on sm+ = horizontal */}
        <div className={clsx(
          "bg-white/20",
          "w-px h-5 sm:w-full sm:h-px"
        )} />

        {/* Wind */}
        <div className="flex items-center gap-1">
          <Wind size={11} className={clsx(
            isHighWind ? "text-red-400" : (isNight ? "text-slate-400" : "text-slate-500")
          )} />
          <span className={clsx(
            "font-bold",
            isHighWind ? "text-red-400" : (isNight ? "text-white" : "text-slate-800"),
            "text-sm sm:text-lg"
          )}>
            {data.windSpeed}
          </span>
          <span className="text-[10px] text-slate-400">km/h</span>
        </div>
      </div>

      {/* Expanded weather detail only on sm+ */}
      <div className="hidden sm:block mt-1 pt-1.5 border-t border-white/10">
        <span className={clsx(
          "text-xs font-bold uppercase",
          isNight ? "text-slate-400" : "text-slate-500"
        )}>
          {data.condition}
        </span>
      </div>
    </div>
  );
}
