/**
 * Offline Map Manager Component
 * Provides UI for downloading maps for offline use
 */

import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Check, Trash2, X, Map, AlertTriangle, Loader2 } from 'lucide-react';
import { 
  downloadAllTiles, 
  getCacheStats, 
  clearTileCache, 
  getEstimatedCacheSize,
  getTileCount 
} from '../utils/tileCache';
import clsx from 'clsx';

export default function OfflineMapManager({ isOpen, onClose, language = 'en' }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [downloadResult, setDownloadResult] = useState(null);
  
  const translations = {
    en: {
      title: 'Offline Maps',
      subtitle: 'Download maps for use without internet',
      online: 'Online',
      offline: 'Offline',
      downloadMaps: 'Download Maps',
      downloading: 'Downloading...',
      cached: 'Maps Cached',
      notCached: 'No Maps Downloaded',
      tilesDownloaded: 'tiles saved',
      estimatedSize: 'Estimated size',
      clearCache: 'Clear Cache',
      close: 'Close',
      progress: 'Downloading',
      complete: 'Download Complete!',
      failed: 'Some tiles failed',
      region: 'India-Sri Lanka Fishing Region',
      warning: 'Download requires internet connection',
      successMsg: 'Maps are now available offline!',
      tilesToDownload: 'tiles to download',
      confirmClear: 'Clear all downloaded maps?',
      errorMsg: 'Download failed. Please try again.',
      failedTiles: 'tiles could not be downloaded'
    },
    ta: {
      title: 'ஆஃப்லைன் வரைபடங்கள்',
      subtitle: 'இணையமின்றி பயன்படுத்த வரைபடங்களை பதிவிறக்கவும்',
      online: 'இணைப்பில்',
      offline: 'இணைப்பில்லை',
      downloadMaps: 'வரைபடங்களை பதிவிறக்கு',
      downloading: 'பதிவிறக்குகிறது...',
      cached: 'வரைபடங்கள் சேமிக்கப்பட்டன',
      notCached: 'வரைபடங்கள் பதிவிறக்கப்படவில்லை',
      tilesDownloaded: 'டைல்ஸ் சேமிக்கப்பட்டது',
      estimatedSize: 'மதிப்பிடப்பட்ட அளவு',
      clearCache: 'காசை அழி',
      close: 'மூடு',
      progress: 'பதிவிறக்குகிறது',
      complete: 'பதிவிறக்கம் முடிந்தது!',
      failed: 'சில டைல்ஸ் தோல்வி',
      region: 'இந்தியா-இலங்கை மீன்பிடி பகுதி',
      warning: 'பதிவிறக்க இணைப்பு தேவை',
      successMsg: 'வரைபடங்கள் இப்போது ஆஃப்லைனில் கிடைக்கும்!',
      tilesToDownload: 'பதிவிறக்க டைல்ஸ்',
      confirmClear: 'வரைபடங்களை அழிக்கவா?',
      errorMsg: 'பதிவிறக்கம் தோல்வியுற்றது. மீண்டும் முயற்சிக்கவும்.',
      failedTiles: 'டைல்ஸ் பதிவிறக்கம் செய்ய முடியவில்லை'
    }
  };
  
  const t = translations[language] || translations.en;
  
  // Load cache stats on mount
  useEffect(() => {
    if (isOpen) {
      loadCacheStats();
    }
  }, [isOpen]);
  
  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const loadCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  };
  
  const handleDownload = async () => {
    if (!isOnline) return;
    
    setIsDownloading(true);
    setDownloadResult(null);
    setDownloadProgress({ current: 0, total: getTileCount(), percent: 0 });
    
    try {
      const result = await downloadAllTiles((current, total, percent) => {
        setDownloadProgress({ current, total, percent });
      });
      
      setDownloadResult(result);
      await loadCacheStats();
    } catch (error) {
      console.error('Download error:', error);
      setDownloadResult({ error: true });
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleClearCache = async () => {
    if (confirm(t.confirmClear)) {
      await clearTileCache();
      await loadCacheStats();
      setDownloadResult(null);
    }
  };
  
  if (!isOpen) return null;
  
  const estimatedSize = getEstimatedCacheSize();
  const tileCount = getTileCount();
  const hasCachedMaps = cacheStats && cacheStats.cachedTiles > 0;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Map className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.title}</h2>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Online Status */}
          <div className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            isOnline ? "bg-emerald-500/20" : "bg-red-500/20"
          )}>
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <span className={clsx(
              "font-medium",
              isOnline ? "text-emerald-400" : "text-red-400"
            )}>
              {isOnline ? t.online : t.offline}
            </span>
          </div>
          
          {/* Region Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Map className="w-4 h-4" />
              <span className="text-sm font-medium">{t.region}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">{t.estimatedSize}:</span>
                <span className="text-white font-bold ml-2">~{estimatedSize} MB</span>
              </div>
              <div>
                <span className="text-slate-400">{t.tilesToDownload}:</span>
                <span className="text-white font-bold ml-2">{tileCount}</span>
              </div>
            </div>
          </div>
          
          {/* Cache Status */}
          {cacheStats && (
            <div className={clsx(
              "rounded-xl p-4",
              hasCachedMaps ? "bg-emerald-500/20" : "bg-amber-500/20"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {hasCachedMaps ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <span className={clsx(
                  "font-medium",
                  hasCachedMaps ? "text-emerald-400" : "text-amber-400"
                )}>
                  {hasCachedMaps ? t.cached : t.notCached}
                </span>
              </div>
              {hasCachedMaps && (
                <div className="text-sm text-slate-300">
                  {cacheStats.cachedTiles} {t.tilesDownloaded} ({cacheStats.percentComplete}%)
                </div>
              )}
            </div>
          )}
          
          {/* Download Progress */}
          {isDownloading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">{t.progress}...</span>
                <span className="text-white ml-auto">{downloadProgress.percent}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 text-center">
                {downloadProgress.current} / {downloadProgress.total}
              </div>
            </div>
          )}
          
          {/* Download Result */}
          {downloadResult && !isDownloading && (
            <div className={clsx(
              "rounded-xl p-4 text-center",
              downloadResult.error || downloadResult.failed > 0 
                ? "bg-amber-500/20" 
                : "bg-emerald-500/20"
            )}>
              {downloadResult.error ? (
                <p className="text-red-400">{t.errorMsg}</p>
              ) : (
                <>
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-bold">{t.complete}</p>
                  <p className="text-sm text-slate-300 mt-1">{t.successMsg}</p>
                  {downloadResult.failed > 0 && (
                    <p className="text-xs text-amber-400 mt-2">
                      {downloadResult.failed} {t.failedTiles}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Offline Warning */}
          {!isOnline && !hasCachedMaps && (
            <div className="bg-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-300">{t.warning}</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading || !isOnline}
            className={clsx(
              "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition",
              isDownloading || !isOnline
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/30"
            )}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.downloading}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {t.downloadMaps}
              </>
            )}
          </button>
          
          {hasCachedMaps && (
            <button
              onClick={handleClearCache}
              disabled={isDownloading}
              className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 transition"
            >
              <Trash2 className="w-4 h-4" />
              {t.clearCache}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
