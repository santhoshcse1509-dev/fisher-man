import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudLightning, Wind, Sun } from 'lucide-react';
import clsx from 'clsx';

export default function WeatherWidget({ isNight, simulate }) {
  const [data, setData] = useState({
    temp: 28,
    windSpeed: 12,
    condition: 'clear'
  });

  useEffect(() => {
    // In a real app, fetch from OpenWeatherMap here
    // For now, we simulate dynamic weather changes
    const interval = setInterval(() => {
      if (simulate) {
        setData(prev => {
          // Slowly increase wind speed to demonstrate alert
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

  const getIcon = () => {
    switch(data.condition) {
      case 'stormy': return <CloudLightning className="text-yellow-400 animate-pulse" />;
      case 'windy': return <Wind className="text-slate-300 animate-pulse" />;
      case 'rain': return <CloudRain className="text-blue-300" />;
      default: return isNight ? <Cloud className="text-slate-400" /> : <Sun className="text-orange-400" />;
    }
  };

  const isHighWind = data.windSpeed > 30;

  return (
    <div className={clsx(
      "rounded-2xl p-3 flex flex-col gap-2 transition-all duration-500 border backdrop-blur-md",
      isHighWind ? "bg-red-500/20 border-red-500/50" : (isNight ? "bg-slate-800/80 border-slate-600" : "bg-white/80 border-white/50")
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            {getIcon()}
            <span className={clsx("text-sm font-bold uppercase", isHighWind ? "text-red-200" : (isNight ? "text-slate-300" : "text-slate-600"))}>
              {data.condition}
            </span>
        </div>
        <span className={clsx("text-xl font-black", isNight ? "text-white" : "text-slate-800")}>
          {data.temp}°
        </span>
      </div>
      
      <div className="flex items-center justify-between border-t border-white/10 pt-2">
         <span className={clsx("text-xs font-bold uppercase", isNight ? "text-slate-400" : "text-slate-500")}>WIND</span>
         <div className="flex items-center gap-1">
            <span className={clsx("text-lg font-bold", isHighWind ? "text-red-400" : (isNight ? "text-white" : "text-slate-800"))}>
               {data.windSpeed}
            </span>
            <span className="text-xs text-slate-400">km/h</span>
         </div>
      </div>
      
      {isHighWind && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded-full animate-bounce font-bold shadow-lg">
          HIGH WIND
        </div>
      )}
    </div>
  );
}
