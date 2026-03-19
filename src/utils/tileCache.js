/**
 * Offline Tile Cache System for WaveGuard
 * Uses IndexedDB to store map tiles for offline use
 */

import { openDB } from 'idb';
import L from 'leaflet';

const DB_NAME = 'fisherman-tiles-db';
const STORE_NAME = 'tiles';
const DB_VERSION = 1;

// India-Sri Lanka fishing region bounds
export const FISHING_REGION = {
  minLat: 8.5,
  maxLat: 10.5,
  minLng: 78.5,
  maxLng: 80.5
};

// Zoom levels to cache
const ZOOM_LEVELS = [8, 9, 10, 11, 12, 13, 14];

// Tile URL template
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Initialize the IndexedDB database for tile storage
 */
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

/**
 * Convert lat/lng to tile coordinates for a given zoom level
 */
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
}

/**
 * Generate tile key for storage
 */
function getTileKey(z, x, y) {
  return `${z}/${x}/${y}`;
}

/**
 * Get all tile coordinates for the fishing region at specified zoom levels
 */
export function getTilesToCache() {
  const tiles = [];
  
  for (const zoom of ZOOM_LEVELS) {
    const minTile = latLngToTile(FISHING_REGION.maxLat, FISHING_REGION.minLng, zoom);
    const maxTile = latLngToTile(FISHING_REGION.minLat, FISHING_REGION.maxLng, zoom);
    
    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
  }
  
  return tiles;
}

/**
 * Get approximate number of tiles to download
 */
export function getTileCount() {
  return getTilesToCache().length;
}

/**
 * Get estimated cache size in MB
 */
export function getEstimatedCacheSize() {
  return Math.round(getTileCount() * 15 / 1024);
}

/**
 * Check if a tile is cached
 */
export async function isTileCached(z, x, y) {
  try {
    const db = await initDB();
    const key = getTileKey(z, x, y);
    const tile = await db.get(STORE_NAME, key);
    return !!tile;
  } catch (error) {
    console.error('Error checking tile cache:', error);
    return false;
  }
}

/**
 * Get a cached tile
 */
export async function getCachedTile(z, x, y) {
  try {
    const db = await initDB();
    const key = getTileKey(z, x, y);
    return await db.get(STORE_NAME, key);
  } catch (error) {
    console.error('Error getting cached tile:', error);
    return null;
  }
}

/**
 * Store a tile in the cache
 */
export async function cacheTile(z, x, y, blob) {
  try {
    const db = await initDB();
    const key = getTileKey(z, x, y);
    await db.put(STORE_NAME, blob, key);
    return true;
  } catch (error) {
    console.error('Error caching tile:', error);
    return false;
  }
}

/**
 * Download and cache a single tile
 */
async function downloadTile(z, x, y) {
  const url = TILE_URL_TEMPLATE.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    await cacheTile(z, x, y, blob);
    return true;
  } catch (error) {
    console.warn(`Failed to download tile ${z}/${x}/${y}:`, error.message);
    return false;
  }
}

/**
 * Download all tiles for offline use
 * @param {Function} onProgress - Callback with (current, total, percent)
 */
export async function downloadAllTiles(onProgress) {
  const tiles = getTilesToCache();
  const total = tiles.length;
  let downloaded = 0;
  let failed = 0;
  
  const batchSize = 5;
  
  for (let i = 0; i < tiles.length; i += batchSize) {
    const batch = tiles.slice(i, i + batchSize);
    
    const results = await Promise.all(
      batch.map(tile => downloadTile(tile.z, tile.x, tile.y))
    );
    
    results.forEach(success => {
      if (success) downloaded++;
      else failed++;
    });
    
    const progress = Math.round(((downloaded + failed) / total) * 100);
    onProgress?.(downloaded + failed, total, progress);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { downloaded, failed, total };
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await initDB();
    const allKeys = await db.getAllKeys(STORE_NAME);
    const tileCount = allKeys.length;
    const expectedCount = getTileCount();
    
    return {
      cachedTiles: tileCount,
      expectedTiles: expectedCount,
      percentComplete: Math.round((tileCount / expectedCount) * 100),
      estimatedSizeMB: Math.round(tileCount * 15 / 1024)
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      cachedTiles: 0,
      expectedTiles: getTileCount(),
      percentComplete: 0,
      estimatedSizeMB: 0
    };
  }
}

/**
 * Clear all cached tiles
 */
export async function clearTileCache() {
  try {
    const db = await initDB();
    await db.clear(STORE_NAME);
    return true;
  } catch (error) {
    console.error('Error clearing tile cache:', error);
    return false;
  }
}

/**
 * Custom TileLayer class that uses cached tiles when offline
 */
export class OfflineTileLayer extends L.TileLayer {
  constructor(options = {}) {
    super('', options);
    this.dbPromise = initDB();
  }

  async createTile(coords, done) {
    const { x, y, z } = coords;
    const key = getTileKey(z, x, y);

    try {
      const db = await this.dbPromise;
      const blob = await db.get(STORE_NAME, key);

      if (blob) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          done(null, img);
        };
        img.onerror = (e) => done(e, null);
        img.src = url;
        return img;
      }
    } catch (err) {
      console.warn('Cache miss/error', err);
    }

    return super.createTile(coords, done);
  }
}

export default {
  FISHING_REGION,
  getTilesToCache,
  getTileCount,
  getEstimatedCacheSize,
  downloadAllTiles,
  getCacheStats,
  clearTileCache,
  getCachedTile,
  isTileCached,
  cacheTile
};