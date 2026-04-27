# 💧 AquaMonitor - IoT Water Level Monitoring System

A full-stack MERN (MongoDB, Express.js, React.js, Node.js) IoT-based Water Level Monitoring System with real-time data updates via Socket.io.

## 🏗️ System Architecture

```
ESP8266 Sensor → Node.js REST API → MongoDB Atlas
                        ↓
                    Socket.io
                        ↓
                React Dashboard (Real-time Updates)
```

## ✨ Features

- 🔐 **Email + OTP Authentication** — Secure login with OTP verification via Gmail SMTP
- 💧 **Animated Water Tank** — Real-time visual water level display with wave animations
- 📊 **Live Charts** — Line chart showing water level trends over time (Chart.js)
- 🚨 **Low Level Alerts** — Automatic alerts when water level drops below 25%
- ⚡ **Real-time Updates** — Socket.io powered live data streaming
- 🔌 **Motor Status** — ON/OFF indicator based on water level
- 📋 **Event Tracking** — History of low-level detections with timestamps
- 📱 **Responsive Design** — Works on desktop, tablet, and mobile
- 🔑 **API Key Security** — ESP8266 data endpoint secured with API key

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Gmail account (for OTP)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, Gmail credentials, etc.
npm install
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Test with Simulator (No Hardware Needed)

```bash
cd backend
node simulator.js
```

This sends simulated water level data to your backend API, cycling through all states.

## 🔧 Environment Variables

Create a `.env` file in `/backend`:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/water-level-db
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
API_KEY=esp8266_water_sensor_key_2024
PORT=5000
CLIENT_URL=http://localhost:5173
```

### Getting Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate a new app password for "Mail"
5. Use that password in `EMAIL_PASS`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (sends OTP) |
| POST | `/api/auth/verify-otp` | Verify OTP & get JWT |
| GET | `/api/auth/me` | Get current user |

### Water Data (ESP8266)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/water-data` | API Key | Send sensor data |
| GET | `/api/water-data/latest` | JWT | Get latest reading |
| GET | `/api/water-data/history` | JWT | Get reading history |
| GET | `/api/water-data/chart` | JWT | Get chart data |
| GET | `/api/water-data/events` | JWT | Get events log |
| GET | `/api/water-data/stats` | JWT | Get statistics |

### ESP8266 Data Format

```http
POST /api/water-data
x-api-key: your_api_key

{
  "level": 450,
  "percentage": 35,
  "deviceId": "tank_01"
}
```

## 🎯 Status Levels

| Range | Status | Color | Motor |
|-------|--------|-------|-------|
| 0–25% | LOW | 🔴 Red | ON |
| 26–50% | MEDIUM | 🟡 Yellow | OFF |
| 51–75% | HIGH | 🔵 Blue | OFF |
| 76–100% | FULL | 🟢 Green | OFF |

## 📂 Project Structure

```
water-level-monitoring-system/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── WaterData.js
│   │   └── Event.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── waterData.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── simulator.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WaterTank.jsx/css
│   │   │   ├── WaterChart.jsx/css
│   │   │   ├── StatsCards.jsx/css
│   │   │   ├── EventHistory.jsx/css
│   │   │   ├── ReadingHistory.jsx/css
│   │   │   ├── AlertBanner.jsx/css
│   │   │   └── Navbar.jsx/css
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── OtpVerify.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Events.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
└── esp8266/
    └── water_level_sensor.ino
```

## 🎓 Presentation Script

> "This system integrates IoT hardware with a MERN stack web application. The ESP8266 sends real-time water level data to a Node.js server, which stores it in MongoDB and pushes live updates to the React dashboard via Socket.io. The system features email-based OTP authentication, animated water tank visualization, real-time charts, event tracking for low water levels, and automatic motor control simulation."

## 📜 License

This project is for educational purposes.
