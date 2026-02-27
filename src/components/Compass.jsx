import React from 'react';
import { Navigation } from 'lucide-react';

export default function Compass({ heading = 0 }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center bg-slate-800/80 rounded-full border-2 border-slate-600 backdrop-blur-md shadow-lg">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-slate-400 absolute top-1">N</span>
        <span className="text-xs font-bold text-slate-400 absolute bottom-1">S</span>
        <span className="text-xs font-bold text-slate-400 absolute left-2">W</span>
        <span className="text-xs font-bold text-slate-400 absolute right-2">E</span>
      </div>
      <div 
        className="transition-transform duration-500 ease-out"
        style={{ transform: `rotate(${heading}deg)` }}
      >
        <Navigation size={40} className="text-blue-500 fill-blue-500/20" />
      </div>
    </div>
  );
}
