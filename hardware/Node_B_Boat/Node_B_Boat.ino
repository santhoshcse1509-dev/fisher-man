/*
  =============================================================================
  WaveGuard / FishermanAlert - Node B (Boat B Peer Receiver & Alarm Unit)
  Hardware: ESP32 WROOM + HC-12 (433MHz UART) + Active Siren Buzzer
  =============================================================================
  Description:
    Installed on Boat B (Neighboring/Peer Rescue Boat). Listens for wireless
    HC-12 radio packets sent by Boat A ($ALERT or $SOS frames).
    When Boat A triggers an SOS (Physical button or Web App), Boat B sounds
    an emergency siren alarm and flashes the alert LED.

  ESP32 WROOM Pinout:
    - HC-12 Radio  : RX = GPIO 4 (ESP32 RX1), TX = GPIO 5 (ESP32 TX1)
    - Active Buzzer: GPIO 12 (Positive leg to GPIO 12, Negative leg to GND)
    - Mute Button  : GPIO 13 (Active LOW with internal PULLUP)
    - Warning LED  : GPIO 2  (Built-in ESP32 LED)
  =============================================================================
*/

#include <HardwareSerial.h>

// ── Pin Configurations ───────────────────────────────────────────────────────
#define HC12_RX_PIN    4
#define HC12_TX_PIN    5

#define BUZZER_PIN     12
#define MUTE_BTN_PIN   13
#define WARNING_LED    2

// ── Global Objects & Variables ───────────────────────────────────────────────
HardwareSerial HC12(1); // Serial1 for HC-12

bool isEmergencyActive = false;
bool isBuzzerMuted     = false;

String senderBoatId = "";
String senderLat    = "0.000000";
String senderLng    = "0.000000";
String alertReason  = "NONE";
unsigned long lastAlertTime = 0;
String rxBuffer = "";

void parsePacket(String packet);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=================================");
  Serial.println("       WAVEGUARD NODE B");
  Serial.println("=================================");

  // Pin Setup
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(WARNING_LED, OUTPUT);
  pinMode(MUTE_BTN_PIN, INPUT_PULLUP);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(WARNING_LED, LOW);

  // Initialize HC-12 Serial
  HC12.begin(9600, SERIAL_8N1, HC12_RX_PIN, HC12_TX_PIN);
  Serial.println("[HC-12] Listening on RX=4, TX=5 (9600 baud)...");
  Serial.println("[Node B] Ready to receive wireless emergency alerts from Boat A.");
}

void loop() {
  // 1. Read incoming wireless data stream from HC-12
  while (HC12.available() > 0) {
    char c = (char)HC12.read();
    rxBuffer += c;

    // Check for end of frame '#'
    if (c == '#') {
      Serial.print("[HC-12 RX Raw]: ");
      Serial.println(rxBuffer);
      parsePacket(rxBuffer);
      rxBuffer = ""; // Reset buffer
    }
  }

  // 2. Mute Button Handling
  if (digitalRead(MUTE_BTN_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(MUTE_BTN_PIN) == LOW) {
      isBuzzerMuted = true;
      Serial.println("[Node B] Alarm Muted by Fisherman on Boat B.");
    }
  }

  // 3. Auto-reset alert status after 30 seconds of inactivity
  if (isEmergencyActive && (millis() - lastAlertTime > 30000)) {
    isEmergencyActive = false;
    isBuzzerMuted = false;
    Serial.println("[Node B] Emergency cleared (Timeout). Returning to standby.");
  }

  // 4. Siren Alarm & Strobe LED Logic
  if (isEmergencyActive) {
    digitalWrite(WARNING_LED, (millis() / 200) % 2); // Blink warning LED
    if (!isBuzzerMuted) {
      digitalWrite(BUZZER_PIN, (millis() / 300) % 2); // Beeping Siren Tone
    } else {
      digitalWrite(BUZZER_PIN, LOW);
    }
  } else {
    digitalWrite(WARNING_LED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }

  delay(10);
}

void parsePacket(String packet) {
  // Handle $SOS,BOAT_A,10.152310,79.851230,# OR $ALERT,BOAT_A,10.152310,79.851230,1,WEB_APP_SOS#
  if (packet.startsWith("$SOS,") || packet.startsWith("$ALERT,")) {
    int startIdx = packet.indexOf(',');
    int endIdx   = packet.indexOf('#');

    if (startIdx != -1 && endIdx != -1) {
      String data = packet.substring(startIdx + 1, endIdx);

      int idx1 = data.indexOf(',');
      int idx2 = data.indexOf(',', idx1 + 1);
      int idx3 = data.indexOf(',', idx2 + 1);

      if (idx1 != -1 && idx2 != -1) {
        senderBoatId = data.substring(0, idx1);
        senderLat    = data.substring(idx1 + 1, idx2);

        if (idx3 != -1) {
          senderLng   = data.substring(idx2 + 1, idx3);
          alertReason = data.substring(idx3 + 1);
        } else {
          senderLng   = data.substring(idx2 + 1);
          alertReason = "PHYSICAL_SOS_BUTTON";
        }

        isEmergencyActive = true;
        isBuzzerMuted     = false;
        lastAlertTime     = millis();

        Serial.println("\n=============================================");
        Serial.println("  🚨 EMERGENCY DISTRESS ALERT RECEIVED 🚨  ");
        Serial.println("=============================================");
        Serial.println(" Distressed Boat : " + senderBoatId);
        Serial.println(" Reason          : " + alertReason);
        Serial.println(" Latitude        : " + senderLat);
        Serial.println(" Longitude       : " + senderLng);
        Serial.println("=============================================\n");
      }
    }
  }
}
