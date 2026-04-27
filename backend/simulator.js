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
  // Simulate water level changes
  currentPercentage += direction * (Math.random() * 5 + 2);

  // Bounce between 5% and 98%
  if (currentPercentage >= 98) {
    currentPercentage = 98;
    direction = -1;
  } else if (currentPercentage <= 5) {
    currentPercentage = 5;
    direction = 1;
  }

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
      let status = "FULL";
      if (percentage <= 25) status = "LOW";
      else if (percentage <= 50) status = "MEDIUM";
      else if (percentage <= 75) status = "HIGH";

      const statusColors = {
        LOW: "\x1b[31m",
        MEDIUM: "\x1b[33m",
        HIGH: "\x1b[34m",
        FULL: "\x1b[32m",
      };

      const dir = direction === 1 ? "▲ Filling" : "▼ Draining";
      console.log(
        `${statusColors[status]}● ${status}\x1b[0m | Level: ${percentage}% | Raw: ${level} | ${dir} | ${new Date().toLocaleTimeString()}`
      );
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
