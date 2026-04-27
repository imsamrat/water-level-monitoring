/*
 * ESP8266 Water Level Sensor - Arduino Code
 * Using HC-SR04 Ultrasonic Sensor
 * 
 * Hardware Setup:
 * - ESP8266 (NodeMCU or Wemos D1 Mini)
 * - HC-SR04 Ultrasonic Sensor
 * 
 * Wiring (with voltage divider on ECHO):
 * - HC-SR04 VCC  → ESP8266 VIN (5V)
 * - HC-SR04 GND  → ESP8266 GND
 * - HC-SR04 TRIG → ESP8266 D1 (GPIO5)
 * - HC-SR04 ECHO → Voltage Divider → ESP8266 D2 (GPIO4)
 * 
 * Voltage Divider for ECHO pin (5V → 3.3V):
 *   ECHO ──[1kΩ]──┬──→ D2 (GPIO4)
 *                  │
 *                [2kΩ]
 *                  │
 *                 GND
 * 
 * Mounting:
 * - Mount sensor at the TOP of the tank, facing DOWN
 * - Sensor measures distance to water surface
 * - Water Level = TANK_HEIGHT - distance
 * 
 * Configuration:
 * - Update WiFi credentials
 * - Update server IP address
 * - Update TANK_HEIGHT_CM to match your tank
 * - API key must match backend .env
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// ===== CONFIGURATION =====
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/water-data";
const char* apiKey = "esp8266_water_sensor_key_2024";

// ===== SENSOR PINS =====
#define TRIG_PIN D1   // GPIO5
#define ECHO_PIN D2   // GPIO4

// ===== TANK CONFIGURATION =====
// Measure your tank height in cm and update this value
#define TANK_HEIGHT_CM 30       // Total tank height in cm (change this!)
#define SENSOR_OFFSET_CM 2      // Distance from sensor to max water level (cm)
#define MIN_DISTANCE_CM 2       // HC-SR04 minimum reliable distance
#define MAX_DISTANCE_CM 400     // HC-SR04 maximum range

// ===== TIMING =====
const unsigned long SEND_INTERVAL = 5000;  // Send data every 5 seconds
unsigned long lastSendTime = 0;

// ===== SMOOTHING =====
// Take multiple readings and average them for stability
#define NUM_READINGS 5
#define READING_DELAY_MS 50

// WiFi client
WiFiClient wifiClient;

void setup() {
  Serial.begin(115200);
  delay(100);

  // Configure sensor pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  Serial.println();
  Serial.println("╔═══════════════════════════════════════════╗");
  Serial.println("║   💧 Water Level Monitoring System        ║");
  Serial.println("║   ESP8266 + HC-SR04 Ultrasonic Sensor     ║");
  Serial.println("╚═══════════════════════════════════════════╝");
  Serial.println();
  Serial.print("Tank Height: ");
  Serial.print(TANK_HEIGHT_CM);
  Serial.println(" cm");
  Serial.println();

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi Connected!");
    Serial.print("📡 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.println();
  } else {
    Serial.println();
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;

    if (WiFi.status() == WL_CONNECTED) {
      sendWaterData();
    } else {
      Serial.println("⚠️ WiFi disconnected! Reconnecting...");
      WiFi.reconnect();
    }
  }
}

/**
 * Measure distance using HC-SR04 ultrasonic sensor
 * Returns distance in cm, or -1 if reading failed
 */
float measureDistance() {
  // Send ultrasonic pulse
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure echo time (timeout after 30ms = ~500cm)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  // If no echo received
  if (duration == 0) {
    return -1;
  }

  // Calculate distance: speed of sound = 343 m/s = 0.034 cm/µs
  // Distance = (time × speed) / 2  (round trip)
  float distance = (duration * 0.034) / 2.0;

  // Validate range
  if (distance < MIN_DISTANCE_CM || distance > MAX_DISTANCE_CM) {
    return -1;
  }

  return distance;
}

/**
 * Get smoothed distance reading (average of multiple samples)
 * Filters out failed readings for reliability
 */
float getSmoothedDistance() {
  float total = 0;
  int validReadings = 0;

  for (int i = 0; i < NUM_READINGS; i++) {
    float d = measureDistance();
    if (d > 0) {
      total += d;
      validReadings++;
    }
    delay(READING_DELAY_MS);
  }

  if (validReadings == 0) {
    return -1;  // All readings failed
  }

  return total / validReadings;
}

/**
 * Read sensor, calculate water level percentage, and send to backend
 */
void sendWaterData() {
  // Get averaged distance reading
  float distance = getSmoothedDistance();

  if (distance < 0) {
    Serial.println("❌ Sensor read failed — skipping this cycle");
    return;
  }

  // Calculate water level
  // Sensor is mounted at the top, looking down
  // When tank is FULL:  distance ≈ SENSOR_OFFSET_CM (small)
  // When tank is EMPTY: distance ≈ TANK_HEIGHT_CM + SENSOR_OFFSET_CM (large)
  float effectiveDistance = distance - SENSOR_OFFSET_CM;
  float waterLevelCm = TANK_HEIGHT_CM - effectiveDistance;

  // Clamp water level to valid range
  if (waterLevelCm < 0) waterLevelCm = 0;
  if (waterLevelCm > TANK_HEIGHT_CM) waterLevelCm = TANK_HEIGHT_CM;

  // Calculate percentage
  int percentage = (int)((waterLevelCm / TANK_HEIGHT_CM) * 100.0);
  percentage = constrain(percentage, 0, 100);

  // Raw level value (water height in mm for precision)
  int rawLevel = (int)(waterLevelCm * 10);

  // Print to Serial Monitor
  Serial.print("📏 Distance: ");
  Serial.print(distance, 1);
  Serial.print(" cm | 💧 Water: ");
  Serial.print(waterLevelCm, 1);
  Serial.print(" cm | ");
  Serial.print(percentage);
  Serial.print("% | ");

  // Create JSON payload
  String jsonPayload = "{\"level\":" + String(rawLevel) +
                        ",\"percentage\":" + String(percentage) +
                        ",\"deviceId\":\"tank_01\"}";

  // Send HTTP POST request
  HTTPClient http;
  http.begin(wifiClient, serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.print("✅ Status: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("❌ Error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
}
