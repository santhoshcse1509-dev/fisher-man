import React, { useState, useEffect, useRef } from 'react';
import MapVisualizer from './components/MapVisualizer';
import Compass from './components/Compass';
import Auth from './components/Auth';
import Profile from './components/Profile';
import WeatherWidget from './components/WeatherWidget';
import HistoryPanel from './components/HistoryPanel';
import OfflineMapManager from './components/OfflineMapManager';
import TamilVoiceAssistant from './components/TamilVoiceAssistant';
import { getDistanceToBorder, getStatus, calculateDistance, getSafeDirection } from './utils/geo';
import { useAdvancedLocation } from './hooks/useAdvancedLocation';

import { AlertTriangle, ShieldCheck, Siren, Navigation, Volume2, VolumeX, Moon, Sun, Signal, SignalHigh, SignalLow, MapPin, Crosshair, LogOut, Anchor, Target, History, Save, X, User, ArrowBigUp, Phone, Map, Download, Languages } from 'lucide-react';

import clsx from 'clsx';
import { Howl } from 'howler';

// Sounds
const sirenSound = new Howl({
  src: ['https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3'], 
  loop: true,
  volume: 0.8,
});

function App() {
  // Auth State
  const [user, setUser] = useState(null);

  const [position, setPosition] = useState({ lat: 9.28, lng: 79.3 });
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState('safe');
  const [distance, setDistance] = useState(0);
  const [muted, setMuted] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [language, setLanguage] = useState('ta');
  
  // Navigation State
  const [isFollowing, setIsFollowing] = useState(true);
  
  // Initialize savedSpots from localStorage
  const [savedSpots, setSavedSpots] = useState(() => {
    const saved = localStorage.getItem('fisher_saved_spots');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sosMode, setSosMode] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showOfflineMaps, setShowOfflineMaps] = useState(false);
  
  // Safe Direction & Alerts
  const [safeDirection, setSafeDirection] = useState(0);
  const [alertSent, setAlertSent] = useState(false);
  const [alertRecipients, setAlertRecipients] = useState([]);
  
  const [manualMode, setManualMode] = useState(false);
  const [isGpsMode, setIsGpsMode] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationInterval = useRef(null);

  // Handle map clicks: either set manual position or save a spot
  const handleMapClick = (latlng) => {
    if (manualMode) {
      // Directly update user position and turn off GPS auto-mode
      setPosition({ lat: latlng.lat, lng: latlng.lng });
      setIsGpsMode(false);
      setIsSimulating(false);
      setManualMode(false); // exit manual mode after setting
    } else {
      // Default behaviour – save a fishing spot
      initiateSaveSpot(latlng, 'fish');
    }
  };
  
  // Name Input Modal State
  const [pendingSpot, setPendingSpot] = useState(null); // { lat, lng, type }
  const [spotNameInput, setSpotNameInput] = useState('');

  // SOS Interval Ref
  const sosIntervalRef = useRef(null);
  const lastAnnouncedDistance = useRef(Infinity);
  
  const translations = {
    en: {
      safe: 'You are Safe',
      warning: 'Warning: Border Near',
      danger: 'DANGER: TURN BACK',
      distance: 'Distance',
      speed: 'Speed',
      knots: 'knots',
      turnBack: 'Turn Back Immediately!',
      systemActive: 'System Active',
      checkNav: 'Check Navigation',
      dropNet: 'Drop Net',
      navigatingToNet: 'Navigating to Net',
      arrived: 'Arrived at Net',
      saveSpotTitle: 'Save Location',
      enterName: 'Enter Name (Optional)',
      save: 'Save',
      cancel: 'Cancel',
      reduceSpeed: 'REDUCE SPEED',
      safeDirection: 'Safe Direction',
      alertSent: 'Alert Sent to Family & Police',
      stopSOS: 'STOP SOS',
      tapToSms: 'Tap to Send SMS',
      emergencyTitle: 'EMERGENCY',
      alertSentContacts: 'Alert Sent to Emergency Contacts',
      removeSpot: 'Remove this spot?',
      locationRemoved: 'Location Removed',
      locationSaved: 'Location Saved',
      autoDetect: 'AUTO',
      offlineMaps: 'Offline Maps',
      navigating: 'Navigating to',
      statusSafe: 'You are Safe',
      confirmRemove: 'Remove this spot?',
      sysAlertTest: 'System Alert Test Initiated',
      testStarted: 'System check started'
    },
    ta: {
      safe: 'பாதுகாப்பான பகுதி',
      warning: 'எச்சரிக்கை: எல்லை அருகில்',
      danger: 'ஆபத்து: உடனே திரும்பவும்',
      distance: 'எல்லை தூரம்',
      speed: 'வேகம்',
      knots: 'நாட்',
      turnBack: 'உடனே திரும்பவும்!',
      systemActive: 'கண்காணிப்பு துவங்கப்பட்டது',
      checkNav: 'திசையை சரிபார்க்கவும்',
      dropNet: 'வலை விரிக்க',
      navigatingToNet: 'வலை நோக்கி',
      arrived: 'வலை அருகில்',
      saveSpotTitle: 'இடத்தை சேமிக்கவும்',
      enterName: 'பெயர் (விருப்பம்)',
      save: 'சேமி',
      cancel: 'ரத்து',
      reduceSpeed: 'வேகத்தை குறைக்கவும்',
      safeDirection: 'பாதுகாப்பான திசை',
      alertSent: 'எச்சரிக்கை செய்தி அனுப்பப்பட்டது',
      stopSOS: 'அவசர உதவியை நிறுத்து',
      tapToSms: 'SMS அனுப்ப கிளிக் செய்யவும்',
      emergencyTitle: 'அவசரம்',
      alertSentContacts: 'உறவினர்களுக்கு தகவல் அனுப்பப்பட்டது',
      removeSpot: 'இந்த இடத்தை நீக்கவா?',
      locationRemoved: 'இடம் நீக்கப்பட்டது',
      locationSaved: 'இடம் சேமிக்கப்பட்டது',
      autoDetect: 'தானியங்கி',
      offlineMaps: 'ஆஃப்லைன் வரைபடம்',
      navigating: 'நோக்கி பயணம்',
      statusSafe: 'நீங்கள் பாதுகாப்பாக உள்ளீர்கள்',
      confirmRemove: 'இந்த இடத்தை நீக்கவா?',
      sysAlertTest: 'கணினி ஆய்வு துவங்கப்பட்டது',
      testStarted: 'ஆய்வு துவங்கப்பட்டது'
    }
  };

  const speak = (text, langOverride) => {
    if (muted) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.lang = langOverride || (language === 'ta' ? 'ta-IN' : 'en-US');
      window.speechSynthesis.speak(utterance);
    }
  };

  // Request Notification Permission on Mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Sync Saved Spots to LocalStorage
  useEffect(() => {
    localStorage.setItem('fisher_saved_spots', JSON.stringify(savedSpots));
  }, [savedSpots]);

  useEffect(() => {
    if (!user) return; 

    const dist = getDistanceToBorder(position.lat, position.lng);
    setDistance(dist);
    
    // Calculate Safe Direction
    setSafeDirection(getSafeDirection(position.lat, position.lng));
    
    // Check Status for Border
    const newStatus = getStatus(dist);
    
    // 1. Handle Status Change Alerts
    if (newStatus !== status) {
      setStatus(newStatus);
      if (newStatus === 'danger') {
         speak(translations[language].danger);
         if (!muted) sirenSound.play();
         
         // Intense Vibration for Danger
         if ("vibrate" in navigator) {
           navigator.vibrate([1000, 500, 1000, 500, 1000, 500, 1000]);
         }
         
         // Auto-Activate SOS Mode and Alert
         if (!sosMode) {
            setSosMode(true);
         }
         
         // Trigger Alert if not sent
         if (!alertSent) {
            setAlertSent(true);
         }
      } else {
         sirenSound.stop();
         if (newStatus === 'warning') {
           speak(translations[language].warning);
           // Warning Vibration Pulse
           if ("vibrate" in navigator) {
             navigator.vibrate([400, 200, 400]);
           }
         }
         if (newStatus === 'safe') {
            setAlertSent(false); // Reset alert
            setSosMode(false);   // Stop SOS if they move back to safe
             if ("vibrate" in navigator) {
               navigator.vibrate(0); // Stop vibration
             }
             speak(translations[language].statusSafe);
          }
      }
      // Reset periodic announcer when status changes to avoid double-speaking
      lastAnnouncedDistance.current = dist;
    } 
    // 2. Handle Periodic Distance Updates (if getting closer)
    else if (newStatus !== 'safe') {
      const distanceDiff = lastAnnouncedDistance.current - dist; // Positive if getting closer
      const threshold = newStatus === 'danger' ? 500 : 1000;
      
      if (distanceDiff >= threshold) {
        const kmDist = (dist / 1000).toFixed(1);
        const text = language === 'ta' 
          ? `எல்லை தூரம் ${kmDist} கிலோமீட்டர்` 
          : `Distance to border is ${kmDist} kilometers`;
        speak(text);
        lastAnnouncedDistance.current = dist;
      } else if (dist > lastAnnouncedDistance.current) {
        // We are moving away, update the benchmark so we alert if we turn back
        lastAnnouncedDistance.current = dist;
      }
    } else {
      lastAnnouncedDistance.current = Infinity; // Reset when safe
    }
    return () => {
      sirenSound.stop();
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, [position, language, user, status]);

  // Advanced Location Hook
  const advLoc = useAdvancedLocation({ 
    enableHighAccuracy: true, 
    timeout: 15000,
    seaOptimized: true 
  });

  // Sync Advanced Location to state when in GPS Mode
  useEffect(() => {
    if (isGpsMode && !isSimulating && user && advLoc.lat !== null && advLoc.lng !== null) {
      setPosition({ lat: advLoc.lat, lng: advLoc.lng });
      setHeading(advLoc.heading || 0);
      setSpeed(advLoc.speed * 1.94384); // Convert m/s to knots for the UI
      setGpsAccuracy(advLoc.accuracy);
    }
  }, [advLoc, isGpsMode, isSimulating, user]);

  // Removed legacy Real GPS Logic

  // Step 1: Trigger Modal
  const initiateSaveSpot = (latlng, type = 'fish') => {
    const spot = latlng ? { lat: latlng.lat, lng: latlng.lng } : position;
    setPendingSpot({ ...spot, type });
    setSpotNameInput(''); // Reset input
  };

  // Step 2: Confirm Save
  const confirmSaveSpot = (e) => {
    e.preventDefault();
    if (!pendingSpot) return;

    const timestamp = Date.now();
    let finalName = spotNameInput.trim();
    
    // Auto-generate name if empty
    if (!finalName) {
      const dateStr = new Date(timestamp).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-GB', {
         month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      finalName = pendingSpot.type === 'net' 
        ? `${translations[language].dropNet} - ${dateStr}`
        : `${translations[language].saveSpotTitle} - ${dateStr}`;
    }

    setSavedSpots(prev => [...prev, { 
      ...pendingSpot, 
      name: finalName, 
      timestamp 
    }]);
    
    speak(translations[language].locationSaved);
    setPendingSpot(null); // Close modal
  };

  const removeSavedSpot = (spotToRemove) => {
    if (confirm(translations[language].confirmRemove)) {
      setSavedSpots(prev => prev.filter(s => s.timestamp !== spotToRemove.timestamp));
      if (navigationTarget && navigationTarget.lat === spotToRemove.lat && navigationTarget.lng === spotToRemove.lng) {
        setNavigationTarget(null);
      }
      speak(translations[language].locationRemoved);
    }
  };
  
  const handleSpotNavigation = (spot) => {
    setNavigationTarget({ lat: spot.lat, lng: spot.lng });
    setIsFollowing(true); 
    setShowHistory(false);
    speak(`${translations[language].navigating} ${spot.name}`);
  };

  // State for Manual SMS Link (Fallback)
  const [manualSmsLink, setManualSmsLink] = useState(null);

  const sendEmergencyAlert = () => {
    const saved = localStorage.getItem('fisher_profile');
    if (saved) {
        const profile = JSON.parse(saved);
        
        // Helper to clean numbers (remove non-digits)
        const clean = (num) => num ? num.replace(/\D/g, '') : null;
        
        // Raw numbers for display with labels
        const numbersDisplay = [
            profile.mobile ? `${profile.mobile} (Self)` : null,
            profile.family1 ? `${profile.family1} (Family)` : null, 
            profile.family2 ? `${profile.family2} (Family)` : null, 
            profile.police ? `${profile.police} (Police)` : null
        ].filter(Boolean);

        // Clean numbers for SMS protocol
        const rawNumbers = [
            clean(profile.mobile),
            clean(profile.family1),
            clean(profile.family2),
            clean(profile.police)
        ].filter(Boolean);

        if (numbersDisplay.length > 0) {
            setAlertRecipients(numbersDisplay);
            
            // 1. Browser Notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Fisherman Alert: EMERGENCY", {
                   body: `Sending Alert to ${rawNumbers.length} contacts...`
                });
            }

            // 2. Construct Robust SMS Link
            const message = `EMERGENCY: Fisher ${profile.username || 'User'} is crossing border at ${position.lat.toFixed(4)},${position.lng.toFixed(4)}. Help Required.`;
            const encodedBody = encodeURIComponent(message);
            
            // Determine separator based on OS (heuristic)
            const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const separator = isiOS ? '&' : ',';
            
            const recipients = rawNumbers.join(separator);
            const smsUrl = `sms:${recipients}${isiOS ? '&' : '?'}body=${encodedBody}`;

            setManualSmsLink(smsUrl); // Store for manual button

            // 3. Robust Auto-Open Attempt using hidden link click
            setTimeout(() => {
                // Method A: Link Click (Standard way to trigger custom protocols like sms:)
                const link = document.createElement('a');
                link.href = smsUrl;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 500);

            console.log("SIMULATION: Attempting SMS to", rawNumbers, smsUrl);
        }
    }
  };

  // Simulation Logic
  useEffect(() => {
    if (isSimulating) {
      setIsGpsMode(false); // Disable GPS during simulation
      // Start near Rameswaram, move towards border
      let simLat = 9.25; 
      let simLng = 79.25;
      
      simulationInterval.current = setInterval(() => {
        setPosition(prev => {
          // Move North-East towards border (approx 10.0, 79.8)
          const newLat = prev.lat + 0.002;
          const newLng = prev.lng + 0.002;
          
          // Update Speed
          setSpeed(12 + Math.random() * 2); // Fast speed to trigger alerts
          setHeading(45); // Moving NE
          return { lat: newLat, lng: newLng };
        });
      }, 1000);
    } else {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    }
    return () => clearInterval(simulationInterval.current);
  }, [isSimulating]);

  // Reactive SOS Logic
  useEffect(() => {
    if (sosMode) {
       // Send Message to Contacts Automatically
       sendEmergencyAlert();
       
       // Start Bilingual Loop
       let toggle = false; // false = En, true = Ta
       const playAlert = () => {
          if (toggle) {
             speak("ஆபத்து.. உதவி தேவை..", 'ta-IN');
          } else {
             speak("SOS.. Help Needed..", 'en-US');
          }
          // SOS Pulsing Vibration
          if ("vibrate" in navigator) {
             navigator.vibrate([500, 200, 500]);
          }
          toggle = !toggle;
       };
       playAlert(); // Immediate
       sosIntervalRef.current = setInterval(playAlert, 4000); // Loop
    } else {
       if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
       window.speechSynthesis.cancel();
       if ("vibrate" in navigator) navigator.vibrate(0);
       sirenSound.stop();
    }
    return () => {
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    };
  }, [sosMode]);

  const toggleSOS = () => {
    setSosMode(!sosMode);
  };

  const handleVoiceCommand = (cmd) => {
    console.log("Voice Command received:", cmd);
    switch(cmd) {
      case 'sos':
        if (!sosMode) toggleSOS();
        break;
      case 'stop':
        if (sosMode) toggleSOS();
        break;
      case 'saveSpot':
        initiateSaveSpot(null, 'fish');
        break;
      case 'dropNet':
        initiateSaveSpot(null, 'net');
        break;
      default:
        break;
    }
  };

  const triggerTestAlert = () => {
    speak(translations[language].sysAlertTest);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    setTimeout(() => {
       if (!muted) {
         sirenSound.play();
         setTimeout(() => sirenSound.stop(), 2000);
       }
    }, 2000);
  };

  if (!user) {
    return <Auth onLogin={(id) => setUser({ id })} />;
  }

  const themeColors = {
    safe: nightMode ? 'bg-emerald-900/90 text-emerald-100' : 'bg-emerald-500 text-white',
    warning: nightMode ? 'bg-amber-900/90 text-amber-100' : 'bg-amber-500 text-black',
    danger: nightMode ? 'bg-red-900/90 text-red-100 animate-pulse' : 'bg-red-600 text-white animate-pulse-fast'
  };

  const statusIcon = {
    safe: <ShieldCheck size={42} />,
    warning: <AlertTriangle size={42} />,
    danger: <Siren size={42} />
  };

  // Calculate generic distance to target
  const distToTarget = navigationTarget ? calculateDistance(position.lat, position.lng, navigationTarget.lat, navigationTarget.lng) : 0;

  return (
    <div className={clsx("relative w-full h-full flex flex-col font-sans overflow-hidden transition-colors duration-500", 
      nightMode ? "bg-slate-900" : "bg-ocean-50",
      sosMode && "animate-pulse bg-red-900" 
    )}>
      
      <HistoryPanel 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        spots={savedSpots}
        onNavigate={handleSpotNavigation}
        onDelete={removeSavedSpot}
        language={language}
      />

      <Profile 
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        language={language}
        onTestAlert={triggerTestAlert}
      />

      <OfflineMapManager
        isOpen={showOfflineMaps}
        onClose={() => setShowOfflineMaps(false)}
        language={language}
      />

      <TamilVoiceAssistant 
        language={language}
        onCommand={handleVoiceCommand}
        distanceToBorder={distance}
        status={status}
        isFollowing={isFollowing}
        muted={muted}
      />

      {/* Name Input Modal */}
      {pendingSpot && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <form onSubmit={confirmSaveSpot} className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 shadow-2xl border border-white/20 animate-scale-in">
              <h3 className="text-xl font-bold text-white mb-1">{translations[language].saveSpotTitle}</h3>
              <p className="text-slate-400 text-sm mb-4">
                 {pendingSpot.lat.toFixed(4)}, {pendingSpot.lng.toFixed(4)}
              </p>
              
              <div className="relative mb-6">
                 <input 
                   autoFocus
                   type="text" 
                   value={spotNameInput}
                   onChange={(e) => setSpotNameInput(e.target.value)}
                   className="w-full bg-black/40 text-white border border-slate-600 rounded-xl p-4 text-lg focus:outline-none focus:border-blue-500 transition placeholder-slate-500"
                   placeholder={translations[language].enterName}
                 />
              </div>
              
              <div className="flex gap-3">
                 <button 
                   type="button" 
                   onClick={() => setPendingSpot(null)}
                   className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition"
                 >
                   {translations[language].cancel}
                 </button>
                 <button 
                   type="submit"
                   className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition flex justify-center items-center gap-2"
                 >
                   <Save size={18} />
                   {translations[language].save}
                 </button>
              </div>
           </form>
        </div>
      )}

      {/* Map Layer */}
      <div className={clsx("absolute inset-0 z-0 transition-opacity duration-500", nightMode ? "opacity-40 grayscale" : "opacity-100")}>
        <MapVisualizer 
           position={position} 
           status={status} 
           isFollowing={isFollowing} 
           setIsFollowing={setIsFollowing}
           savedSpots={savedSpots}
           onSaveSpot={(coords) => initiateSaveSpot(coords, 'fish')} // Add 'type' arg support
           onRemoveSpot={removeSavedSpot}
           navigationTarget={navigationTarget}
           onMapClick={handleMapClick}
        />
      </div>

      {/* SOS Overlay */}
      {sosMode && (
         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-600/90 animate-flash-red">
            <h1 className="text-9xl font-black text-white animate-bounce tracking-widest outline-text">SOS</h1>
            <p className="text-white text-xl font-bold mt-4 uppercase tracking-widest">{translations[language].alertSentContacts}</p>
            {manualSmsLink && (
                <a 
                  href={manualSmsLink} 
                  onClick={(e) => { e.stopPropagation(); }}
                  className="mt-8 bg-white text-red-600 px-8 py-5 rounded-full font-black text-2xl hover:scale-105 active:scale-95 transition shadow-2xl uppercase tracking-widest animate-pulse border-4 border-red-500 cursor-pointer pointer-events-auto z-50"
                >
                  {translations[language].tapToSms}
                </a>
            )}
            {alertRecipients.length > 0 && (
              <div className="mt-4 text-white/90 text-sm font-mono flex flex-col items-center w-full max-w-md px-4">
                 <div className="w-full space-y-2">
                     {[
                       { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).family1 : '', label: 'Family 1' },
                       { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).family2 : '', label: 'Family 2' },
                       { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).police : '', label: 'Police' }
                     ].filter(c => c.num).map((contact, idx) => {
                         const cleanNum = contact.num.replace(/\D/g, '');
                         const msg = `SOS: Fisher User in DANGER at ${position.lat.toFixed(4)},${position.lng.toFixed(4)}. Help!`;
                         return (
                           <div key={idx} className="bg-black/30 rounded-lg p-3 flex items-center justify-between pointer-events-auto">
                             <div className="text-left text-white">
                               <div className="text-xs font-bold opacity-80 uppercase">{contact.label}</div>
                               <div className="text-lg font-mono font-bold">{contact.num}</div>
                             </div>
                             <div className="flex gap-3">
                                <a href={`tel:${cleanNum}`} className="p-3 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-lg border-2 border-white" title="Call">
                                  <Phone size={20} />
                                </a>
                                <a href={`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="p-3 bg-[#25D366] text-white rounded-full hover:bg-[#20bd5a] shadow-lg border-2 border-white" title="WhatsApp">
                                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                </a>
                             </div>
                           </div>
                         );
                      })}
                 </div>
              </div>
            )}
         </div>
      )}

      {/* Danger Overlay */}
      {status === 'danger' && !sosMode && (
        <div className="absolute inset-0 z-10 animate-flash-red bg-red-600/30 pointer-events-none" />
      )}

      {/* Top Header */}
      {!sosMode && (
        <div className={clsx(
          "absolute top-0 w-full p-4 z-20 shadow-lg transition-colors duration-500 flex justify-between items-center rounded-b-3xl backdrop-blur-md",
          themeColors[status]
        )}>
          <div className="flex items-center gap-4">
             {statusIcon[status]}
             <div className="flex flex-col">
               <h1 className="text-xl font-bold uppercase leading-none">{translations[language][status]}</h1>
               <span className="text-xs opacity-80 font-medium mt-1 uppercase tracking-wider">{status === 'safe' ? translations[language].systemActive : translations[language].checkNav}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <button 
                onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full border border-white/40 backdrop-blur-sm transition-all flex items-center gap-2 font-bold shadow-lg active:scale-95"
              >
                <Languages size={16} />
                <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
              </button>

              <div className="h-8 w-px bg-white/20 mx-1" />

              <div className="flex gap-2">
                <button onClick={() => setManualMode(true)} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 shadow-lg border-2 border-white">
                  Set Position
                </button>
                {distance < 5000 && (
                  <button onClick={() => {
                      const rad = (safeDirection * Math.PI) / 180;
                      const delta = 0.02;
                      const safePoint = { lat: position.lat + delta * Math.cos(rad), lng: position.lng + delta * Math.sin(rad) };
                      setNavigationTarget(safePoint);
                      setIsFollowing(true);
                    }}
                    className="p-3 bg-teal-600 text-white rounded-full hover:bg-teal-500 shadow-lg border-2 border-white"
                  >
                    Navigate Safe
                  </button>
                )}
                <button onClick={() => setShowProfile(true)} className="p-3 bg-black/20 rounded-full hover:bg-black/30 transition shadow-inner">
                  <User size={20} className="text-white" />
                </button>
                <button onClick={() => setShowHistory(true)} className="p-3 bg-black/20 rounded-full hover:bg-black/30 transition shadow-inner">
                  <History size={20} className="text-white" />
                </button>
                <button onClick={() => setNightMode(!nightMode)} className="p-3 bg-black/20 rounded-full hover:bg-black/30 transition shadow-inner">
                  {nightMode ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-white" />}
                </button>
                <button onClick={() => setUser(null)} className="p-3 bg-black/20 rounded-full hover:bg-black/30 transition shadow-inner">
                  <LogOut size={20} className="text-white" />
                </button>
                <button 
                  onClick={() => {
                    setIsGpsMode(true);
                    setIsSimulating(false);
                    setIsFollowing(true); // Jump view to user
                    speak(language === 'en' ? "Auto-detecting location" : "இடம் தானாக கண்டறியப்படுகிறது");
                  }} 
                  className={clsx(
                    "px-4 py-2 rounded-full transition shadow-lg font-bold text-xs flex items-center gap-2", 
                    isGpsMode ? "bg-emerald-500 text-white" : "bg-white/20 text-white border border-white/40"
                  )}
                >
                  <MapPin size={14} />
                  {translations[language].autoDetect}
                </button>
                <button onClick={() => {
                  setIsSimulating(!isSimulating);
                  if (!isSimulating) setIsGpsMode(false);
                }} className={clsx("p-3 rounded-full transition shadow-inner font-bold text-xs", isSimulating ? "bg-green-500 text-white" : "bg-black/20 text-white")}>
                  SIM
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Navigation Target Widget */}
      {navigationTarget && !sosMode && (
        <div onClick={() => setNavigationTarget(null)} className="cursor-pointer absolute top-24 left-1/2 transform -translate-x-1/2 z-20 bg-orange-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce-slight border-2 border-white">
           <Target size={24} className="animate-pulse" />
           <div className="flex flex-col items-start leading-none">
             <span className="text-[10px] font-bold uppercase opacity-80">{translations[language].navigatingToNet}</span>
             <span className="text-xl font-black">{(distToTarget / 1000).toFixed(2)} km</span>
           </div>
           <span className="text-[10px] font-bold bg-black/20 px-1 rounded ml-1">X</span>
        </div>
      )}

      {/* Floating Action Buttons (Right Side) */}
      <div className="absolute right-4 top-28 z-20 flex flex-col gap-3 items-end">
         
         <div className="mb-2">
            <WeatherWidget isNight={nightMode} simulate={false} />
         </div>

         {!isFollowing && (
           <button onClick={() => setIsFollowing(true)} className="p-3 bg-white text-blue-600 rounded-full shadow-xl border border-blue-200 animate-bounce">
              <Crosshair size={28} />
           </button>
         )}
         
         {/* Drop Net Button */}
         <button onClick={() => initiateSaveSpot(null, 'net')} className="p-3 bg-orange-500 text-white rounded-full shadow-xl border-2 border-white active:scale-90 transition relative group">
            <Anchor size={28} />
             <span className="absolute right-full mr-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
               {translations[language].dropNet}
             </span>
         </button>

         {/* Mark Spot Button */}
         <button onClick={() => initiateSaveSpot(null, 'fish')} className="p-3 bg-white text-emerald-600 rounded-full shadow-xl border border-emerald-200 active:scale-90 transition">
            <MapPin size={28} />
         </button>

         {/* Offline Maps Button */}
         <button 
           onClick={() => setShowOfflineMaps(true)} 
           className="p-3 bg-blue-600 text-white rounded-full shadow-xl border-2 border-white active:scale-90 transition relative group"
         >
            <Download size={28} />
            <span className="absolute right-full mr-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                {translations[language].offlineMaps}
            </span>
         </button>
      </div>

      {/* Alert Center */}
      {status !== 'safe' && !sosMode && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 w-full px-4 text-center pointer-events-none">
          <div className={clsx(
            "p-6 rounded-3xl shadow-2xl backdrop-blur-xl border-4",
             status === 'danger' ? 'bg-red-600/95 border-red-400 text-white' : 'bg-amber-500/95 border-amber-300 text-black'
          )}>
             <h2 className="text-4xl font-black uppercase leading-tight mb-2">{translations[language][status]}</h2>
             <p className="text-2xl font-bold">{translations[language].turnBack}</p>
             
             {alertSent && (
                <div className="mt-4 bg-black/20 rounded-xl p-4 animate-pulse pointer-events-auto">
                   <p className="text-sm font-bold uppercase mb-2 text-white">{translations[language].alertSent}</p>
                   
                   <div className="flex flex-col gap-2 mb-2">
                      {[
                        { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).family1 : '', label: 'Family 1' },
                        { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).family2 : '', label: 'Family 2' },
                        { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).police : '', label: 'Police' }
                      ].filter(c => c.num).map((contact, idx) => {
                         const cleanNum = contact.num.replace(/\D/g, '');
                         const msg = `EMERGENCY: Fisher User is at border ${position.lat.toFixed(4)},${position.lng.toFixed(4)}. Help!`;
                         return (
                           <div key={idx} className="bg-white/20 rounded-lg p-2 flex items-center justify-between">
                             <div className="text-left">
                               <div className="text-[10px] font-bold opacity-80 uppercase text-white">{contact.label}</div>
                               <div className="text-xs font-mono font-bold text-white">{contact.num}</div>
                             </div>
                             <div className="flex gap-2">
                                <a href={`tel:${cleanNum}`} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-lg border border-white" title="Call">
                                  <Phone size={14} />
                                </a>
                                <a href={`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="p-2 bg-[#25D366] text-white rounded-full hover:bg-[#20bd5a] shadow-lg border border-white" title="WhatsApp">
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                </a>
                             </div>
                           </div>
                         );
                      })}
                   </div>

                   {manualSmsLink && (
                      <a href={manualSmsLink} className="mt-3 block bg-white text-red-600 px-4 py-2 rounded-lg font-black text-sm hover:bg-slate-100 transition shadow-lg uppercase tracking-wide">
                        {translations[language].tapToSms}
                      </a>
                   )}
                </div>
             )}

             {/* Speed Advice */}
             {speed > 5 && (
               <div className="mt-4 bg-white/20 rounded-full py-2 px-4 inline-flex items-center gap-2 animate-bounce">
                  <AlertTriangle className="text-white" />
                  <span className="font-black text-xl">{translations[language].reduceSpeed}</span>
               </div>
             )}
          </div>
          
          {/* Safe Direction Arrow */}
          <div className="mt-8 flex flex-col items-center animate-bounce-slight" style={{ opacity: 0.8 }}>
             <p className="text-white font-bold uppercase text-xl mb-2 drop-shadow-md">{translations[language].safeDirection}</p>
             <div 
               className="bg-green-500 rounded-full p-4 shadow-2xl border-4 border-white transition-transform duration-1000 ease-out"
               style={{ transform: `rotate(${safeDirection - heading}deg)` }}
             >
                <ArrowBigUp size={80} className="text-white" />
             </div>
          </div>
        </div>
      )}

      {/* Bottom Dashboard */}
      <div className="absolute bottom-0 w-full z-60 p-4 pb-6">
        <div className="flex justify-between items-center mb-4 px-2">
             <div className="flex gap-2">
               <button 
                 onClick={() => setMuted(!muted)}
                 className="bg-white/90 text-slate-800 p-2 rounded-full shadow-lg border border-slate-200"
               >
                 {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
               </button>
             </div>
            
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-mono">
               {gpsAccuracy ? (gpsAccuracy < 20 ? <SignalHigh size={14} className="text-emerald-400" /> : <SignalLow size={14} className="text-amber-400" />) : <Signal size={14} className="text-red-400 animate-pulse" />}
               <span className="uppercase">{advLoc.source}: {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'SEARCHING'}</span>
            </div>
        </div>

        <div className={clsx(
            "rounded-3xl p-5 shadow-2xl border backdrop-blur-md transition-colors duration-500 grid grid-cols-2 gap-4",
            nightMode ? "bg-slate-800/95 border-slate-700 text-white" : "bg-white/95 border-white/60 text-slate-800"
        )}>
          {/* Distance */}
          <div className="flex flex-col justify-center">
            <p className={clsx("text-xs font-bold uppercase tracking-widest mb-1", nightMode ? "text-slate-400" : "text-slate-500")}>
              {translations[language].distance}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter">{(distance / 1000).toFixed(2)}</span>
              <span className={clsx("text-lg font-medium", nightMode ? "text-slate-500" : "text-slate-400")}>km</span>
            </div>
          </div>

          {/* Speed & Compass */}
          <div className="flex items-center justify-end gap-3">
             <div className="text-right">
                <p className={clsx("text-xs font-bold uppercase tracking-widest mb-1", nightMode ? "text-slate-400" : "text-slate-500")}>
                  {translations[language].speed}
                </p>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-4xl font-black tracking-tighter">{speed.toFixed(1)}</span>
                  <span className={clsx("text-sm font-medium", nightMode ? "text-slate-500" : "text-slate-400")}>{translations[language].knots}</span>
                </div>
             </div>
             <button 
                onClick={toggleSOS} 
                className={clsx(
                  "h-24 w-24 rounded-full shadow-lg border-4 active:scale-95 transition-all duration-300 flex items-center justify-center font-black text-2xl tracking-tight uppercase", 
                  sosMode 
                    ? "bg-white text-red-600 border-red-600 animate-pulse" 
                    : "bg-red-600 text-white border-white hover:scale-110 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                )}
              >
                {sosMode ? (language === 'ta' ? 'நிறுத்து' : 'STOP') : "SOS"}
              </button>
             <Compass heading={heading} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
