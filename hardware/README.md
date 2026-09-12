# 🚤 WaveGuard Dual-Boat Peer-to-Peer HC-12 Alert System

This hardware guide covers the setup using **ESP32 WROOM** microcontrollers, **HC-12 433MHz Wireless UART Modules**, **GPS (NEO-6M)**, and **Active Buzzers**.

---

## 🏗 System Architecture

```
  +---------------------------------+                 +---------------------------------+
  |        BOAT A (NODE A)          |                 |        BOAT B (NODE B)          |
  |      (Distressed Boat)          |                 |      (Neighbor Rescue Boat)     |
  |                                 |   433MHz Radio  |                                 |
  |  - ESP32 WROOM                  |  ==============>|  - ESP32 WROOM                  |
  |  - GPS (NEO-6M on Serial2)      |  (HC-12 Serial) |  - HC-12 Receiver (Serial1)     |
  |  - HC-12 Radio (Serial1)        |                 |  - Active Siren Buzzer (GPIO 12)|
  |  - SOS Push Button (GPIO 14)    |                 |  - Mute Button (GPIO 14)        |
  |  - Active Buzzer (GPIO 12)      |                 |  - Warning LED (GPIO 2)         |
  +---------------------------------+                 +---------------------------------+
```

---

## 📌 Wiring Connections Table

### 🔹 Node A (Boat A - Transmitter)
| Component | Component Pin | ESP32 WROOM Pin | Notes |
| :--- | :--- | :--- | :--- |
| **HC-12 Module** | VCC | **5V** (or VIN) | HC-12 requires 3.2V–5.5V |
| | GND | **GND** | |
| | RX | **GPIO 27** (TX1) | ESP32 TX1 connects to HC-12 RX |
| | TX | **GPIO 26** (RX1) | ESP32 RX1 connects to HC-12 TX |
| | SET | **Unconnected** | Leave open for transparent data mode |
| **GPS (NEO-6M)** | VCC | **3.3V / 5V** | |
| | GND | **GND** | |
| | TX | **GPIO 16** (RX2) | ESP32 RX2 connects to GPS TX |
| | RX | **GPIO 17** (TX2) | ESP32 TX2 connects to GPS RX |
| **SOS Push Button** | Pin 1 | **GPIO 14** | Connects to GND when pushed |
| | Pin 2 | **GND** | Uses internal `INPUT_PULLUP` |
| **Active Buzzer** | (+) Leg | **GPIO 12** | Local alarm on Boat A |
| | (-) Leg | **GND** | |
| **Built-in LED** | LED | **GPIO 2** | Built-in Blue LED |

---

### 🔹 Node B (Boat B - Peer Receiver)
| Component | Component Pin | ESP32 WROOM Pin | Notes |
| :--- | :--- | :--- | :--- |
| **HC-12 Module** | VCC | **5V** (or VIN) | |
| | GND | **GND** | |
| | RX | **GPIO 27** (TX1) | ESP32 TX1 connects to HC-12 RX |
| | TX | **GPIO 26** (RX1) | ESP32 RX1 connects to HC-12 TX |
| | SET | **Unconnected** | Normal transparent mode |
| **Active Siren Buzzer** | (+) Leg | **GPIO 12** | Alarm siren on Boat B |
| | (-) Leg | **GND** | |
| **Mute Button** | Pin 1 | **GPIO 14** | Silences siren sound |
| | Pin 2 | **GND** | Uses internal `INPUT_PULLUP` |
| **Warning LED** | (+) Anode | **GPIO 2** (Built-in) | Blinks on emergency |
| | (-) Cathode | **GND** | |

---

## ⚡ How It Works

1. **Boat A Monitoring:**
   * **Node A** reads live GPS position and checks the SOS button.
   * If the SOS button is pressed or Boat A crosses the IMBL boundary, Node A transmits the packet:
     `$ALERT,BOAT_A,10.152310,79.851230,12.4,1,SOS_BUTTON_PRESSED#` over HC-12 wireless radio.
2. **Boat B Alert:**
   * **Node B** receives the packet over its HC-12 module.
   * It immediately sounds the **Active Siren Buzzer** and blinks the LED alert.
   * The Serial Monitor on Boat B displays:
     ```
     =============================================
       🚨 EMERGENCY DISTRESS ALERT RECEIVED 🚨  
     =============================================
      Distressed Boat : BOAT_A
      Reason          : SOS_BUTTON_PRESSED
      Latitude        : 10.152310
      Longitude       : 79.851230
      Speed           : 12.4 km/h
     =============================================
     ```
3. **Silencing Alarm:**
   * Pressing the **Mute Button** (GPIO 14) on Node B silences the buzzer while keeping the warning LED active until Boat A is rescued.
