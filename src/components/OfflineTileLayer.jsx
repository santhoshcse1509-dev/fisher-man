/**
 * Custom Offline Tile Layer Component for React-Leaflet
 * Loads tiles from IndexedDB cache when available, falls back to online
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getCachedTile } from '../utils/tileCache';

// Online tile URLs
const ONLINE_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Custom Leaflet TileLayer that checks IndexedDB first
const CachedTileLayer = L.TileLayer.extend({
  _isOffline: false,
  _blobUrls: new Map(), // Track blob URLs for cleanup
  
  initialize: function(url, options) {
    L.TileLayer.prototype.initialize.call(this, url, options);
    this._checkOnlineStatus();
    
    // Periodically check online status
    setInterval(() => this._checkOnlineStatus(), 30000);
  },
  
  _checkOnlineStatus: function() {
    this._isOffline = !navigator.onLine;
  },
  
  createTile: function(coords, done) {
    const tile = document.createElement('img');
    
    tile.setAttribute('role', 'presentation');
    tile.alt = '';
    
    const { x, y } = coords;
    const z = coords.z;
    
    // Try to load from cache first
    this._loadTileFromCache(tile, z, x, y, coords, done);
    
    return tile;
  },
  
  _loadTileFromCache: async function(tile, z, x, y, coords, done) {
    try {
      const cachedBlob = await getCachedTile(z, x, y);
      
      if (cachedBlob) {
        // Use cached tile
        const blobUrl = URL.createObjectURL(cachedBlob);
        this._blobUrls.set(`${z}/${x}/${y}`, blobUrl);
        
        tile.onload = () => {
          done(null, tile);
        };
        tile.onerror = () => {
          // If blob fails, try online
          this._loadOnlineTile(tile, coords, done);
        };
        tile.src = blobUrl;
      } else {
        // No cache, try online
        await this._loadOnlineTile(tile, coords, done);
      }
    } catch (error) {
      console.warn('Cache error, trying online:', error);
      this._loadOnlineTile(tile, coords, done);
    }
  },
  
  _loadOnlineTile: function(tile, coords, done) {
    if (this._isOffline) {
      // Show placeholder for uncached tiles when offline
      tile.src = this._createPlaceholderTile();
      done(null, tile);
      return;
    }
    
    // Use standard online loading
    const url = this.getTileUrl(coords);
    
    tile.onload = () => {
      done(null, tile);
    };
    
    tile.onerror = () => {
      // Try fallback URL
      const fallbackUrl = this._getFallbackUrl(coords);
      tile.src = fallbackUrl || this._createPlaceholderTile();
      done(null, tile);
    };
    
    tile.src = url;
  },
  
  _getFallbackUrl: function(coords) {
    return OSM_TILE_URL
      .replace('{z}', coords.z)
      .replace('{x}', coords.x)
      .replace('{y}', coords.y);
  },
  
  _createPlaceholderTile: function() {
    // Create a simple blue water placeholder for uncached ocean tiles
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Ocean blue gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#0369a1');
    gradient.addColorStop(1, '#075985');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add subtle wave pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.arc(128, 128, 20 + i * 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Add "Offline" text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚓ Offline', 128, 128);
    
    return canvas.toDataURL();
  },
  
  // Clean up blob URLs when tiles are removed
  _removeTile: function(key) {
    const coords = this._tiles[key]?.coords;
    if (coords) {
      const blobKey = `${coords.z}/${coords.x}/${coords.y}`;
      const blobUrl = this._blobUrls.get(blobKey);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        this._blobUrls.delete(blobKey);
      }
    }
    L.TileLayer.prototype._removeTile.call(this, key);
  }
});

/**
 * React component wrapper for the custom tile layer
 */
export default function OfflineTileLayerComponent() {
  const map = useMap();
  const layerRef = useRef(null);
  
  useEffect(() => {
    // Create custom tile layer
    const tileLayer = new CachedTileLayer(ONLINE_TILE_URL, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: ['a', 'b', 'c', 'd'],
      maxZoom: 19,
      crossOrigin: true
    });
    
    tileLayer.addTo(map);
    layerRef.current = tileLayer;
    
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);
  
  return null;
}
