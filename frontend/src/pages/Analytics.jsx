import { useEffect, useState } from "react";
import { waterAPI } from "../services/api";
import Navbar from "../components/Navbar";
import WaterChart from "../components/WaterChart";
import StatsCards from "../components/StatsCards";
import "./Analytics.css";

const Analytics = () => {
  const [stats, setStats] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          waterAPI.getStats(),
          waterAPI.getHistory(100),
        ]);

        if (statsRes.data.success) setStats(statsRes.data.data);
        if (historyRes.data.success) setHistory(historyRes.data.data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate distribution
  const distribution = history.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0, FULL: 0 }
  );

  const total = history.length || 1;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading analytics...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="analytics-page">
        <div className="analytics-container">
          <div className="page-header animate-fade-in">
            <div className="page-header-left">
              <h1 className="page-title">Analytics</h1>
              <p className="page-subtitle-text">
                Water level trends and statistics
              </p>
            </div>
          </div>

          <StatsCards stats={stats} />

          <div className="analytics-content">
            <WaterChart latestData={null} />

            {/* Distribution Card */}
            <div className="card distribution-card animate-fade-in-up">
              <h3 className="distribution-title">Level Distribution</h3>
              <p className="distribution-subtitle">Based on last {history.length} readings</p>

              <div className="distribution-bars">
                {[
                  { label: "LOW", color: "var(--red-400)", bg: "var(--red-bg)", count: distribution.LOW },
                  { label: "MEDIUM", color: "var(--yellow-400)", bg: "var(--yellow-bg)", count: distribution.MEDIUM },
                  { label: "HIGH", color: "var(--blue-400)", bg: "var(--blue-bg)", count: distribution.HIGH },
                  { label: "FULL", color: "var(--green-400)", bg: "var(--green-bg)", count: distribution.FULL },
                ].map((item) => (
                  <div key={item.label} className="distribution-item">
                    <div className="distribution-label-row">
                      <span className="distribution-label" style={{ color: item.color }}>
                        {item.label}
                      </span>
                      <span className="distribution-count">
                        {item.count} ({Math.round((item.count / total) * 100)}%)
                      </span>
                    </div>
                    <div className="distribution-bar-bg">
                      <div
                        className="distribution-bar-fill"
                        style={{
                          width: `${(item.count / total) * 100}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Analytics;
