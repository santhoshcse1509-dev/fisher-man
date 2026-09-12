#include <WiFi.h>
#include <HTTPClient.h>

// =====================================================
// WAVEGUARD NODE A - BOAT UNIT
// ESP32 + WiFi + Dummy GPS + HC-12 + Buzzer + SOS
// =====================================================

// ================= WIFI =================
const char* WIFI_SSID = "Your_Phone_Hotspot_Name";
const char* WIFI_PASSWORD = "Your_Hotspot_Password";

// Laptop running WaveGuard backend
const char* SERVER_IP = "10.184.229.212";
const int SERVER_PORT = 3001;

// ================= API =================
String HARDWARE_UPDATE_URL =
  "http://" + String(SERVER_IP) +
  ":" + String(SERVER_PORT) +
  "/api/hardware-update";

String HARDWARE_STATUS_URL =
  "http://" + String(SERVER_IP) +
  ":" + String(SERVER_PORT) +
  "/api/hardware-status";

// ================= PINS =================
// HC-12
#define HC12_RX 4
#define HC12_TX 5

// Buzzer
#define BUZZER_PIN 12

// SOS button
#define SOS_BUTTON_PIN 13

// ================= HC-12 =================
HardwareSerial HC12(1);

// ================= BOAT =================
const char* BOAT_ID = "BOAT_A";

// =====================================================
// DUMMY GPS ROUTE
// =====================================================
struct Location {
  double lat;
  double lng;
  double speed;
};

// Demo coordinates
Location route[] = {
  {10.160000, 79.860000, 8.0},
  {10.157000, 79.857000, 9.2},
  {10.154500, 79.854500, 10.5},
  {10.152310, 79.851230, 12.4},
  {10.151500, 79.850500, 11.8},
  {10.150800, 79.850100, 10.2},
  {10.150300, 79.850000, 8.5}
};

int routeIndex = 0;
const int ROUTE_SIZE = sizeof(route) / sizeof(route[0]);

// =====================================================
// TIMERS
// =====================================================
unsigned long lastUpdate = 0;
unsigned long lastStatusCheck = 0;

const unsigned long UPDATE_INTERVAL = 3000;
const unsigned long STATUS_INTERVAL = 2000;

// =====================================================
// SOS
// =====================================================
bool lastSOSState = HIGH;

// =====================================================
// DECLARATIONS
// =====================================================
void connectWiFi();
void checkPhysicalSOS();
void sendHardwareUpdate();
void checkHardwareStatus();
void sendSOS(double lat, double lng);
void activateBuzzer();

// =====================================================
// SETUP
// =====================================================
void setup() {
  Serial.begin(115200);

  // HC-12
  HC12.begin(9600, SERIAL_8N1, HC12_RX, HC12_TX);

  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // SOS
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);

  Serial.println();
  Serial.println("=================================");
  Serial.println("       WAVEGUARD NODE A");
  Serial.println("=================================");

  // Connect WiFi
  connectWiFi();
}

// =====================================================
// LOOP
// =====================================================
void loop() {
  // Keep WiFi alive
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Physical SOS
  checkPhysicalSOS();

  // Send GPS position
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = millis();
    sendHardwareUpdate();
  }

  // Check Web App SOS
  if (millis() - lastStatusCheck >= STATUS_INTERVAL) {
    lastStatusCheck = millis();
    checkHardwareStatus();
  }
}

// =====================================================
// WIFI
// =====================================================
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi CONNECTED!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection FAILED");
  }
}

// =====================================================
// SEND BOAT LOCATION TO WEB APP
// =====================================================
void sendHardwareUpdate() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  double lat = route[routeIndex].lat;
  double lng = route[routeIndex].lng;
  double speed = route[routeIndex].speed;

  HTTPClient http;
  http.begin(HARDWARE_UPDATE_URL);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"node\":\"";
  json += BOAT_ID;
  json += "\",";
  json += "\"lat\":";
  json += String(lat, 6);
  json += ",";
  json += "\"lng\":";
  json += String(lng, 6);
  json += ",";
  json += "\"speed\":";
  json += String(speed, 1);
  json += ",";
  json += "\"sos\":false";
  json += "}";

  Serial.println();
  Serial.println("[WEB APP TX]");
  Serial.println(json);

  int responseCode = http.POST(json);

  Serial.print("HTTP Response: ");
  Serial.println(responseCode);

  if (responseCode > 0) {
    String response = http.getString();
    Serial.print("Server Response: ");
    Serial.println(response);
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(responseCode));
  }

  http.end();

  // Move demo location
  routeIndex++;
  if (routeIndex >= ROUTE_SIZE) {
    routeIndex = 0;
    Serial.println("Demo route restarted.");
  }
}

// =====================================================
// CHECK WEB APP SOS
// =====================================================
void checkHardwareStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(HARDWARE_STATUS_URL);

  int responseCode = http.GET();

  if (responseCode > 0) {
    String response = http.getString();

    Serial.print("[SERVER STATUS] ");
    Serial.println(response);

    // Simple JSON check
    if (response.indexOf("\"sos\":true") >= 0) {
      Serial.println();
      Serial.println("🚨 WEB APP SOS RECEIVED!");

      activateBuzzer();

      // Send through HC-12
      String message = "$ALERT,";
      message += BOAT_ID;
      message += ",";
      message += String(route[routeIndex].lat, 6);
      message += ",";
      message += String(route[routeIndex].lng, 6);
      message += ",1,WEB_APP_SOS#";

      HC12.println(message);

      Serial.print("[HC-12 TX] ");
      Serial.println(message);
    }
  } else {
    Serial.print("Status HTTP Error: ");
    Serial.println(responseCode);
  }

  http.end();
}

// =====================================================
// PHYSICAL SOS
// =====================================================
void checkPhysicalSOS() {
  bool currentState = digitalRead(SOS_BUTTON_PIN);

  // LOW = button pressed
  if (currentState == LOW && lastSOSState == HIGH) {
    Serial.println();
    Serial.println("🚨 PHYSICAL SOS PRESSED!");

    activateBuzzer();

    // Current dummy location
    double lat = route[routeIndex].lat;
    double lng = route[routeIndex].lng;

    // Send to backend
    sendSOS(lat, lng);

    // Send through HC-12
    String message = "$SOS,";
    message += BOAT_ID;
    message += ",";
    message += String(lat, 6);
    message += ",";
    message += String(lng, 6);
    message += "#";

    HC12.println(message);

    Serial.print("[HC-12 SOS] ");
    Serial.println(message);

    delay(500);
  }

  lastSOSState = currentState;
}

// =====================================================
// SEND SOS TO WEB APP
// =====================================================
void sendSOS(double lat, double lng) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi unavailable - SOS not sent to server");
    return;
  }

  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/hardware-update";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"node\":\"";
  json += BOAT_ID;
  json += "\",";
  json += "\"lat\":";
  json += String(lat, 6);
  json += ",";
  json += "\"lng\":";
  json += String(lng, 6);
  json += ",";
  json += "\"speed\":0,";
  json += "\"sos\":true";
  json += "}";

  Serial.print("[SOS → WEB APP] ");
  Serial.println(json);

  int code = http.POST(json);

  Serial.print("SOS HTTP Response: ");
  Serial.println(code);

  if (code > 0) {
    Serial.println(http.getString());
  }

  http.end();
}

// =====================================================
// BUZZER
// =====================================================
void activateBuzzer() {
  for (int i = 0; i < 5; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
}
