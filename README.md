# 🌊 WaveGuard: Maritime Safety & Border Alert System

WaveGuard is an advanced, offline-capable maritime safety web application designed specifically for fishermen. It prevents international maritime boundary line (IMBL) crossings, tracks approaching storms and cyclones, provides SOS alerts to family members, and functions beautifully even when far out at sea without an internet connection.

## 🚀 Key Features

- **Offline GPS Tracking:** Uses advanced device location APIs to track the boat even when there's no cellular network.
- **IMBL Alerts:** Warns the user audibly and visually when they get too close to the international border (currently programmed for the India-Sri Lanka maritime border).
- **Storm & Cyclone Radar:** Fetches marine data securely to warn against incoming squalls, rough seas, and cyclones. Renders predicted cyclone tracks on the map.
- **Tamil & English Voice Assistant:** Fully hands-free operation designed for harsh marine environments. Voice prompts alert fishermen of borders and weather.
- **Automated SOS SMS:** If a distress situation happens, an alert is sent directly to family and local authorities via Fast2SMS and Twilio fallback networks. 
- **IoT Hardware Ready:** Supports integration with ESP32-based hardware for capsize detection, water leaks, and satellite communication for deep-sea fishing.

## 🛠️ Built With

- **Frontend:** React 19, Vite, Tailwind CSS, Leaflet (Maps)
- **Backend:** Node.js, Express (For SMS relay)
- **APIs:** Open-Meteo Marine API, Fast2SMS API, Twilio API

## 🚦 Getting Started

### Prerequisites

You will need **Node.js 18+** installed on your computer.

### Installation

1. Clone or download the repository.
2. Navigate into the project directory:
   ```bash
   cd WaveGuard
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up your `.env` file in the `api` folder:
   ```env
   FAST2SMS_API_KEY=your_key_here
   # Twilio setup is optional
   TWILIO_ACCOUNT_SID=your_sid_here
   TWILIO_AUTH_TOKEN=your_token_here
   TWILIO_FROM_NUMBER=your_number_here
   ```

### Running the App Locally

To start both the Vite frontend and Node backend simultaneously:

```bash
npm run dev
```

The app will be accessible at `http://localhost:5173`.

## 📱 Progressive Web App (PWA)

WaveGuard is built as a PWA. When running on a mobile device, fishermen can "Add to Home Screen" directly from Chrome or Safari. Map tiles are cached via IndexedDB, ensuring the application continues to provide map directions even 20 kilometers off the coast.

## 🌐 Cloud Deployment (Vercel)

WaveGuard is architected to run seamlessly on Vercel as a **Vite Frontend + Serverless Backend**:

1. Push your code to a GitHub repository.
2. Link the repository to your Vercel Dashboard.
3. **CRITICAL:** Add your `FAST2SMS_API_KEY` to Vercel's **Environment Variables** in the project settings.
4. Deploy! Your SOS automation will now work in the cloud without needing a separate backend server.

## 🤝 Hardware Integration

WaveGuard is designed to talk to an external microcontroller (like an ESP32) mounted securely in the boat string.

Type **"start hardware part"** in your setup assistant to get the complete wiring diagram, BOM (Bill of Materials), and Arduino code firmware for the hardware unit.
