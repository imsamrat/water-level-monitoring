#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h> // You need to install this library via Library Manager!

// ===== CONFIGURATION =====
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/water-data";
const char* apiKey = "esp8266_water_sensor_key_2024";

// ===== SENSOR PINS =====
#define TRIG_PIN D1   // GPIO5
#define ECHO_PIN D2   // GPIO4

// ===== OUTPUT PINS =====
#define MOTOR_PIN D5  // Relay for Motor
#define LED_PIN D6    // External LED Light (or use LED_BUILTIN)

// ===== TANK CONFIGURATION =====
#define TANK_HEIGHT_CM 30       
#define SENSOR_OFFSET_CM 2      
#define MIN_DISTANCE_CM 2       
#define MAX_DISTANCE_CM 400     

// ===== TIMING =====
const unsigned long SEND_INTERVAL = 5000;  
unsigned long lastSendTime = 0;

// ===== SMOOTHING =====
#define NUM_READINGS 5
#define READING_DELAY_MS 50

// WiFi client
WiFiClient wifiClient;

// ===== BLINKING CONFIG =====
bool currentMotorOn = false;
unsigned long lastBlinkTime = 0;
const int blinkInterval = 500; // 500ms blink rate

void setup() {
  Serial.begin(115200);
  delay(100);

  // Configure sensor pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // Configure output pins
  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW); 
  digitalWrite(LED_PIN, LOW);   

  Serial.println("\n💧 Water Level System - Motor Indicator Mode");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
}

void loop() {
  unsigned long currentTime = millis();

  // Handle LED Blinking if motor is ON
  if (currentMotorOn) {
    if (currentTime - lastBlinkTime >= blinkInterval) {
      lastBlinkTime = currentTime;
      digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Toggle LED
    }
  } else {
    digitalWrite(LED_PIN, LOW); // Ensure LED is OFF if motor is OFF
  }

  // Send data at intervals
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    if (WiFi.status() == WL_CONNECTED) {
      sendWaterData();
    }
  }
}

float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  float distance = (duration * 0.034) / 2.0;
  if (distance < MIN_DISTANCE_CM || distance > MAX_DISTANCE_CM) return -1;
  return distance;
}

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
  return (validReadings == 0) ? -1 : (total / validReadings);
}

void sendWaterData() {
  float distance = getSmoothedDistance();
  if (distance < 0) return;

  float effectiveDistance = distance - SENSOR_OFFSET_CM;
  float waterLevelCm = TANK_HEIGHT_CM - effectiveDistance;
  if (waterLevelCm < 0) waterLevelCm = 0;
  if (waterLevelCm > TANK_HEIGHT_CM) waterLevelCm = TANK_HEIGHT_CM;

  int percentage = (int)((waterLevelCm / TANK_HEIGHT_CM) * 100.0);
  percentage = constrain(percentage, 0, 100);
  int rawLevel = (int)(waterLevelCm * 10);

  String jsonPayload = "{\"level\":" + String(rawLevel) + ",\"percentage\":" + String(percentage) + ",\"deviceId\":\"tank_01\"}";

  HTTPClient http;
  http.begin(wifiClient, serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode == 200) {
    String responseBody = http.getString();
    StaticJsonDocument<256> doc;
    deserializeJson(doc, responseBody);

    const char* motorStatus = doc["motorStatus"];
    
    // Update local motor state for blinking
    if (String(motorStatus) == "ON") {
      currentMotorOn = true;
      digitalWrite(MOTOR_PIN, HIGH);
    } else {
      currentMotorOn = false;
      digitalWrite(MOTOR_PIN, LOW);
    }

    Serial.print("📡 Motor Status: "); Serial.println(motorStatus);
  } else {
    Serial.print("❌ HTTP Error: "); Serial.println(httpResponseCode);
  }
  http.end();
}
