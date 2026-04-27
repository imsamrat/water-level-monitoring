/**
 * Data Simulator for testing without ESP8266 hardware
 * Run: node simulator.js
 * 
 * Simulates water level data being sent from an ESP8266 sensor
 * Cycles through different water levels to test all states
 */
require("dotenv").config();
const http = require("http");

const API_URL = process.env.API_URL || "http://localhost:5000";
const API_KEY = process.env.API_KEY || "esp8266_water_sensor_key_2024";
const INTERVAL = 5000; // Send data every 5 seconds

let currentPercentage = 10; // Start at 10%
let direction = 1; // 1 = filling, -1 = draining

const sendData = () => {
  const percentage = Math.round(currentPercentage);
  const level = Math.round(1023 - (percentage / 100) * 1023); // Simulate analog reading

  const data = JSON.stringify({
    level,
    percentage,
    deviceId: "tank_01",
  });

  const url = new URL(`${API_URL}/api/water-data`);

  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "Content-Length": Buffer.byteLength(data),
    },
  };

  const req = http.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      try {
        const response = JSON.parse(body);
        const motorStatus = response.motorStatus || "OFF";
        
        // SMART LOGIC:
        // If Motor is ON -> Direction is UP (Filling)
        // If Motor is OFF -> Direction is DOWN (Draining/Usage)
        if (motorStatus === "ON") {
          direction = 1;
          currentPercentage += (Math.random() * 3 + 1); // Filling speed
        } else {
          direction = -1;
          currentPercentage -= (Math.random() * 0.5 + 0.1); // Slow usage/drain
        }

        // Clamp values
        if (currentPercentage >= 100) currentPercentage = 100;
        if (currentPercentage <= 0) currentPercentage = 0;

        const status = percentage <= 20 ? "LOW" : (percentage >= 95 ? "FULL" : "NORMAL");
        const statusColors = {
          LOW: "\x1b[31m",
          NORMAL: "\x1b[34m",
          FULL: "\x1b[32m",
        };

        const motorColor = motorStatus === "ON" ? "\x1b[32m" : "\x1b[31m";
        console.log(
          `${statusColors[status] || ""}[${status}]\x1b[0m | Level: ${percentage}% | Motor: ${motorColor}${motorStatus}\x1b[0m | ${direction === 1 ? "▲ Filling" : "▼ Using"} | ${new Date().toLocaleTimeString()}`
        );
      } catch (e) {
        console.log("Response received (could not parse JSON)");
      }
    });
  });

  req.on("error", (err) => {
    console.error(`\x1b[31m✖ Error: ${err.message}\x1b[0m`);
  });

  req.write(data);
  req.end();
};

console.log("\x1b[36m");
console.log("╔══════════════════════════════════════════╗");
console.log("║  💧 Water Level Simulator                ║");
console.log("║  Sending data every 5 seconds...         ║");
console.log("║  Press Ctrl+C to stop                    ║");
console.log("╚══════════════════════════════════════════╝");
console.log("\x1b[0m");

// Send initial data
sendData();

// Send data at intervals
setInterval(sendData, INTERVAL);
