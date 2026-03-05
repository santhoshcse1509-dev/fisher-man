/**
 * sosAlert.js — Automated SOS Alert Service
 * ------------------------------------------
 * Sends automated SMS via the backend API (Fast2SMS/Twilio).
 * Falls back to native sms: link if the API is unreachable.
 *
 * Usage:
 *   import { sendSosAlert } from './sosAlert';
 *   const result = await sendSosAlert({ profile, position, language });
 */

/**
 * Clean a phone number to digits only.
 * @param {string} num
 * @returns {string}
 */
const cleanNumber = (num) => num ? String(num).replace(/\D/g, '') : '';

/**
 * Build the native SMS fallback URL.
 * Works on both iOS and Android.
 * @param {string[]} numbers - array of cleaned phone numbers
 * @param {string} message
 * @returns {string} sms: protocol URL
 */
export function buildSmsUrl(numbers, message) {
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const separator = isiOS ? '&' : ',';
  const encodedBody = encodeURIComponent(message);
  const recipients = numbers.join(separator);
  return `sms:${recipients}${isiOS ? '&' : '?'}body=${encodedBody}`;
}

/**
 * Open a hidden link to trigger the native SMS app.
 * @param {string} url
 */
function openSmsLink(url) {
  const link = document.createElement('a');
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Send automated SOS SMS via backend API.
 *
 * @param {Object} opts
 * @param {Object} opts.profile        - Fisher profile from localStorage
 * @param {{ lat: number, lng: number }} opts.position - Current GPS position
 * @param {string} opts.language       - 'en' or 'ta'
 *
 * @returns {Promise<{
 *   success: boolean,
 *   sent: number,
 *   provider: string,
 *   smsUrl: string,          // native sms: fallback link
 *   displayNumbers: string[] // formatted numbers for display
 * }>}
 */
export async function sendSosAlert({ profile, position, language }) {
  // ── 1. Gather numbers from profile ───────────────────────────────────────
  const rawNumbers = [
    profile.mobile,
    profile.family1,
    profile.family2,
    profile.police,
  ]
    .map(cleanNumber)
    .filter(n => n.length >= 10);

  const displayNumbers = [
    profile.mobile  ? `${profile.mobile} (அவர்கள்/Self)` : null,
    profile.family1 ? `${profile.family1} (Family 1)` : null,
    profile.family2 ? `${profile.family2} (Family 2)` : null,
    profile.police  ? `${profile.police} (Police)` : null,
  ].filter(Boolean);

  // Build fallback SMS message & URL
  const fallbackMsg =
    language === 'ta'
      ? `அவசரநிலை! மீனவர் ${profile.username || 'மீனவர்'} கடல் எல்லையை கடக்கிறார். இடம்: ${position.lat.toFixed(4)},${position.lng.toFixed(4)}. https://maps.google.com/?q=${position.lat},${position.lng}`
      : `EMERGENCY! Fisherman ${profile.username || 'Fisher'} is crossing the sea border. Location: ${position.lat.toFixed(4)},${position.lng.toFixed(4)}. https://maps.google.com/?q=${position.lat},${position.lng}`;

  const smsUrl = rawNumbers.length > 0 ? buildSmsUrl(rawNumbers, fallbackMsg) : null;

  if (rawNumbers.length === 0) {
    return { success: false, sent: 0, provider: 'none', smsUrl: null, displayNumbers };
  }

  // ── 2. Try automated API first ───────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch('/api/send-sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        numbers: rawNumbers,
        fishermanName: profile.username || 'Fisher',
        lat: position.lat,
        lng: position.lng,
        language,
      }),
    });

    clearTimeout(timeout);
    const data = await response.json();

    console.log('[SOS] API Response:', data);

    if (data.success) {
      // Send browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 SOS Alert Sent!', {
          body: `Automated SMS sent to ${data.sent} contact(s) via ${data.provider}`,
          icon: '/vite.svg',
        });
      }

      return {
        success: true,
        sent: data.sent || rawNumbers.length,
        provider: data.provider,
        smsUrl,          // still provide fallback link
        displayNumbers,
      };
    }

    // API returned but with error (no key configured etc.)
    if (data.demoMode) {
      console.warn('[SOS] API in demo mode — falling back to native SMS');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[SOS] API timeout — falling back to native SMS');
    } else {
      console.warn('[SOS] API error:', err.message, '— falling back to native SMS');
    }
  }

  // ── 3. Native SMS fallback (opens SMS app) ───────────────────────────────
  if (smsUrl) {
    setTimeout(() => openSmsLink(smsUrl), 400);
  }

  // Browser notification for fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🚨 SOS Activated', {
      body: `Opening SMS app for ${rawNumbers.length} contact(s)`,
      icon: '/vite.svg',
    });
  }

  return {
    success: false,   // API didn't fire — native SMS fallback used
    sent: 0,
    provider: 'native-sms',
    smsUrl,
    displayNumbers,
  };
}
