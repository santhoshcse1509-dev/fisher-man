/**
 * Tamil & English Voice Assistant for WaveGuard
 * Listens for voice commands and provides audio feedback
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MessageSquare, Info } from 'lucide-react';
import clsx from 'clsx';

export default function TamilVoiceAssistant({ 
  language = 'ta', 
  onCommand,
  distanceToBorder,
  status,
  muted = false
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Use refs so callbacks always have latest values — no stale closure issues
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const feedbackTimeoutRef = useRef(null);
  const distanceRef = useRef(distanceToBorder);
  const statusRef = useRef(status);
  const onCommandRef = useRef(onCommand);
  const mutedRef = useRef(muted);

  // Keep refs in sync with props
  useEffect(() => { distanceRef.current = distanceToBorder; }, [distanceToBorder]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const translations = {
    en: {
      title: 'Voice Assistant',
      listening: 'Listening...',
      notSupported: 'Speech recognition not supported in this browser',
      tapToSpeak: 'Tap to speak',
      guide: 'Commands: "Help", "Save Spot", "Distance", "Drop Net", "Stop"',
      ready: 'Ready for commands',
      confirmSOS: 'SOS Activated',
      confirmSave: 'Saving current location',
      confirmDistance: (d) => `Distance to border is ${d.toFixed(2)} kilometers`,
      confirmStatus: (s) => `Current status is ${s}`,
      unknown: "Sorry, I didn't catch that command.",
      stopped: "Stopped",
      droppingNet: "Dropping Net",
      hello: "Listening",
      permissionDenied: 'Mic access denied. Please allow in browser settings.'
    },
    ta: {
      title: 'குரல் உதவி',
      listening: 'கவனித்துக் கொண்டிருக்கிறேன்...',
      notSupported: 'இந்த உலாவியில் குரல் அங்கீகாரம் ஆதரிக்கப்படவில்லை',
      tapToSpeak: 'பேச கிளிக் செய்யவும்',
      guide: 'கட்டளைகள்: "உதவி", "இடம் சேமி", "தூரம்", "வலை", "நிறுத்து"',
      ready: 'கட்டளைகளுக்கு தயார்',
      confirmSOS: 'அவசர உதவி துவங்கப்பட்டது',
      confirmSave: 'தற்போதைய இடம் சேமிக்கப்படுகிறது',
      confirmDistance: (d) => `எல்லை தூரம் ${d.toFixed(2)} கிலோமீட்டர்`,
      confirmStatus: (s) => s === 'safe' ? 'நீங்கள் பாதுகாப்பாக உள்ளீர்கள்' : 'எச்சரிக்கை! எல்லை அருகில் உள்ளது',
      unknown: "மன்னிக்கவும், அந்த கட்டளை எனக்கு புரியவில்லை.",
      stopped: "நிறுத்தப்பட்டது",
      droppingNet: "வலை விரிக்கப்படுகிறது",
      hello: "சொல்லுங்கள்",
      permissionDenied: 'மைக் அணுகல் மறுக்கப்பட்டது. உலாவி அமைப்புகளில் அனுமதிக்கவும்.'
    }
  };

  const t = translations[language] || translations.ta;

  const speak = useCallback((text) => {
    if (mutedRef.current) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ta' ? 'ta-IN' : 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [language]);

  const showFeedback = useCallback((text) => {
    setFeedback(text);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(''), 5000);
  }, []);

  // handleCommand reads from refs — never causes a stale closure
  const handleCommand = useCallback((cmd) => {
    const commands = {
      sos: ['உதவி', 'ஆபத்து', 'help', 'emergency', 'sos'],
      saveSpot: ['சேமி', 'இடம்', 'save', 'spot', 'location', 'இடத்தை சேமி'],
      distance: ['தூரம்', 'எவ்வளவு', 'distance', 'how far'],
      status: ['நிலைமை', 'எப்படி', 'status', 'how am i'],
      stop: ['நிறுத்து', 'போதும்', 'stop', 'quiet', 'off'],
      net: ['வலை', 'மீன் வலை', 'net', 'drop net']
    };

    let feedbackText = '';
    let handled = false;

    if (commands.sos.some(v => cmd.includes(v))) {
      onCommandRef.current?.('sos');
      feedbackText = translations[language].confirmSOS;
      handled = true;
    } else if (commands.saveSpot.some(v => cmd.includes(v))) {
      onCommandRef.current?.('saveSpot');
      feedbackText = translations[language].confirmSave;
      handled = true;
    } else if (commands.distance.some(v => cmd.includes(v))) {
      feedbackText = translations[language].confirmDistance((distanceRef.current || 0) / 1000);
      handled = true;
    } else if (commands.status.some(v => cmd.includes(v))) {
      feedbackText = translations[language].confirmStatus(statusRef.current);
      handled = true;
    } else if (commands.stop.some(v => cmd.includes(v))) {
      onCommandRef.current?.('stop');
      feedbackText = translations[language].stopped;
      handled = true;
    } else if (commands.net.some(v => cmd.includes(v))) {
      onCommandRef.current?.('dropNet');
      feedbackText = translations[language].droppingNet;
      handled = true;
    }

    if (handled) {
      speak(feedbackText);
      showFeedback(feedbackText);
    } else {
      showFeedback(translations[language].unknown);
    }
  }, [language, speak, showFeedback]); // NOTE: no distanceToBorder/status/onCommand — uses refs

  // ── ONE-TIME setup of SpeechRecognition (only re-create when language changes) ──
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;      // ✅ Use one-shot mode to avoid restart loops
    recognition.interimResults = true;
    recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setTranscript('');
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const resultTranscript = event.results[current][0].transcript.toLowerCase().trim();
      setTranscript(resultTranscript);

      if (event.results[current].isFinal) {
        handleCommand(resultTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('[Mic] Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionDenied(true);
        showFeedback(translations[language].permissionDenied);
      }
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      // ✅ Re-start ONLY if user explicitly left it listening (continuous UX)
      // Read from ref — NOT from stale closure
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (err) {
          // If already started (race condition), ignore
          if (err.name !== 'InvalidStateError') {
            console.warn('[Mic] Could not restart recognition:', err.message);
            setIsListening(false);
            isListeningRef.current = false;
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      // Cleanup on language change or unmount
      try {
        recognition.abort();
      } catch (_) { /* ignore */ }
      isListeningRef.current = false;
      setIsListening(false);
    };
  }, [language, handleCommand, showFeedback]); // ✅ Only re-create when language changes

  const toggleListening = async () => {
    if (!isSupported || permissionDenied) return;

    if (isListening) {
      // Stop listening
      isListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch (_) { /* ignore */ }
      setIsListening(false);
      setTranscript('');
    } else {
      // ── Request mic permission first ──
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // ✅ CRITICAL: Stop the manual hardware tracks so the SpeechRecognition engine can actually use the mic!
        stream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.error('[Mic] Permission denied:', err);
        setPermissionDenied(true);
        showFeedback(t.permissionDenied);
        return;
      }

      try {
        isListeningRef.current = true;
        recognitionRef.current?.start();
        // ❌ Do NOT speak 'hello' here. If the speaker talks, the microphone hears its own voice and instantly fails.
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          // Already running — just update state
          setIsListening(true);
        } else {
          console.error('[Mic] Could not start recognition:', err);
          isListeningRef.current = false;
          setIsListening(false);
        }
      }
    }
  };

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-44 left-6 z-40 flex flex-col items-start gap-3 pointer-events-none">
      {/* Transcript / Feedback Bubble */}
      {(transcript || feedback) && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 p-4 rounded-2xl rounded-bl-none shadow-2xl animate-in slide-in-from-left-4 max-w-[250px] pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.title}</span>
          </div>
          <p className="text-white font-medium text-sm leading-tight">
            {feedback || transcript}
          </p>
        </div>
      )}

      {/* Permission Denied Warning */}
      {permissionDenied && (
        <div className="bg-red-900/80 backdrop-blur-md border border-red-400/30 px-3 py-2 rounded-xl max-w-[220px] pointer-events-auto">
          <p className="text-red-200 text-xs font-medium">{t.permissionDenied}</p>
        </div>
      )}

      {/* Mic Button */}
      <div className="flex flex-col items-center gap-1 pointer-events-auto group">
        <button
          onClick={toggleListening}
          disabled={permissionDenied}
          aria-label={isListening ? 'Stop listening' : 'Start voice command'}
          className={clsx(
            "w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border-4 relative overflow-hidden",
            permissionDenied
              ? "bg-gray-600 border-gray-400 cursor-not-allowed opacity-60"
              : isListening
              ? "bg-red-500 border-white animate-pulse scale-110 shadow-[0_0_30px_rgba(239,68,68,0.6)]"
              : "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 border-white/40 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          )}
        >
          {/* Ambient Glow Ring */}
          {!isListening && !permissionDenied && (
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          )}

          {isListening ? (
            <div className="relative z-10">
              <Mic size={40} className="text-white" />
              <div className="absolute -inset-4 bg-white/40 rounded-full animate-ping" />
            </div>
          ) : (
            <Mic size={40} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
          )}
        </button>

        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] px-2 py-0.5 bg-blue-900/40 rounded-full backdrop-blur-sm border border-blue-400/20">
          {isListening ? t.listening : permissionDenied ? '🚫 Mic Off' : t.tapToSpeak}
        </span>
      </div>

      {/* Command Guide (shown while listening) */}
      {isListening && (
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-left-2 shadow-2xl">
          <Info size={16} className="text-blue-400" />
          <span className="text-xs text-white/90 font-medium">{t.guide}</span>
        </div>
      )}
    </div>
  );
}
