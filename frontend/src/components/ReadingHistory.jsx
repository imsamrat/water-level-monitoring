import { useEffect, useState } from "react";
import { waterAPI } from "../services/api";
import "./ReadingHistory.css";

const ReadingHistory = ({ refreshTrigger }) => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadings();
  }, [refreshTrigger]);

  const fetchReadings = async () => {
    try {
      const res = await waterAPI.getHistory(20);
      if (res.data.success) {
        setReadings(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch readings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    };
  };

  const getStatusBadgeClass = (status) => {
    return `badge badge-${status.toLowerCase()}`;
  };

  if (loading) {
    return (
      <div className="reading-history card">
        <h3 className="reading-title">Recent Readings</h3>
        <div className="reading-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="reading-history card">
      <div className="reading-header">
        <div>
          <h3 className="reading-title">Recent Readings</h3>
          <p className="reading-subtitle">Latest sensor data from ESP8266</p>
        </div>
      </div>

      {readings.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Level (Raw)</th>
                <th>Percentage</th>
                <th>Status</th>
                <th>Motor</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading, index) => {
                const { date, time } = formatDateTime(reading.timestamp);
                return (
                  <tr key={reading._id || index}>
                    <td className="reading-index">{index + 1}</td>
                    <td>
                      <div className="reading-time-cell">
                        <span className="reading-date">{date}</span>
                        <span className="reading-time">{time}</span>
                      </div>
                    </td>
                    <td className="reading-level">{reading.level}</td>
                    <td>
                      <div className="reading-percentage">
                        <div className="percentage-bar-bg">
                          <div
                            className={`percentage-bar percentage-bar-${reading.status.toLowerCase()}`}
                            style={{ width: `${reading.percentage}%` }}
                          />
                        </div>
                        <span className="percentage-text">{reading.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(reading.status)}>
                        {reading.status}
                      </span>
                    </td>
                    <td>
                      <span className={`motor-badge ${reading.motorStatus === "ON" ? "motor-badge-on" : "motor-badge-off"}`}>
                        {reading.motorStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="reading-empty">
          <p>No readings available</p>
          <span>Data will appear here once the ESP8266 starts sending readings</span>
        </div>
      )}
    </div>
  );
};

export default ReadingHistory;
