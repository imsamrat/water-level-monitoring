const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["LOW_LEVEL_DETECTED", "MOTOR_ON", "MOTOR_OFF", "TANK_FULL"],
    },
    message: {
      type: String,
      required: true,
    },
    waterLevel: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
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
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ timestamp: -1 });

module.exports = mongoose.model("Event", eventSchema);
