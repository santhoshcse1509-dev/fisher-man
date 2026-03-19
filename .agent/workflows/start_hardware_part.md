---
description: Hardware integration guide — triggered when user says "start hardware part"
---

# 🔑 Trigger Key: "start hardware part"

When the user says **"start hardware part"**, it means they have purchased all
the hardware components listed in the Hardware Guide and are ready to begin
the firmware/integration coding phase.

## What to do immediately when triggered:

1. **Greet and confirm** — Acknowledge that hardware phase is starting.

2. **Ask for a quick checklist confirmation** — Ask the user to confirm which
   components they have available from this list:
   - [ ] ESP32-WROOM-32 (microcontroller)
   - [ ] NEO-6M GPS module
   - [ ] SIM800L GSM module (or alternative)
   - [ ] LoRa Ra-02 SX1278 (optional)
   - [ ] MPU-6050 IMU (capsize sensor)
   - [ ] FC-37 water leak sensor
   - [ ] MQ-2 gas sensor
   - [ ] Red panic button (IP67)
   - [ ] SSD1306 OLED display
   - [ ] Active buzzer
   - [ ] LiPo battery + TP4056 charger + MT3608 boost
   - [ ] Solar panel (optional)
   - [ ] IP67 enclosure

3. **Write the ESP32 Arduino Firmware** covering:
   - GPS reading via TinyGPS++ library (Serial2)
   - GSM SMS sending via SIM800L (AT commands)
   - MPU-6050 capsize detection logic (tilt > 45° for 3s)
   - FC-37 water level alert (analog threshold)
   - MQ-2 gas sensor alert
   - Panic button (3-second hold → SOS)
   - OLED display showing GPS, border distance, status
   - Deep sleep between readings to save battery
   - WiFi sync to FishermanAlert web app when in harbour
   - Border crossing detection (compare GPS to stored BORDER_POINTS)

4. **Write server-side hardware endpoint** in `server/index.js`:
   - `POST /api/hardware-update` — receives GPS + sensor data from device
   - Updates position on frontend map in real time

5. **Update FishermanAlert web app** to receive hardware data:
   - Poll `/api/hardware-update` endpoint
   - Show hardware device status (connected/offline) in UI
   - Override browser GPS with hardware GPS when device is connected

6. **Provide wiring diagram** (ASCII art) specific to components the user confirms.

7. **Provide upload instructions** — how to flash firmware using Arduino IDE.

## Reference files:
- Hardware BOM: brain/69584235-8a65-46eb-b5a9-926b2021ede5/hardware_guide.md
- SOS backend: server/index.js (POST /api/send-sos)
- Border coordinates: src/utils/geo.js (BORDER_POINTS)
- App entry: src/App.jsx
