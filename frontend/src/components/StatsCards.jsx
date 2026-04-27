import {
  IoWater,
  IoSpeedometerOutline,
  IoAlertCircleOutline,
  IoTrendingUpOutline,
  IoTimeOutline,
} from "react-icons/io5";
import "./StatsCards.css";

const StatsCards = ({ stats }) => {
  const cards = [
    {
      label: "Current Level",
      value: `${stats.currentLevel ?? 0}%`,
      icon: <IoWater />,
      color: "cyan",
      description: "Live water level",
    },
    {
      label: "Average Level",
      value: `${stats.avgPercentage ?? 0}%`,
      icon: <IoSpeedometerOutline />,
      color: "blue",
      description: "Last 10 readings",
    },
    {
      label: "Low Events",
      value: stats.lowEvents ?? 0,
      icon: <IoAlertCircleOutline />,
      color: "red",
      description: "Total low level alerts",
    },
    {
      label: "Total Readings",
      value: stats.totalReadings ?? 0,
      icon: <IoTrendingUpOutline />,
      color: "green",
      description: "Sensor data points",
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`stat-card stat-${card.color}`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="stat-icon-wrap">
            <div className={`stat-icon stat-icon-${card.color}`}>
              {card.icon}
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
            <span className="stat-desc">{card.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
