const express = require("express");
const WaterData = require("../models/WaterData");
const Event = require("../models/Event");
const { authMiddleware, apiKeyMiddleware } = require("../middleware/auth");

const router = express.Router();

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

    // Determine motor status (ON when water is low)
    const motorStatus = percentage <= 25 ? "ON" : "OFF";

    // Save water data
    const data = await WaterData.create({
      level,
      percentage: Math.min(100, Math.max(0, percentage)),
      status,
      deviceId,
      motorStatus,
      timestamp: new Date(),
    });

    // Create event if water is LOW
    if (percentage <= 25) {
      await Event.create({
        type: "LOW_LEVEL_DETECTED",
        message: "Low water level detected — Motor ON",
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
      io.emit("waterUpdate", data);
    }

    res.json({
      success: true,
      data,
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
