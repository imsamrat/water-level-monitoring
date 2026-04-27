/*
 * ESP8266 Water Level Sensor - Arduino Code
 * 
 * Hardware Setup:
 * - ESP8266 (NodeMCU or Wemos D1 Mini)
 * - Ultrasonic Sensor (HC-SR04) or Analog Water Level Sensor
 * - Connected to analog pin A0
 * 
 * Wiring:
 * - Sensor VCC → 3.3V
 * - Sensor GND → GND
 * - Sensor Signal → A0
 * 
 * Configuration:
 * - Update WiFi credentials
 * - Update server IP address
 * - Update API key to match backend .env
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// ===== CONFIGURATION =====
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/water-data";
const char* apiKey = "esp8266_water_sensor_key_2024";

// Timing
const unsigned long SEND_INTERVAL = 5000; // Send data every 5 seconds
unsigned long lastSendTime = 0;

// WiFi client
WiFiClient wifiClient;

void setup() {
  Serial.begin(115200);
  delay(100);
  
  Serial.println();
  Serial.println("=================================");
  Serial.println("  Water Level Monitoring System");
  Serial.println("  ESP8266 Sensor Module");
  Serial.println("=================================");
  
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
    Serial.println("WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi Connection Failed!");
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
      Serial.println("WiFi disconnected! Reconnecting...");
      WiFi.reconnect();
    }
  }
}

void sendWaterData() {
  // Read analog sensor value (0-1023)
  int rawLevel = analogRead(A0);
  
  // Map to percentage (adjust based on your sensor calibration)
  // Note: Many sensors read higher when water is lower
  int percentage = map(rawLevel, 1023, 0, 0, 100);
  percentage = constrain(percentage, 0, 100);
  
  Serial.print("Raw: ");
  Serial.print(rawLevel);
  Serial.print(" | Percentage: ");
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
    Serial.print("Status: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}
