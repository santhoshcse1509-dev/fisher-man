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
import { sendSosAlert } from './services/sosAlert';

import {
  AlertTriangle, ShieldCheck, Siren, Navigation, Volume2, VolumeX,
  Moon, Sun, Signal, SignalHigh, SignalLow, MapPin, Crosshair,
  LogOut, Anchor, Target, History, Save, X, User, ArrowBigUp,
  Phone, Map, Download, Languages, Menu, CheckCircle2, Loader2, MessageSquare
} from 'lucide-react';

import clsx from 'clsx';
import { Howl } from 'howler';

const sirenSound = new Howl({
  src: ['https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3'],
  loop: true,
  volume: 0.8,
});

function App() {
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
  const [isFollowing, setIsFollowing] = useState(true);
  const [savedSpots, setSavedSpots] = useState(() => {
    const saved = localStorage.getItem('fisher_saved_spots');
    return saved ? JSON.parse(saved) : [];
  });
  const [sosMode, setSosMode] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showOfflineMaps, setShowOfflineMaps] = useState(false);
  const [safeDirection, setSafeDirection] = useState(0);
  const [alertSent, setAlertSent] = useState(false);
  const [alertRecipients, setAlertRecipients] = useState([]);
  const [manualMode, setManualMode] = useState(false);
  const [isGpsMode, setIsGpsMode] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationInterval = useRef(null);
  const [pendingSpot, setPendingSpot] = useState(null);
  const [spotNameInput, setSpotNameInput] = useState('');
  const sosIntervalRef = useRef(null);
  const lastAnnouncedDistance = useRef(Infinity);
  const [manualSmsLink, setManualSmsLink] = useState(null);
  // SMS sending status: 'idle' | 'sending' | 'sent' | 'fallback'
  const [smsSendStatus, setSmsSendStatus] = useState('idle');
  const [smsSentCount, setSmsSentCount] = useState(0);

  // ── NEW: hamburger menu state ──────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);

  const translations = {
    en: {
      safe: 'You are Safe', warning: 'Warning: Border Near', danger: 'DANGER: TURN BACK',
      distance: 'Distance', speed: 'Speed', knots: 'knots', turnBack: 'Turn Back Immediately!',
      systemActive: 'System Active', checkNav: 'Check Navigation', dropNet: 'Drop Net',
      navigatingToNet: 'Navigating to Net', arrived: 'Arrived at Net', saveSpotTitle: 'Save Location',
      enterName: 'Enter Name (Optional)', save: 'Save', cancel: 'Cancel', reduceSpeed: 'REDUCE SPEED',
      safeDirection: 'Safe Direction', alertSent: 'Alert Sent to Family & Police',
      stopSOS: 'STOP SOS', tapToSms: 'Tap to Send SMS', emergencyTitle: 'EMERGENCY',
      alertSentContacts: 'Alert Sent to Emergency Contacts', removeSpot: 'Remove this spot?',
      locationRemoved: 'Location Removed', locationSaved: 'Location Saved',
      autoDetect: 'AUTO', offlineMaps: 'Offline Maps', navigating: 'Navigating to',
      statusSafe: 'You are Safe', confirmRemove: 'Remove this spot?',
      sysAlertTest: 'System Alert Test Initiated', testStarted: 'System check started',
      navMenu: 'Navigation Menu', setPos: 'Set Position', navSafe: 'Navigate Safe',
    },
    ta: {
      safe: 'பாதுகாப்பான பகுதி', warning: 'எச்சரிக்கை: எல்லை அருகில்',
      danger: 'ஆபத்து: உடனே திரும்பவும்', distance: 'எல்லை தூரம்', speed: 'வேகம்',
      knots: 'நாட்', turnBack: 'உடனே திரும்பவும்!', systemActive: 'கண்காணிப்பு துவங்கப்பட்டது',
      checkNav: 'திசையை சரிபார்க்கவும்', dropNet: 'வலை விரிக்க',
      navigatingToNet: 'வலை நோக்கி', arrived: 'வலை அருகில்',
      saveSpotTitle: 'இடத்தை சேமிக்கவும்', enterName: 'பெயர் (விருப்பம்)',
      save: 'சேமி', cancel: 'ரத்து', reduceSpeed: 'வேகத்தை குறைக்கவும்',
      safeDirection: 'பாதுகாப்பான திசை', alertSent: 'எச்சரிக்கை செய்தி அனுப்பப்பட்டது',
      stopSOS: 'அவசர உதவியை நிறுத்து', tapToSms: 'SMS அனுப்ப கிளிக் செய்யவும்',
      emergencyTitle: 'அவசரம்', alertSentContacts: 'உறவினர்களுக்கு தகவல் அனுப்பப்பட்டது',
      removeSpot: 'இந்த இடத்தை நீக்கவா?', locationRemoved: 'இடம் நீக்கப்பட்டது',
      locationSaved: 'இடம் சேமிக்கப்பட்டது', autoDetect: 'தானியங்கி',
      offlineMaps: 'ஆஃப்லைன் வரைபடம்', navigating: 'நோக்கி பயணம்',
      statusSafe: 'நீங்கள் பாதுகாப்பாக உள்ளீர்கள்', confirmRemove: 'இந்த இடத்தை நீக்கவா?',
      sysAlertTest: 'கணினி ஆய்வு துவங்கப்பட்டது', testStarted: 'ஆய்வு துவங்கப்பட்டது',
      navMenu: 'வழிசெலுத்தல் மெனு', setPos: 'இடத்தை அமை', navSafe: 'பாதுகாப்பாக செல்',
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

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('fisher_saved_spots', JSON.stringify(savedSpots));
  }, [savedSpots]);

  useEffect(() => {
    if (!user) return;
    const dist = getDistanceToBorder(position.lat, position.lng);
    setDistance(dist);
    setSafeDirection(getSafeDirection(position.lat, position.lng));
    const newStatus = getStatus(dist);
    if (newStatus !== status) {
      setStatus(newStatus);
      if (newStatus === 'danger') {
        speak(translations[language].danger);
        if (!muted) sirenSound.play();
        if ("vibrate" in navigator) navigator.vibrate([1000, 500, 1000, 500, 1000, 500, 1000]);
        if (!sosMode) setSosMode(true);
        if (!alertSent) setAlertSent(true);
      } else {
        sirenSound.stop();
        if (newStatus === 'warning') {
          speak(translations[language].warning);
          if ("vibrate" in navigator) navigator.vibrate([400, 200, 400]);
        }
        if (newStatus === 'safe') {
          setAlertSent(false);
          setSosMode(false);
          if ("vibrate" in navigator) navigator.vibrate(0);
          speak(translations[language].statusSafe);
        }
      }
      lastAnnouncedDistance.current = dist;
    } else if (newStatus !== 'safe') {
      const distanceDiff = lastAnnouncedDistance.current - dist;
      const threshold = newStatus === 'danger' ? 500 : 1000;
      if (distanceDiff >= threshold) {
        const kmDist = (dist / 1000).toFixed(1);
        const text = language === 'ta'
          ? `எல்லை தூரம் ${kmDist} கிலோமீட்டர்`
          : `Distance to border is ${kmDist} kilometers`;
        speak(text);
        lastAnnouncedDistance.current = dist;
      } else if (dist > lastAnnouncedDistance.current) {
        lastAnnouncedDistance.current = dist;
      }
    } else {
      lastAnnouncedDistance.current = Infinity;
    }
    return () => {
      sirenSound.stop();
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
     
  }, [position, language, user, status]);

  const advLoc = useAdvancedLocation({ enableHighAccuracy: true, timeout: 15000, seaOptimized: true });

  useEffect(() => {
    if (isGpsMode && !isSimulating && user && advLoc.lat !== null && advLoc.lng !== null) {
      setPosition({ lat: advLoc.lat, lng: advLoc.lng });
      setHeading(advLoc.heading || 0);
      setSpeed(advLoc.speed * 1.94384);
      setGpsAccuracy(advLoc.accuracy);
    }
  }, [advLoc, isGpsMode, isSimulating, user]);

  const handleMapClick = (latlng) => {
    if (manualMode) {
      setPosition({ lat: latlng.lat, lng: latlng.lng });
      setIsGpsMode(false);
      setIsSimulating(false);
      setManualMode(false);
    } else {
      initiateSaveSpot(latlng, 'fish');
    }
  };

  const initiateSaveSpot = (latlng, type = 'fish') => {
    const spot = latlng ? { lat: latlng.lat, lng: latlng.lng } : position;
    setPendingSpot({ ...spot, type });
    setSpotNameInput('');
  };

  const confirmSaveSpot = (e) => {
    e.preventDefault();
    if (!pendingSpot) return;
    const timestamp = Date.now();
    let finalName = spotNameInput.trim();
    if (!finalName) {
      const dateStr = new Date(timestamp).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-GB', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      finalName = pendingSpot.type === 'net'
        ? `${translations[language].dropNet} - ${dateStr}`
        : `${translations[language].saveSpotTitle} - ${dateStr}`;
    }
    setSavedSpots(prev => [...prev, { ...pendingSpot, name: finalName, timestamp }]);
    speak(translations[language].locationSaved);
    setPendingSpot(null);
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

  /**
   * Automated SOS alert — calls backend API (Fast2SMS/Twilio).
   * Falls back to native sms: link if API is unreachable.
   */
  const sendEmergencyAlertAutomated = async () => {
    const saved = localStorage.getItem('fisher_profile');
    if (!saved) return;

    const profile = JSON.parse(saved);
    setSmsSendStatus('sending');

    try {
      const result = await sendSosAlert({ profile, position, language });

      // Update recipients list for the overlay
      setAlertRecipients(result.displayNumbers || []);
      setManualSmsLink(result.smsUrl);

      if (result.success) {
        // Automated SMS sent via API
        setSmsSendStatus('sent');
        setSmsSentCount(result.sent || 0);
      } else {
        // Fallback to native SMS app
        setSmsSendStatus('fallback');
      }
    } catch (err) {
      console.error('[SOS] sendEmergencyAlertAutomated error:', err);
      setSmsSendStatus('fallback');
    }
  };

  useEffect(() => {
    if (isSimulating) {
      setIsGpsMode(false);
      simulationInterval.current = setInterval(() => {
        setPosition(prev => {
          setSpeed(12 + Math.random() * 2);
          setHeading(45);
          return { lat: prev.lat + 0.002, lng: prev.lng + 0.002 };
        });
      }, 1000);
    } else {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    }
    return () => clearInterval(simulationInterval.current);
  }, [isSimulating]);

  useEffect(() => {
    if (sosMode) {
      // 1. Reset SMS status on each new SOS activation
      setSmsSendStatus('idle');
      setSmsSentCount(0);

      // 2. Fire automated SMS immediately
      sendEmergencyAlertAutomated();

      // 3. Start bilingual vocal alert loop
      let toggle = false;
      const playAlert = () => {
        if (toggle) speak("ஆபத்து.. உதவி தேவை..", 'ta-IN');
        else speak("SOS.. Help Needed..", 'en-US');
        if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
        toggle = !toggle;
      };
      playAlert();
      sosIntervalRef.current = setInterval(playAlert, 4000);
    } else {
      // Reset on SOS stop
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
      window.speechSynthesis.cancel();
      if ("vibrate" in navigator) navigator.vibrate(0);
      sirenSound.stop();
      setSmsSendStatus('idle');
    }
    return () => { if (sosIntervalRef.current) clearInterval(sosIntervalRef.current); };
     
  }, [sosMode]);

  const toggleSOS = () => setSosMode(!sosMode);

  const handleVoiceCommand = (cmd) => {
    switch (cmd) {
      case 'sos': if (!sosMode) toggleSOS(); break;
      case 'stop': if (sosMode) toggleSOS(); break;
      case 'saveSpot': initiateSaveSpot(null, 'fish'); break;
      case 'dropNet': initiateSaveSpot(null, 'net'); break;
      default: break;
    }
  };

  const triggerTestAlert = () => {
    speak(translations[language].sysAlertTest);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    setTimeout(() => {
      if (!muted) { sirenSound.play(); setTimeout(() => sirenSound.stop(), 2000); }
    }, 2000);
  };

  if (!user) return <Auth onLogin={(id) => setUser({ id })} />;

  const themeColors = {
    safe: nightMode ? 'bg-emerald-900/90 text-emerald-100' : 'bg-emerald-500 text-white',
    warning: nightMode ? 'bg-amber-900/90 text-amber-100' : 'bg-amber-500 text-black',
    danger: nightMode ? 'bg-red-900/90 text-red-100 animate-pulse' : 'bg-red-600 text-white animate-pulse-fast'
  };

  const statusIcon = {
    safe: <ShieldCheck size={28} />,
    warning: <AlertTriangle size={28} />,
    danger: <Siren size={28} />
  };

  const distToTarget = navigationTarget
    ? calculateDistance(position.lat, position.lng, navigationTarget.lat, navigationTarget.lng)
    : 0;

  return (
    <div className={clsx(
      "relative w-full h-full flex flex-col font-sans overflow-hidden transition-colors duration-500",
      nightMode ? "bg-slate-900" : "bg-ocean-50",
      sosMode && "animate-pulse bg-red-900"
    )}>

      {/* ── PANELS ───────────────────────────────────────────────────────── */}
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

      {/* ── SAVE SPOT MODAL ───────────────────────────────────────────────── */}
      {pendingSpot && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={confirmSaveSpot}
            className="w-full sm:max-w-sm bg-slate-800 sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 shadow-2xl border border-white/20 animate-scale-in"
          >
            {/* Drag handle on mobile */}
            <div className="sm:hidden flex justify-center mb-3">
              <div className="w-10 h-1 bg-slate-600 rounded-full" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              {translations[language].saveSpotTitle}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-4 font-mono">
              {pendingSpot.lat.toFixed(4)}, {pendingSpot.lng.toFixed(4)}
            </p>
            <div className="relative mb-5">
              <input
                autoFocus
                type="text"
                id="spot-name-input"
                value={spotNameInput}
                onChange={(e) => setSpotNameInput(e.target.value)}
                className="w-full bg-black/40 text-white border border-slate-600 rounded-xl p-3.5 text-base focus:outline-none focus:border-blue-500 transition placeholder-slate-500"
                placeholder={translations[language].enterName}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                id="spot-cancel-btn"
                onClick={() => setPendingSpot(null)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 active:bg-slate-500 transition touch-target"
              >
                {translations[language].cancel}
              </button>
              <button
                type="submit"
                id="spot-save-btn"
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-500/20 transition flex justify-center items-center gap-2 touch-target"
              >
                <Save size={17} />
                {translations[language].save}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MAP LAYER ─────────────────────────────────────────────────────── */}
      <div className={clsx(
        "absolute inset-0 z-0 transition-opacity duration-500",
        nightMode ? "opacity-40 grayscale" : "opacity-100"
      )}>
        <MapVisualizer
          position={position}
          status={status}
          isFollowing={isFollowing}
          setIsFollowing={setIsFollowing}
          savedSpots={savedSpots}
          onSaveSpot={(coords) => initiateSaveSpot(coords, 'fish')}
          onRemoveSpot={removeSavedSpot}
          navigationTarget={navigationTarget}
          onMapClick={handleMapClick}
        />
      </div>

      {/* ── SOS OVERLAY ───────────────────────────────────────────────────── */}
      {sosMode && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-600/90 animate-flash-red px-4 pointer-events-auto">
          <h1 className="text-7xl sm:text-9xl font-black text-white animate-bounce tracking-widest outline-text">
            SOS
          </h1>
          <p className="text-white text-base sm:text-lg font-bold mt-4 uppercase tracking-widest text-center">
            {translations[language].emergencyTitle}
          </p>

          {/* SMS Sending Status UI */}
          <div className="mt-8 mb-4 min-h-[80px] flex flex-col items-center justify-center">
            {smsSendStatus === 'sending' && (
              <div className="flex flex-col items-center text-white/90">
                <Loader2 size={40} className="animate-spin mb-3 text-white" />
                <p className="font-bold text-sm tracking-widest uppercase">
                  Sending Automated SMS...
                </p>
              </div>
            )}

            {smsSendStatus === 'sent' && (
              <div className="flex flex-col items-center text-white bg-green-500/20 px-6 py-4 rounded-3xl border border-green-400 backdrop-blur-md">
                <CheckCircle2 size={40} className="text-green-400 mb-2 animate-bounce-slight" />
                <p className="font-black text-lg tracking-wide uppercase">
                  Alert Sent! ({smsSentCount})
                </p>
                <p className="text-xs font-mono font-bold mt-1 opacity-80 uppercase tracking-widest">
                  {translations[language].alertSentContacts}
                </p>
              </div>
            )}

            {smsSendStatus === 'fallback' && manualSmsLink && (
              <div className="flex flex-col items-center">
                <p className="text-white/80 text-sm font-bold uppercase tracking-widest mb-3 text-center">
                  API offline. Tap below to send SMS:
                </p>
                <a
                  href={manualSmsLink}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white text-red-600 px-6 sm:px-8 py-4 rounded-full font-black text-lg hover:scale-105 active:scale-95 transition shadow-2xl uppercase tracking-widest animate-pulse border-4 border-red-500 flex items-center gap-3 touch-target"
                >
                  <MessageSquare size={24} />
                  {translations[language].tapToSms}
                </a>
              </div>
            )}
          </div>

          {/* Contact List for Quick Calls / WhatsApp */}
          {alertRecipients.length > 0 && (
            <div className="mt-2 text-white/90 text-sm font-mono w-full max-w-sm px-4">
              <div className="space-y-2">
                {[
                  { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).family1 : '', label: 'Family 1' },
                  { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).family2 : '', label: 'Family 2' },
                  { num: localStorage.getItem('fisher_profile') ? JSON.parse(localStorage.getItem('fisher_profile')).police : '', label: 'Police' }
                ].filter(c => c.num).map((contact, idx) => {
                  const cleanNum = contact.num.replace(/\D/g, '');
                  const msg = `SOS: Fisher User in DANGER at ${position.lat.toFixed(4)},${position.lng.toFixed(4)}. Help!`;
                  return (
                    <div key={idx} className="bg-black/30 rounded-lg p-2.5 flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-[10px] font-bold opacity-80 uppercase">{contact.label}</div>
                        <div className="text-sm font-mono font-bold">{contact.num}</div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`tel:${cleanNum}`} className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-lg border-2 border-white touch-target" title="Call">
                          <Phone size={16} />
                        </a>
                        <a href={`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="p-2.5 bg-[#25D366] text-white rounded-full hover:bg-[#20bd5a] shadow-lg border-2 border-white touch-target" title="WhatsApp">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stop SOS button */}
          <button
            id="sos-stop-btn"
            onClick={toggleSOS}
            className="mt-6 px-8 py-3 bg-white/20 hover:bg-white/30 border-2 border-white text-white font-black rounded-full text-sm uppercase tracking-widest touch-target"
          >
            {translations[language].stopSOS}
          </button>
        </div>
      )}

      {/* ── DANGER FLASH OVERLAY ──────────────────────────────────────────── */}
      {status === 'danger' && !sosMode && (
        <div className="absolute inset-0 z-10 animate-flash-red bg-red-600/30 pointer-events-none" />
      )}

      {/* ── TOP HEADER ────────────────────────────────────────────────────── */}
      {!sosMode && (
        <div className={clsx(
          "absolute top-0 w-full z-20 shadow-lg transition-colors duration-500 rounded-b-2xl sm:rounded-b-3xl backdrop-blur-md",
          themeColors[status]
        )}>
          {/* ── Main bar ── */}
          <div className="flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3">

            {/* Status info */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex-shrink-0">{statusIcon[status]}</div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-sm sm:text-xl font-black uppercase leading-none truncate">
                  {translations[language][status]}
                </h1>
                <span className="text-[10px] sm:text-xs opacity-80 font-medium mt-0.5 uppercase tracking-wider truncate">
                  {status === 'safe' ? translations[language].systemActive : translations[language].checkNav}
                </span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

              {/* Language toggle — always visible */}
              <button
                id="lang-toggle-btn"
                onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white/20 hover:bg-white/30 text-white rounded-full border border-white/40 backdrop-blur-sm transition-all flex items-center gap-1 sm:gap-2 font-bold shadow-lg active:scale-95 text-xs sm:text-sm touch-target"
              >
                <Languages size={14} />
                <span className="hidden xs:inline">{language === 'en' ? 'தமிழ்' : 'English'}</span>
              </button>

              {/* Desktop-only inline buttons */}
              <div className="hidden md:flex items-center gap-2">
                <div className="h-6 w-px bg-white/20" />
                <button id="set-pos-btn-desktop" onClick={() => setManualMode(true)} className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 shadow-lg border border-white text-xs font-bold touch-target">
                  {translations[language].setPos}
                </button>
                {distance < 5000 && (
                  <button
                    id="nav-safe-btn-desktop"
                    onClick={() => {
                      const rad = (safeDirection * Math.PI) / 180;
                      const delta = 0.02;
                      setNavigationTarget({ lat: position.lat + delta * Math.cos(rad), lng: position.lng + delta * Math.sin(rad) });
                      setIsFollowing(true);
                    }}
                    className="px-2.5 py-1.5 bg-teal-600 text-white rounded-full hover:bg-teal-500 shadow-lg border border-white text-xs font-bold touch-target"
                  >
                    {translations[language].navSafe}
                  </button>
                )}
                <button id="profile-btn-desktop" onClick={() => setShowProfile(true)} className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition touch-target"><User size={18} className="text-white" /></button>
                <button id="history-btn-desktop" onClick={() => setShowHistory(true)} className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition touch-target"><History size={18} className="text-white" /></button>
                <button id="night-btn-desktop" onClick={() => setNightMode(!nightMode)} className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition touch-target">
                  {nightMode ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} className="text-white" />}
                </button>
                <button id="logout-btn-desktop" onClick={() => setUser(null)} className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition touch-target"><LogOut size={18} className="text-white" /></button>
                <button
                  id="gps-btn-desktop"
                  onClick={() => { setIsGpsMode(true); setIsSimulating(false); setIsFollowing(true); }}
                  className={clsx("px-3 py-1.5 rounded-full transition shadow-lg font-bold text-xs flex items-center gap-1 touch-target",
                    isGpsMode ? "bg-emerald-500 text-white" : "bg-white/20 text-white border border-white/40"
                  )}
                >
                  <MapPin size={12} />
                  {translations[language].autoDetect}
                </button>
                <button
                  id="sim-btn-desktop"
                  onClick={() => { setIsSimulating(!isSimulating); if (!isSimulating) setIsGpsMode(false); }}
                  className={clsx("p-2 rounded-full transition text-xs font-bold touch-target", isSimulating ? "bg-green-500 text-white" : "bg-black/20 text-white")}
                >
                  SIM
                </button>
              </div>

              {/* Hamburger — mobile & tablet only */}
              <button
                id="hamburger-btn"
                onClick={() => setMenuOpen(o => !o)}
                className="md:hidden p-2.5 bg-white/20 hover:bg-white/30 rounded-full border border-white/40 touch-target"
                aria-label={translations[language].navMenu}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
              </button>
            </div>
          </div>

          {/* ── Mobile dropdown menu ── */}
          <div
            id="mobile-nav-menu"
            className={clsx(
              "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
              menuOpen ? "max-h-72 pb-3" : "max-h-0"
            )}
          >
            <div className="px-3 pb-1 grid grid-cols-2 gap-2">
              <button id="set-pos-btn-mobile" onClick={() => { setManualMode(true); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600/80 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition touch-target">
                <MapPin size={14} /> {translations[language].setPos}
              </button>
              {distance < 5000 && (
                <button
                  id="nav-safe-btn-mobile"
                  onClick={() => {
                    const rad = (safeDirection * Math.PI) / 180;
                    const delta = 0.02;
                    setNavigationTarget({ lat: position.lat + delta * Math.cos(rad), lng: position.lng + delta * Math.sin(rad) });
                    setIsFollowing(true);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 bg-teal-600/80 text-white rounded-xl text-xs font-bold hover:bg-teal-600 transition touch-target"
                >
                  <Navigation size={14} /> {translations[language].navSafe}
                </button>
              )}
              <button id="profile-btn-mobile" onClick={() => { setShowProfile(true); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/30 transition touch-target">
                <User size={14} /> Profile
              </button>
              <button id="history-btn-mobile" onClick={() => { setShowHistory(true); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/30 transition touch-target">
                <History size={14} /> History
              </button>
              <button id="night-btn-mobile" onClick={() => setNightMode(!nightMode)}
                className="flex items-center gap-2 px-3 py-2.5 bg-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/30 transition touch-target">
                {nightMode ? <Sun size={14} className="text-yellow-300" /> : <Moon size={14} />}
                {nightMode ? 'Day Mode' : 'Night Mode'}
              </button>
              <button id="logout-btn-mobile" onClick={() => setUser(null)}
                className="flex items-center gap-2 px-3 py-2.5 bg-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/30 transition touch-target">
                <LogOut size={14} /> Logout
              </button>
              <button
                id="gps-btn-mobile"
                onClick={() => { setIsGpsMode(true); setIsSimulating(false); setIsFollowing(true); setMenuOpen(false); }}
                className={clsx("flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition touch-target",
                  isGpsMode ? "bg-emerald-500 text-white" : "bg-white/20 text-white")}
              >
                <MapPin size={14} /> {translations[language].autoDetect}
              </button>
              <button
                id="sim-btn-mobile"
                onClick={() => { setIsSimulating(!isSimulating); if (!isSimulating) setIsGpsMode(false); }}
                className={clsx("flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition touch-target",
                  isSimulating ? "bg-green-500 text-white" : "bg-white/20 text-white")}
              >
                <Target size={14} /> SIM {isSimulating ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVIGATION TARGET BADGE ───────────────────────────────────────── */}
      {navigationTarget && !sosMode && (
        <div
          onClick={() => setNavigationTarget(null)}
          className="cursor-pointer absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-20 bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3 animate-bounce-slight border-2 border-white"
        >
          <Target size={18} className="animate-pulse flex-shrink-0" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase opacity-80">
              {translations[language].navigatingToNet}
            </span>
            <span className="text-base sm:text-xl font-black">
              {(distToTarget / 1000).toFixed(2)} km
            </span>
          </div>
          <span className="text-[10px] font-bold bg-black/20 px-1 rounded ml-1">X</span>
        </div>
      )}

      {/* ── FLOATING ACTION BUTTONS (Right) ───────────────────────────────── */}
      <div className="absolute right-3 sm:right-4 top-20 sm:top-28 z-20 flex flex-col gap-2 sm:gap-3 items-end">
        <div className="mb-1 relative">
          <WeatherWidget isNight={nightMode} simulate={false} />
        </div>

        {!isFollowing && (
          <button
            id="recenter-btn"
            onClick={() => setIsFollowing(true)}
            className="p-2.5 sm:p-3 bg-white text-blue-600 rounded-full shadow-xl border border-blue-200 animate-bounce touch-target"
            aria-label="Re-center map"
          >
            <Crosshair size={22} />
          </button>
        )}

        <button
          id="drop-net-btn"
          onClick={() => initiateSaveSpot(null, 'net')}
          className="p-2.5 sm:p-3 bg-orange-500 text-white rounded-full shadow-xl border-2 border-white active:scale-90 transition relative group touch-target"
          aria-label={translations[language].dropNet}
        >
          <Anchor size={22} />
          <span className="absolute right-full mr-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none hidden sm:block">
            {translations[language].dropNet}
          </span>
        </button>

        <button
          id="mark-spot-btn"
          onClick={() => initiateSaveSpot(null, 'fish')}
          className="p-2.5 sm:p-3 bg-white text-emerald-600 rounded-full shadow-xl border border-emerald-200 active:scale-90 transition touch-target"
          aria-label="Mark fishing spot"
        >
          <MapPin size={22} />
        </button>

        <button
          id="offline-maps-btn"
          onClick={() => setShowOfflineMaps(true)}
          className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-full shadow-xl border-2 border-white active:scale-90 transition relative group touch-target"
          aria-label={translations[language].offlineMaps}
        >
          <Download size={22} />
          <span className="absolute right-full mr-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none hidden sm:block">
            {translations[language].offlineMaps}
          </span>
        </button>
      </div>

      {/* ── DANGER / WARNING ALERT CENTER ────────────────────────────────── */}
      {status !== 'safe' && !sosMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-full px-3 sm:px-4 text-center pointer-events-none">
          <div className={clsx(
            "p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl border-4",
            status === 'danger'
              ? 'bg-red-600/95 border-red-400 text-white'
              : 'bg-amber-500/95 border-amber-300 text-black'
          )}>
            <h2 className="text-2xl sm:text-4xl font-black uppercase leading-tight mb-2">
              {translations[language][status]}
            </h2>
            <p className="text-lg sm:text-2xl font-bold">{translations[language].turnBack}</p>

            {alertSent && (
              <div className="mt-3 sm:mt-4 bg-black/20 rounded-xl p-3 sm:p-4 animate-pulse pointer-events-auto">
                <p className="text-xs sm:text-sm font-bold uppercase mb-2 text-white">
                  {translations[language].alertSent}
                </p>
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
                          <a href={`tel:${cleanNum}`} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-lg border border-white touch-target"><Phone size={12} /></a>
                          <a href={`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="p-2 bg-[#25D366] text-white rounded-full shadow-lg border border-white touch-target">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {manualSmsLink && (
                  <a href={manualSmsLink} className="mt-2 block bg-white text-red-600 px-4 py-2 rounded-lg font-black text-xs hover:bg-slate-100 transition shadow-lg uppercase tracking-wide">
                    {translations[language].tapToSms}
                  </a>
                )}
              </div>
            )}

            {speed > 5 && (
              <div className="mt-3 sm:mt-4 bg-white/20 rounded-full py-2 px-4 inline-flex items-center gap-2 animate-bounce">
                <AlertTriangle className="text-white" size={16} />
                <span className="font-black text-sm sm:text-xl">{translations[language].reduceSpeed}</span>
              </div>
            )}
          </div>

          {/* Safe Direction Arrow */}
          <div className="mt-6 sm:mt-8 flex flex-col items-center animate-bounce-slight" style={{ opacity: 0.8 }}>
            <p className="text-white font-bold uppercase text-base sm:text-xl mb-2 drop-shadow-md">
              {translations[language].safeDirection}
            </p>
            <div
              className="bg-green-500 rounded-full p-3 sm:p-4 shadow-2xl border-4 border-white transition-transform duration-1000 ease-out"
              style={{ transform: `rotate(${safeDirection - heading}deg)` }}
            >
              <ArrowBigUp size={56} className="text-white sm:hidden" />
              <ArrowBigUp size={80} className="text-white hidden sm:block" />
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM DASHBOARD ──────────────────────────────────────────────── */}
      <div className="absolute bottom-0 w-full z-20 p-3 sm:p-4 pb-4 sm:pb-6">

        {/* Status bar (GPS + mute) */}
        <div className="flex justify-between items-center mb-2 sm:mb-4 px-1">
          <button
            id="mute-btn"
            onClick={() => setMuted(!muted)}
            className="bg-white/90 text-slate-800 p-2 rounded-full shadow-lg border border-slate-200 touch-target"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-mono">
            {gpsAccuracy
              ? (gpsAccuracy < 20
                ? <SignalHigh size={13} className="text-emerald-400" />
                : <SignalLow size={13} className="text-amber-400" />)
              : <Signal size={13} className="text-red-400 animate-pulse" />
            }
            <span className="uppercase">{advLoc.source}: {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'SEARCHING'}</span>
          </div>
        </div>

        {/* Dashboard card */}
        <div className={clsx(
          "rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl border backdrop-blur-md transition-colors duration-500",
          "grid grid-cols-2 gap-3 sm:gap-4",
          nightMode
            ? "bg-slate-800/95 border-slate-700 text-white"
            : "bg-white/95 border-white/60 text-slate-800"
        )}>

          {/* Distance column */}
          <div className="flex flex-col justify-center">
            <p className={clsx(
              "text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1",
              nightMode ? "text-slate-400" : "text-slate-500"
            )}>
              {translations[language].distance}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-5xl font-black tracking-tighter">
                {(distance / 1000).toFixed(2)}
              </span>
              <span className={clsx("text-sm sm:text-lg font-medium", nightMode ? "text-slate-500" : "text-slate-400")}>
                km
              </span>
            </div>
          </div>

          {/* Speed + SOS + Compass */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <div className="text-right">
              <p className={clsx(
                "text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1",
                nightMode ? "text-slate-400" : "text-slate-500"
              )}>
                {translations[language].speed}
              </p>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-2xl sm:text-4xl font-black tracking-tighter">{speed.toFixed(1)}</span>
                <span className={clsx("text-xs sm:text-sm font-medium", nightMode ? "text-slate-500" : "text-slate-400")}>
                  {translations[language].knots}
                </span>
              </div>
            </div>

            {/* SOS button — responsive sizing */}
            <button
              id="sos-toggle-btn"
              onClick={toggleSOS}
              className={clsx(
                "h-16 w-16 sm:h-24 sm:w-24 rounded-full shadow-lg border-4 active:scale-95 transition-all duration-300 flex items-center justify-center font-black text-sm sm:text-2xl tracking-tight uppercase flex-shrink-0",
                sosMode
                  ? "bg-white text-red-600 border-red-600 animate-pulse"
                  : "bg-red-600 text-white border-white hover:scale-110 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              )}
              aria-label={sosMode ? 'Stop SOS' : 'Activate SOS'}
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
