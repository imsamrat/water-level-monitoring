import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { waterAPI } from "../services/api";
import "./WaterChart.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WaterChart = ({ latestData }) => {
  const [chartData, setChartData] = useState([]);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    fetchChartData();
  }, [timeRange]);

  // Update chart when new data arrives
  useEffect(() => {
    if (latestData) {
      setChartData((prev) => {
        const newData = [
          ...prev,
          {
            percentage: latestData.percentage,
            timestamp: latestData.timestamp,
            status: latestData.status,
          },
        ];
        // Keep last 100 points
        return newData.slice(-100);
      });
    }
  }, [latestData]);

  const fetchChartData = async () => {
    try {
      const res = await waterAPI.getChartData(timeRange);
      if (res.data.success) {
        setChartData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const data = {
    labels: chartData.map((d) => formatTime(d.timestamp)),
    datasets: [
      {
        label: "Water Level (%)",
        data: chartData.map((d) => d.percentage),
        fill: true,
        borderColor: "#06b6d4",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.3)");
          gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.1)");
          gradient.addColorStop(1, "rgba(6, 182, 212, 0)");
          return gradient;
        },
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: "#06b6d4",
        pointHoverBorderColor: "#fff",
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 22, 41, 0.95)",
        titleColor: "#94a3b8",
        bodyColor: "#f1f5f9",
        borderColor: "rgba(6, 182, 212, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 11, weight: "500" },
        bodyFont: { size: 14, weight: "600" },
        callbacks: {
          label: (context) => `Water Level: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(148, 163, 184, 0.06)",
          drawBorder: false,
        },
        ticks: {
          color: "#64748b",
          font: { size: 11, family: "'JetBrains Mono', monospace" },
          maxTicksLimit: 8,
          maxRotation: 0,
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: "rgba(148, 163, 184, 0.06)",
          drawBorder: false,
        },
        ticks: {
          color: "#64748b",
          font: { size: 11, family: "'JetBrains Mono', monospace" },
          callback: (value) => `${value}%`,
          stepSize: 25,
        },
      },
    },
  };

  return (
    <div className="chart-card card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Water Level Trend</h3>
          <p className="chart-subtitle">Real-time water level analytics</p>
        </div>
        <div className="chart-controls">
          {[6, 12, 24, 48].map((hours) => (
            <button
              key={hours}
              className={`chart-range-btn ${timeRange === hours ? "active" : ""}`}
              onClick={() => setTimeRange(hours)}
            >
              {hours}h
            </button>
          ))}
        </div>
      </div>
      <div className="chart-body">
        {chartData.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="chart-empty">
            <p>No data available for this time range</p>
            <span>Water level data will appear here once received from the sensor</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterChart;
