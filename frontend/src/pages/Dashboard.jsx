import { useEffect, useState, useCallback } from "react";
import { waterAPI } from "../services/api";
import socket from "../services/socket";
import WaterTank from "../components/WaterTank";
import StatsCards from "../components/StatsCards";
import WaterChart from "../components/WaterChart";
import AlertBanner from "../components/AlertBanner";
// import ReadingHistory from "../components/ReadingHistory"; // Hidden - replaced by MotorStatus
import MotorStatus from "../components/MotorStatus";
import Navbar from "../components/Navbar";
import { IoRefreshOutline, IoPulseOutline } from "react-icons/io5";
import "./Dashboard.css";

const Dashboard = () => {
  const [waterData, setWaterData] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [latestRes, statsRes] = await Promise.all([
        waterAPI.getLatest(),
        waterAPI.getStats(),
      ]);

      if (latestRes.data.success) {
        setWaterData(latestRes.data.data);
        setLastUpdate(new Date());
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Connect socket
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Listen for real-time updates
    socket.on("waterUpdate", (data) => {
      setWaterData(data);
      setLastUpdate(new Date());
      setRefreshKey((prev) => prev + 1);

      // Update stats
      setStats((prev) => ({
        ...prev,
        currentLevel: data.percentage,
        motorStatus: data.motorStatus,
        totalReadings: (prev.totalReadings || 0) + 1,
        lowEvents:
          data.status === "LOW" ? (prev.lowEvents || 0) + 1 : prev.lowEvents,
      }));
    });

    // FALLBACK POLLING: 
    // Since Vercel Serverless doesn't support long-lived WebSockets perfectly,
    // we fetch data every 5 seconds as a backup.
    const fallbackInterval = setInterval(() => {
      if (!connected) {
        fetchData();
        setRefreshKey((prev) => prev + 1);
      }
    }, 5000);

    return () => {
      socket.off("waterUpdate");
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
      clearInterval(fallbackInterval);
    };
  }, [fetchData, connected]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
    setRefreshKey((prev) => prev + 1);
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return "Never";
    return lastUpdate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-page">
        <div className="dashboard-container">
          {/* Page Header */}
          <div className="page-header animate-fade-in">
            <div className="page-header-left">
              <h1 className="page-title">Dashboard</h1>
              <div className="page-meta">
                <div className={`connection-status ${connected ? "connected" : "disconnected"}`}>
                  <IoPulseOutline />
                  <span>{connected ? "Live" : "Offline"}</span>
                </div>
                <span className="last-update">
                  Last update: {formatLastUpdate()}
                </span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={handleRefresh}>
              <IoRefreshOutline />
              Refresh
            </button>
          </div>

          {/* Alert Banner */}
          <AlertBanner waterData={waterData} />

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Main Content Grid */}
          <div className="dashboard-grid">
            {/* Water Tank */}
            <div className="tank-section card animate-fade-in-up">
              <h3 className="section-title">Live Water Tank</h3>
              <p className="section-subtitle">Real-time visualization</p>
              <div className="tank-center">
                <WaterTank
                  percentage={waterData?.percentage || 0}
                  status={waterData?.status || "LOW"}
                  motorStatus={waterData?.motorStatus || "OFF"}
                />
              </div>
            </div>

            {/* Chart */}
            <WaterChart latestData={waterData} />
          </div>

          {/* Motor Status Panel (replaced Recent Readings) */}
          <MotorStatus waterData={waterData} refreshTrigger={refreshKey} />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
