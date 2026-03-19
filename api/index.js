/* eslint-env node */
/**
 * WaveGuard — SOS SMS Backend Server
 * ----------------------------------------
 * Provides a REST API for automated SMS alerts via Fast2SMS.
 * Runs on port 3001, proxied through Vite on /api/*
 *
 * SMS Provider: Fast2SMS (https://www.fast2sms.com)
 *   - Free credits available for Indian numbers
 *   - No DLT approval needed for Quick SMS route
 *
 * Fallback: Twilio (uncomment Twilio section if needed)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST'],
}));

// ── Health check ────────────────────────────────────────────────────────────
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    smsProvider: process.env.FAST2SMS_API_KEY ? 'fast2sms' : 'not configured',
    timestamp: new Date().toISOString(),
  });
});

// ── SOS SMS Endpoint ────────────────────────────────────────────────────────
/**
 * POST /api/send-sos
 * Body: {
 *   numbers: string[]    — array of mobile numbers (e.g. ["9876543210"])
 *   fishermanName: string
 *   lat: number
 *   lng: number
 *   language: 'en' | 'ta'
 * }
 */
app.post(['/api/send-sos', '/send-sos'], async (req, res) => {
  const { numbers, fishermanName, lat, lng, language } = req.body;

  // Validate required fields
  if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
    return res.status(400).json({ success: false, error: 'No phone numbers provided' });
  }
  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'Location coordinates required' });
  }

  // Clean phone numbers (digits only)
  const cleanNumbers = numbers
    .map(n => String(n).replace(/\D/g, ''))
    .filter(n => n.length >= 10);

  if (cleanNumbers.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid phone numbers after cleaning' });
  }

  // Build message
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const message =
    language === 'ta'
      ? `அவசரநிலை! மீனவர் ${fishermanName || 'மீனவர்'} கடல் எல்லையை கடக்கிறார். இடம்: ${lat.toFixed(4)},${lng.toFixed(4)}. Google Maps: ${mapsLink}  உடனே உதவுங்கள்!`
      : `EMERGENCY! Fisherman ${fishermanName || 'Fisher'} is crossing the sea border at ${lat.toFixed(4)},${lng.toFixed(4)}. Location: ${mapsLink}  Please send help immediately!`;

  console.log(`[SOS] Sending to ${cleanNumbers.length} number(s):`, cleanNumbers);
  console.log(`[SOS] Message: ${message}`);

  // ── Fast2SMS ───────────────────────────────────────────────────────────────
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'q',                          // Quick SMS (transactional-like, no template needed)
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanNumbers.join(','),
        },
        {
          headers: {
            authorization: process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log('[Fast2SMS] Response:', response.data);

      if (response.data.return === true) {
        return res.json({
          success: true,
          provider: 'fast2sms',
          sent: cleanNumbers.length,
          requestId: response.data.request_id,
          message: `SMS sent to ${cleanNumbers.length} contact(s)`,
        });
      } else {
        throw new Error(response.data.message || 'Fast2SMS returned false');
      }
    } catch (err) {
      console.error('[Fast2SMS] Error:', err.response?.data || err.message);
      // Fall through to try Twilio if configured
    }
  }

  // ── Twilio Fallback ────────────────────────────────────────────────────────
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    try {
      const twilioClient = axios.create({
        baseURL: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}`,
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
        timeout: 10000,
      });

      const results = await Promise.allSettled(
        cleanNumbers.map(num =>
          twilioClient.post(
            '/Messages.json',
            new URLSearchParams({
              To: `+91${num}`,
              From: process.env.TWILIO_FROM_NUMBER,
              Body: message,
            })
          )
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[Twilio] ${successCount}/${cleanNumbers.length} messages sent`);

      return res.json({
        success: successCount > 0,
        provider: 'twilio',
        sent: successCount,
        total: cleanNumbers.length,
        message: `SMS sent to ${successCount} of ${cleanNumbers.length} contact(s)`,
      });
    } catch (err) {
      console.error('[Twilio] Error:', err.response?.data || err.message);
    }
  }

  // ── No provider configured ─────────────────────────────────────────────────
  if (!process.env.FAST2SMS_API_KEY && !process.env.TWILIO_ACCOUNT_SID) {
    console.warn('[SOS] No SMS provider configured. Add FAST2SMS_API_KEY to server/.env');
    // Return a "demo" success so the frontend still shows the SOS UI correctly
    return res.json({
      success: false,
      provider: 'none',
      error: 'No SMS API key configured. Add FAST2SMS_API_KEY to server/.env',
      demoMode: true,
    });
  }

  return res.status(500).json({ success: false, error: 'All SMS providers failed' });
});

// ── Storm Alert SMS Endpoint ────────────────────────────────────────────────
/**
 * POST /api/send-storm-alert
 * Body: {
 *   numbers: string[]       — array of mobile numbers
 *   fishermanName: string
 *   lat: number
 *   lng: number
 *   windSpeed: number       — km/h
 *   waveHeight: number      — metres
 *   stormLevel: string      — 'rough'|'storm'|'cyclone'
 *   language: 'en' | 'ta'
 * }
 */
app.post(['/api/send-storm-alert', '/send-storm-alert'], async (req, res) => {
  const { numbers, fishermanName, lat, lng, windSpeed, waveHeight, stormLevel, language } = req.body;

  if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
    return res.status(400).json({ success: false, error: 'No phone numbers provided' });
  }

  const cleanNumbers = numbers
    .map(n => String(n).replace(/\D/g, ''))
    .filter(n => n.length >= 10);

  if (cleanNumbers.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid phone numbers' });
  }

  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const levelLabel = stormLevel === 'cyclone' ? '🌀 CYCLONE ALERT' :
                     stormLevel === 'storm'   ? '⛈️ STORM WARNING' : '🌊 ROUGH SEA WARNING';

  const message = language === 'ta'
    ? `${levelLabel}: மீனவர் ${fishermanName || 'மீனவர்'} கடலில் உள்ளார். காற்று: ${windSpeed} km/h, அலை: ${waveHeight}m. இடம்: ${mapsLink}. உடனே தொடர்பு கொள்ளவும்!`
    : `${levelLabel}: Fisherman ${fishermanName || 'Fisher'} is at sea. Wind: ${windSpeed} km/h, Waves: ${waveHeight}m. Location: ${mapsLink}. Please contact immediately!`;

  console.log(`[Storm] ${stormLevel} alert to ${cleanNumbers.length} number(s)`);

  // Try Fast2SMS first
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        { route: 'q', message, language: 'english', flash: 0, numbers: cleanNumbers.join(',') },
        { headers: { authorization: process.env.FAST2SMS_API_KEY, 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      if (response.data.return === true) {
        return res.json({ success: true, provider: 'fast2sms', sent: cleanNumbers.length });
      }
    } catch (err) {
      console.error('[Storm/Fast2SMS] Error:', err.response?.data || err.message);
    }
  }

  // Try Twilio fallback
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    try {
      const twilioClient = axios.create({
        baseURL: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}`,
        auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN },
        timeout: 10000,
      });
      const results = await Promise.allSettled(
        cleanNumbers.map(num =>
          twilioClient.post('/Messages.json', new URLSearchParams({
            To: `+91${num}`, From: process.env.TWILIO_FROM_NUMBER, Body: message,
          }))
        )
      );
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      return res.json({ success: successCount > 0, provider: 'twilio', sent: successCount });
    } catch (err) {
      console.error('[Storm/Twilio] Error:', err.response?.data || err.message);
    }
  }

  // No provider configured — return demo mode
  return res.json({ success: false, provider: 'none', demoMode: true });
});

// ── Start server (Local) or Export (Vercel) ─────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚨 WaveGuard SOS Server running on http://localhost:${PORT}`);
    console.log(`   Fast2SMS: ${process.env.FAST2SMS_API_KEY ? '✅ Configured' : '⚠️  Not configured (add to server/.env)'}`);
    console.log(`   Twilio:   ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '⚠️  Not configured (optional fallback)'}\n`);
  });
}

// Export for Vercel Serverless Functions
export default app;
