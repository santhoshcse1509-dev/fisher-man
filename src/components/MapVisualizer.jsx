import { MapContainer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import { BORDER_POINTS } from '../utils/geo';
import L from 'leaflet';
import { useEffect } from 'react';
import OfflineTileLayer from './OfflineTileLayer';

// Custom marker icon using embedded SVG (works offline)
const createMarkerIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <path fill="#2563eb" stroke="#1e40af" stroke-width="1" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
    <circle fill="#fff" cx="12.5" cy="12.5" r="5"/>
  </svg>`;
  
  return new L.DivIcon({
    html: svg,
    className: '',
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -41]
  });
};

const userMarkerIcon = createMarkerIcon();

// Component to handle map movement logic and clicks
function MapController({ position, isFollowing, onUserInteraction, onMapClick }) {
  const map = useMap();

  useMapEvents({
    dragstart: () => {
      onUserInteraction();
    },
    click: (e) => {
      onMapClick(e.latlng);
    }
  });

  useEffect(() => {
    if (isFollowing) {
      map.flyTo(position, map.getZoom(), {
        animate: true,
        duration: 2.0
      });
    }
  }, [position, isFollowing, map]);
  
  return null;
}

export default function MapVisualizer({ position, status, isFollowing, setIsFollowing, savedSpots = [], onRemoveSpot, navigationTarget, onMapClick }) {
  const borderLine = BORDER_POINTS.map(p => [p.lat, p.lng]);
  
  const statusColor = {
    safe: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  }[status];

  // Custom icon for generic saved spots (Fish)
  const fishIcon = new L.DivIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 12c.94-2.08 2.3-4 4.5-4 2.2 0 3.56 1.92 4.5 4"/><path d="M12.5 13 C 13.5 14 15 14 16 13 C 17 12 18 12 19 13 C 20 14 20 15 19 16 C 18 17 17 17 16 16 C 15 15 13.5 15 12.5 16"/></svg>`,
    className: 'bg-white rounded-full border-2 border-blue-500 shadow-sm p-1 cursor-pointer hover:scale-110 transition-transform',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  // Icon for Nets (Anchor/Buoy)
  const netIcon = new L.DivIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
    className: 'bg-orange-100 rounded-full border-2 border-orange-600 shadow-md p-1 cursor-pointer hover:scale-110 transition-transform animate-pulse',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  return (
    <div className="h-full w-full absolute inset-0 z-0">
      <MapContainer 
        center={[position.lat, position.lng]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {/* Offline-capable tile layer */}
        <OfflineTileLayer />
        
        {/* Border Line */}
        <Polyline 
          positions={borderLine} 
          pathOptions={{ color: '#ef4444', weight: 4, dashArray: '10, 10' }} 
        />
        
        {/* Navigation Line to Target Net */}
        {navigationTarget && (
          <Polyline 
            positions={[[position.lat, position.lng], [navigationTarget.lat, navigationTarget.lng]]}
            pathOptions={{ color: '#ea580c', weight: 3, dashArray: '5, 10' }}
          />
        )}
        
        {/* User Position */}
        <Circle 
          center={[position.lat, position.lng]}
          pathOptions={{ fillColor: statusColor, color: statusColor, fillOpacity: 0.3 }}
          radius={500}
        />
        <Marker position={[position.lat, position.lng]} icon={userMarkerIcon} />
        
        {/* Saved Spots & Nets */}
        {savedSpots.map((spot, idx) => (
           <Marker 
             key={spot.timestamp || idx} 
             position={[spot.lat, spot.lng]} 
             icon={spot.type === 'net' ? netIcon : fishIcon}
             eventHandlers={{
               click: (e) => {
                 L.DomEvent.stopPropagation(e.originalEvent);
                 e.originalEvent.preventDefault();
                 // Pass full spot object so we know type
                 if (onRemoveSpot) onRemoveSpot(spot);
               }
             }}
           />
        ))}

        <MapController 
          position={[position.lat, position.lng]} 
          isFollowing={isFollowing}
          onUserInteraction={() => setIsFollowing(false)}
          onMapClick={onMapClick}
        />
      </MapContainer>
    </div>
  );
}
