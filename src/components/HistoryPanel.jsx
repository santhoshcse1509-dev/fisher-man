import React from 'react';
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

  const t = translations[language] || translations.en;
  const sortedSpots = [...spots].sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-GB', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end items-end sm:items-stretch"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/*
        Panel:
        - Mobile: full-width bottom sheet, max 85vh tall
        - sm+: right side panel, full height, max-w-sm
      */}
      <div className={clsx(
        "relative z-10 bg-slate-900 text-white shadow-2xl flex flex-col",
        // Mobile — bottom sheet
        "w-full max-h-[85vh] rounded-t-3xl animate-slide-in-up",
        // sm+ — side panel
        "sm:w-full sm:max-w-sm sm:h-full sm:max-h-full sm:rounded-none sm:animate-slide-in-right"
      )}>

        {/* Drag handle — visible on mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 flex-shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <History className="text-blue-400" size={20} />
            <h2 className="text-base sm:text-xl font-bold uppercase tracking-wide">{t.title}</h2>
          </div>
          <button
            id="history-close-btn"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition touch-target"
            aria-label="Close history"
          >
            <X size={22} />
          </button>
        </div>

        {/* Spots list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin modal-scroll p-4 sm:p-5 space-y-3">
          {sortedSpots.length === 0 && (
            <div className="text-center text-slate-500 mt-10 italic text-sm">
              {t.empty}
            </div>
          )}

          {sortedSpots.map((spot) => (
            <div
              key={spot.timestamp}
              className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col gap-3 hover:bg-white/10 transition"
            >
              {/* Spot info row */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className={clsx(
                    "p-1.5 sm:p-2 rounded-full flex-shrink-0",
                    spot.type === 'net'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {spot.type === 'net' ? <Anchor size={16} /> : <MapPin size={16} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">
                      {spot.name || (spot.type === 'net' ? t.net : t.spot)}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {Math.abs(spot.lat).toFixed(4)}°N, {Math.abs(spot.lng).toFixed(4)}°E
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-medium bg-black/30 px-2 py-1 rounded flex-shrink-0 whitespace-nowrap">
                  {formatDate(spot.timestamp)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  id={`history-navigate-${spot.timestamp}`}
                  onClick={() => { onNavigate(spot); onClose(); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition touch-target"
                >
                  <Navigation size={13} />
                  {t.navigate}
                </button>
                <button
                  id={`history-delete-${spot.timestamp}`}
                  onClick={() => onDelete(spot)}
                  className="px-3.5 bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/60 text-red-400 rounded-lg transition touch-target"
                  aria-label={`Delete ${spot.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/10 text-center text-xs text-slate-500 uppercase font-bold tracking-widest">
          {t.footer}
        </div>
      </div>
    </div>
  );
}
