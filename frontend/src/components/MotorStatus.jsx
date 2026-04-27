import { useEffect, useState, useCallback } from "react";
import { waterAPI } from "../services/api";
import socket from "../services/socket";
import {
  IoCogOutline,
  IoFlashOutline,
  IoFlashOffOutline,
  IoTimeOutline,
  IoWaterOutline,
  IoToggle,
  IoSwapHorizontalOutline,
  IoSunnyOutline,
} from "react-icons/io5";
import "./MotorStatus.css";

const MotorStatus = ({ waterData, refreshTrigger }) => {
  const [motorState, setMotorState] = useState({
    status: "OFF",
    mode: "auto",
    reason: "Loading...",
    currentPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [recentMotorHistory, setRecentMotorHistory] = useState([]);

  // Fetch motor status
  const fetchMotorStatus = useCallback(async () => {
    try {
      const res = await waterAPI.getMotorStatus();
      if (res.data.success) {
        setMotorState(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch motor status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch recent readings for motor history
  const fetchMotorHistory = useCallback(async () => {
    try {
      const res = await waterAPI.getHistory(8);
      if (res.data.success) {
        setRecentMotorHistory(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch motor history:", err);
    }
  }, []);

  useEffect(() => {
    fetchMotorStatus();
    fetchMotorHistory();
  }, [fetchMotorStatus, fetchMotorHistory, refreshTrigger]);

  // Listen for real-time motor updates
  useEffect(() => {
    const handleMotorUpdate = (data) => {
      setMotorState((prev) => ({ ...prev, ...data }));
    };

    socket.on("motorUpdate", handleMotorUpdate);

    return () => {
      socket.off("motorUpdate", handleMotorUpdate);
    };
  }, []);

  // Update percentage from waterData prop
  useEffect(() => {
    if (waterData?.percentage !== undefined) {
      setMotorState((prev) => ({
        ...prev,
        currentPercentage: waterData.percentage,
      }));
    }
  }, [waterData]);

  // Toggle motor ON/OFF
  const handleToggleMotor = async () => {
    if (toggling) return;
    setToggling(true);

    try {
      const newAction = motorState.status === "ON" ? "OFF" : "ON";
      const res = await waterAPI.controlMotor(newAction, "manual");
      if (res.data.success) {
        setMotorState(res.data.data);
        fetchMotorHistory();
      }
    } catch (err) {
      console.error("Failed to toggle motor:", err);
    } finally {
      setToggling(false);
    }
  };

  // Switch to auto mode
  const handleSetAutoMode = async () => {
    if (toggling) return;
    setToggling(true);

    try {
      // In auto mode, determine action based on current water level
      const currentPct = waterData?.percentage || motorState.currentPercentage || 0;
      const autoAction = currentPct <= 20 ? "ON" : "OFF";
      const res = await waterAPI.controlMotor(autoAction, "auto");
      if (res.data.success) {
        setMotorState(res.data.data);
        fetchMotorHistory();
      }
    } catch (err) {
      console.error("Failed to set auto mode:", err);
    } finally {
      setToggling(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const isMotorOn = motorState.status === "ON";
  const isAutoMode = motorState.mode === "auto";

  if (loading) {
    return (
      <div className="motor-status-panel card">
        <h3 className="motor-panel-title">Motor Status</h3>
        <div className="motor-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="motor-status-panel card animate-fade-in-up">
      {/* Panel Header */}
      <div className="motor-panel-header">
        <div>
          <h3 className="motor-panel-title">
            <IoCogOutline className={isMotorOn ? "motor-spin" : ""} />
            Motor Control
          </h3>
          <p className="motor-panel-subtitle">Real-time motor management</p>
        </div>
        <div className={`motor-mode-badge ${isAutoMode ? "mode-auto" : "mode-manual"}`}>
          {isAutoMode ? "AUTO" : "MANUAL"}
        </div>
      </div>

      {/* Main Motor Status Display */}
      <div className={`motor-display ${isMotorOn ? "motor-active" : "motor-inactive"}`}>
        <div className="motor-visual">
          <div className={`motor-circle ${isMotorOn ? "on" : "off"}`}>
            <div className={`motor-gear-icon ${isMotorOn ? "spinning" : ""}`}>
              <IoCogOutline />
            </div>
            <div className={`motor-ring ${isMotorOn ? "ring-active" : ""}`} />
            <div className={`motor-ring motor-ring-2 ${isMotorOn ? "ring-active" : ""}`} />
          </div>
          <div className="motor-status-text">
            <span className={`motor-state-label ${isMotorOn ? "state-on" : "state-off"}`}>
              {isMotorOn ? (
                <>
                  <IoFlashOutline className="flash-icon" />
                  MOTOR ON
                </>
              ) : (
                <>
                  <IoFlashOffOutline />
                  MOTOR OFF
                </>
              )}
            </span>
            <span className="motor-reason">{motorState.reason}</span>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          className={`motor-toggle-btn ${isMotorOn ? "toggle-off" : "toggle-on"} ${toggling ? "toggling" : ""}`}
          onClick={handleToggleMotor}
          disabled={toggling}
        >
          {toggling ? (
            <div className="toggle-spinner" />
          ) : (
            <>
              <IoToggle />
              <span>{isMotorOn ? "Turn OFF" : "Turn ON"}</span>
            </>
          )}
        </button>
      </div>

      {/* Control Mode Switcher */}
      <div className="motor-controls">
        <button
          className={`mode-btn ${isAutoMode ? "active" : ""}`}
          onClick={handleSetAutoMode}
          disabled={toggling || isAutoMode}
        >
          <IoSwapHorizontalOutline />
          <span>Auto Mode</span>
          <small>ON ≤ 20% → OFF at 95%</small>
        </button>
        <button
          className={`mode-btn ${!isAutoMode ? "active" : ""}`}
          onClick={() => {
            if (isAutoMode) {
              handleToggleMotor();
            }
          }}
          disabled={toggling || !isAutoMode}
        >
          <IoCogOutline />
          <span>Manual Mode</span>
          <small>Control from dashboard</small>
        </button>
      </div>

      {/* Motor Info Cards */}
      <div className="motor-info-grid">
        <div className="motor-info-card">
          <IoWaterOutline className="info-icon water-icon" />
          <div className="info-content">
            <span className="info-value">{Math.round(waterData?.percentage || motorState.currentPercentage || 0)}%</span>
            <span className="info-label">Water Level</span>
          </div>
        </div>
        <div className="motor-info-card">
          <IoTimeOutline className="info-icon time-icon" />
          <div className="info-content">
            <span className="info-value">{formatTime(motorState.lastToggled)}</span>
            <span className="info-label">Last Toggle</span>
          </div>
        </div>
      </div>

      {/* Recent Motor Activity */}
      <div className="motor-history">
        <h4 className="motor-history-title">Recent Motor Activity</h4>
        <div className="motor-history-list">
          {recentMotorHistory.slice(0, 6).map((reading, index) => {
            const { time } = formatDateTime(reading.timestamp);
            const isOn = reading.motorStatus === "ON";
            return (
              <div
                className={`motor-history-item ${isOn ? "history-on" : "history-off"}`}
                key={reading._id || index}
              >
                <div className={`history-dot ${isOn ? "dot-on" : "dot-off"}`} />
                <span className="history-time">{time}</span>
                <span className="history-level">{reading.percentage}%</span>
                <span className={`history-status ${isOn ? "on" : "off"}`}>
                  {reading.motorStatus}
                </span>
              </div>
            );
          })}
          {recentMotorHistory.length === 0 && (
            <div className="motor-history-empty">
              <p>No motor activity yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotorStatus;
