import React, { useState } from 'react';
import { History, Anchor, MapPin, X, Navigation, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function HistoryPanel({ isOpen, onClose, spots, onNavigate, onDelete, language }) {
  if (!isOpen) return null;

  const translations = {
    en: {
      title: 'Location History',
      empty: 'No saved locations yet.',
      net: 'Fishing Net',
      spot: 'Fishing Spot',
      navigate: 'Navigate',
      delete: 'Delete',
      footer: 'Safe Waters • Secure Nets'
    },
    ta: {
      title: 'இடங்களின் வரலாறு',
      empty: 'சேமிக்கப்பட்ட இடங்கள் இல்லை',
      net: 'மீன் வலை',
      spot: 'மீன் பிடி இடம்',
      navigate: 'செல்க',
      delete: 'நீக்கு',
      footer: 'பாதுகாப்பான கடல் • பாதுகாப்பான வலைகள்'
    }
  };

  const t = translations[language];

  // Sort by newest first
  const sortedSpots = [...spots].sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-GB', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-sm h-full bg-slate-900 text-white shadow-2xl p-6 flex flex-col animate-slide-in-right">
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <History className="text-blue-400" />
             <h2 className="text-xl font-bold uppercase tracking-wide">{t.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
          {sortedSpots.length === 0 && (
            <div className="text-center text-slate-500 mt-10 italic">
              {t.empty}
            </div>
          )}

          {sortedSpots.map((spot, idx) => (
            <div key={spot.timestamp} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3 hover:bg-white/10 transition">
              <div className="flex justify-between items-start">
                 <div className="flex items-center gap-3">
                    <div className={clsx("p-2 rounded-full", spot.type === 'net' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400')}>
                      {spot.type === 'net' ? <Anchor size={20} /> : <MapPin size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">
                        {spot.name || (spot.type === 'net' ? `${t.net}` : `${t.spot}`)}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {Math.abs(spot.lat).toFixed(4)}°N, {Math.abs(spot.lng).toFixed(4)}°E
                      </p>
                    </div>
                 </div>
                 <span className="text-[10px] text-slate-500 font-medium bg-black/30 px-2 py-1 rounded">
                   {formatDate(spot.timestamp)}
                 </span>
              </div>

              <div className="flex gap-2 mt-1">
                 <button 
                   onClick={() => { onNavigate(spot); onClose(); }} 
                   className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition"
                 >
                    <Navigation size={14} /> {t.navigate}
                 </button>
                 <button 
                   onClick={() => onDelete(spot)} 
                   className="px-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition"
                 >
                    <Trash2 size={16} />
                 </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs text-slate-500 uppercase font-bold tracking-widest">
           {t.footer}
        </div>
      </div>
    </div>
  );
}
