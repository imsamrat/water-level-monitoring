const express = require("express");
const WaterData = require("../models/WaterData");
const Event = require("../models/Event");
const { authMiddleware, apiKeyMiddleware } = require("../middleware/auth");

const router = express.Router();

// ===== Motor Control State =====
// In-memory motor state (persisted across requests, reset on server restart)
let motorState = {
  status: "OFF",         // Current motor status: "ON" or "OFF"
  mode: "auto",          // "auto" or "manual"
  lastToggled: null,     // Timestamp of last toggle
  reason: "System initialized", // Reason for current state
  ledStatus: "OFF",      // LED Light status: "ON" or "OFF"
};

/**
 * GET /api/water-data/motor-status
 * Get current motor status and mode
 */
router.get("/motor-status", authMiddleware, async (req, res) => {
  try {
    const latest = await WaterData.findOne().sort({ timestamp: -1 });
    res.json({
      success: true,
      data: {
        ...motorState,
        currentPercentage: latest ? latest.percentage : 0,
        currentWaterStatus: latest ? latest.status : "LOW",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

/**
 * POST /api/water-data/motor-control
 * Toggle motor ON/OFF from the web dashboard
 * Body: { action: "ON" | "OFF", mode: "manual" | "auto" }
 */
router.post("/motor-control", authMiddleware, async (req, res) => {
  try {
    const { action, mode = "manual" } = req.body;

    if (!action || !["ON", "OFF"].includes(action.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'ON' or 'OFF'.",
      });
    }

    const newStatus = action.toUpperCase();
    const previousStatus = motorState.status;

    motorState = {
      status: newStatus,
      mode: mode,
      lastToggled: new Date(),
      reason: mode === "manual"
        ? `Manually turned ${newStatus} from dashboard`
        : `Auto: Water level ${newStatus === "ON" ? "below 30%" : "above 30%"}`,
    };

    // Create event for motor toggle
    await Event.create({
      type: newStatus === "ON" ? "MOTOR_ON" : "MOTOR_OFF",
      message: `Motor ${newStatus} — ${motorState.reason}`,
      waterLevel: 0,
      percentage: 0,
      status: "MEDIUM",
      deviceId: "web_control",
      timestamp: new Date(),
    });

    // Emit motor status update via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("motorUpdate", motorState);
    }

    console.log(`⚡ Motor ${previousStatus} → ${newStatus} (${mode})`);

    res.json({
      success: true,
      data: motorState,
    });
  } catch (error) {
    console.error("Motor control error:", error);
    res.status(500).json({
      success: false,
      message: "Server error controlling motor.",
    });
  }
});

/**
 * POST /api/water-data/led-control
 * Toggle LED light from the web dashboard
 */
router.post("/led-control", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["ON", "OFF"].includes(status.toUpperCase())) {
      return res.status(400).json({ success: false, message: "Status must be ON or OFF" });
    }

    motorState.ledStatus = status.toUpperCase();

    // Emit update via Socket.io so frontend updates instantly
    const io = req.app.get("io");
    if (io) io.emit("motorUpdate", motorState);

    res.json({ success: true, data: motorState });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error controlling LED" });
  }
});

/**
 * POST /api/water-data
 * Receive water level data from ESP8266
 * Secured with API key
 */
router.post("/", apiKeyMiddleware, async (req, res) => {
  try {
    const { level, percentage, deviceId = "tank_01" } = req.body;

    if (level === undefined || percentage === undefined) {
      return res.status(400).json({
        success: false,
        message: "Level and percentage are required.",
      });
    }

    // Determine status
    let status = "FULL";
    if (percentage <= 25) status = "LOW";
    else if (percentage <= 50) status = "MEDIUM";
    else if (percentage <= 75) status = "HIGH";

    // Auto motor control logic (only when in "auto" mode)
    // Uses HYSTERESIS to prevent short-cycling:
    //   - Motor turns ON when water drops to ≤ 20% (start filling)
    //   - Motor STAYS ON while filling (even at 21%, 40%, 50%...)
    //   - Motor turns OFF when water reaches ≥ 95% (tank full)
    //   - Safety cutoff also at ≥ 95% (any mode)
    if (motorState.mode === "auto") {
      if (percentage <= 20 && motorState.status !== "ON") {
        // Water is low → turn motor ON to start filling
        motorState = {
          status: "ON",
          mode: "auto",
          lastToggled: new Date(),
          reason: `Auto: Water low at ${percentage}% — filling tank`,
        };
        const io = req.app.get("io");
        if (io) io.emit("motorUpdate", motorState);
      } else if (percentage >= 95 && motorState.status === "ON") {
        // Water reached 95% → tank is full, turn OFF
        motorState = {
          status: "OFF",
          mode: "auto",
          lastToggled: new Date(),
          reason: `Auto: Tank filled to ${percentage}% — motor stopped`,
        };
        const io = req.app.get("io");
        if (io) io.emit("motorUpdate", motorState);
      }
      // Between 20% and 95%: motor keeps its current state
      // If ON (filling), stays ON. If OFF (not needed), stays OFF.
    }

    // Safety: turn motor OFF when tank is nearly full, regardless of mode
    if (percentage >= 95 && motorState.status === "ON") {
      motorState = {
        status: "OFF",
        mode: "auto",
        lastToggled: new Date(),
        reason: "Safety: Tank full (≥ 95%) — motor stopped",
      };
      const io = req.app.get("io");
      if (io) io.emit("motorUpdate", motorState);
    }

    const currentMotorStatus = motorState.status;

    // Save water data
    const data = await WaterData.create({
      level,
      percentage: Math.min(100, Math.max(0, percentage)),
      status,
      deviceId,
      motorStatus: currentMotorStatus,
      timestamp: new Date(),
    });

    // Create event if water is LOW
    if (percentage <= 25) {
      await Event.create({
        type: "LOW_LEVEL_DETECTED",
        message: `Low water level detected (${percentage}%) — Motor ${currentMotorStatus}`,
        waterLevel: level,
        percentage,
        status,
        deviceId,
        timestamp: new Date(),
      });
    }

    // Create event if tank is FULL
    if (percentage >= 95) {
      await Event.create({
        type: "TANK_FULL",
        message: "Tank is full — Motor OFF",
        waterLevel: level,
        percentage,
        status,
        deviceId,
        timestamp: new Date(),
      });
    }

    // Emit real-time update via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("waterUpdate", { ...data.toObject(), motorState });
    }

    res.json({
      success: true,
      data,
      motorStatus: currentMotorStatus,
      ledStatus: motorState.ledStatus
    });
  } catch (error) {
    console.error("Water data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving water data.",
    });
  }
});

/**
 * GET /api/water-data/latest
 * Get the latest water level reading
 */
router.get("/latest", authMiddleware, async (req, res) => {
  try {
    const latest = await WaterData.findOne().sort({ timestamp: -1 });

    res.json({
      success: true,
      data: latest || {
        level: 0,
        percentage: 0,
        status: "LOW",
        motorStatus: "OFF",
        timestamp: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

/**
 * GET /api/water-data/history
 * Get water level history (last 50 readings)
 */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await WaterData.find()
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

/**
 * GET /api/water-data/chart
 * Get data formatted for chart (last 24 hours)
 */
router.get("/chart", authMiddleware, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const data = await WaterData.find({
      timestamp: { $gte: since },
    })
      .sort({ timestamp: 1 })
      .select("percentage timestamp status");

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

/**
 * GET /api/water-data/events
 * Get event history
 */
router.get("/events", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await Event.find()
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

/**
 * GET /api/water-data/stats
 * Get statistics summary
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const totalReadings = await WaterData.countDocuments();
    const lowEvents = await Event.countDocuments({ type: "LOW_LEVEL_DETECTED" });
    const latest = await WaterData.findOne().sort({ timestamp: -1 });

    // Get average of last 10 readings
    const recentReadings = await WaterData.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .select("percentage");

    const avgPercentage =
      recentReadings.length > 0
        ? Math.round(
            recentReadings.reduce((sum, r) => sum + r.percentage, 0) /
              recentReadings.length
          )
        : 0;

    res.json({
      success: true,
      data: {
        totalReadings,
        lowEvents,
        avgPercentage,
        currentLevel: latest ? latest.percentage : 0,
        motorStatus: latest ? latest.motorStatus : "OFF",
        lastUpdated: latest ? latest.timestamp : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

module.exports = router;
