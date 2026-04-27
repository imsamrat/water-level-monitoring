const mongoose = require("mongoose");

const waterDataSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: [true, "Water level is required"],
    },
    percentage: {
      type: Number,
      required: [true, "Water percentage is required"],
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "FULL"],
      required: true,
    },
    deviceId: {
      type: String,
      default: "tank_01",
    },
    motorStatus: {
      type: String,
      enum: ["ON", "OFF"],
      default: "OFF",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient time-based queries
waterDataSchema.index({ timestamp: -1 });
waterDataSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model("WaterData", waterDataSchema);
