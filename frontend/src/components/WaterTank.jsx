import { useEffect, useRef } from "react";
import "./WaterTank.css";

const WaterTank = ({ percentage = 0, status = "LOW", motorStatus = "OFF" }) => {
  const tankRef = useRef(null);

  const getStatusColor = () => {
    switch (status) {
      case "LOW": return { primary: "#ef4444", secondary: "#dc2626", glow: "rgba(239, 68, 68, 0.3)" };
      case "MEDIUM": return { primary: "#eab308", secondary: "#ca8a04", glow: "rgba(234, 179, 8, 0.3)" };
      case "HIGH": return { primary: "#3b82f6", secondary: "#2563eb", glow: "rgba(59, 130, 246, 0.3)" };
      case "FULL": return { primary: "#22c55e", secondary: "#16a34a", glow: "rgba(34, 197, 94, 0.3)" };
      default: return { primary: "#06b6d4", secondary: "#0891b2", glow: "rgba(6, 182, 212, 0.3)" };
    }
  };

  const colors = getStatusColor();

  return (
    <div className="water-tank-wrapper">
      <div className="tank-container" ref={tankRef}>
        {/* Tank body */}
        <div className="tank-body">
          {/* Tank glass reflection */}
          <div className="tank-reflection" />

          {/* Water */}
          <div
            className="water"
            style={{
              height: `${Math.min(100, Math.max(0, percentage))}%`,
              background: `linear-gradient(180deg, ${colors.primary}88 0%, ${colors.primary} 50%, ${colors.secondary} 100%)`,
            }}
          >
            {/* Waves */}
            <div className="wave wave-1" style={{ background: `${colors.primary}40` }} />
            <div className="wave wave-2" style={{ background: `${colors.primary}30` }} />
            <div className="wave wave-3" style={{ background: `${colors.primary}20` }} />

            {/* Bubbles */}
            {percentage > 5 && (
              <>
                <div className="bubble bubble-1" />
                <div className="bubble bubble-2" />
                <div className="bubble bubble-3" />
                <div className="bubble bubble-4" />
                <div className="bubble bubble-5" />
              </>
            )}
          </div>

          {/* Level markers */}
          <div className="level-markers">
            <div className="level-mark" style={{ bottom: "25%" }}>
              <span className="mark-line" />
              <span className="mark-label">25%</span>
            </div>
            <div className="level-mark" style={{ bottom: "50%" }}>
              <span className="mark-line" />
              <span className="mark-label">50%</span>
            </div>
            <div className="level-mark" style={{ bottom: "75%" }}>
              <span className="mark-line" />
              <span className="mark-label">75%</span>
            </div>
          </div>

          {/* Percentage overlay */}
          <div className="tank-percentage">
            <span className="percentage-value">{Math.round(percentage)}</span>
            <span className="percentage-symbol">%</span>
          </div>
        </div>

        {/* Tank pipes */}
        <div className="tank-pipe-left">
          <div className={`pipe-flow ${motorStatus === "ON" ? "active" : ""}`} />
        </div>
        <div className="tank-pipe-right" />

        {/* Tank base */}
        <div className="tank-base" />
      </div>

      {/* Status info below tank */}
      <div className="tank-info">
        <div className={`status-badge status-${status.toLowerCase()}`}>
          <span className="status-dot" style={{ background: colors.primary }} />
          {status}
        </div>
        <div className={`motor-indicator ${motorStatus === "ON" ? "motor-on" : "motor-off"}`}>
          <div className="motor-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <span>Motor {motorStatus}</span>
        </div>
      </div>
    </div>
  );
};

export default WaterTank;
