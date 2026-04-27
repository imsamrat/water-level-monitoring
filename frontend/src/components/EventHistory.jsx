import { useEffect, useState } from "react";
import { waterAPI } from "../services/api";
import { IoTimeOutline, IoAlertCircle, IoCheckmarkCircle } from "react-icons/io5";
import "./EventHistory.css";

const EventHistory = ({ refreshTrigger }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [refreshTrigger]);

  const fetchEvents = async () => {
    try {
      const res = await waterAPI.getEvents(30);
      if (res.data.success) {
        setEvents(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
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
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    };
  };

  const getEventIcon = (type) => {
    switch (type) {
      case "LOW_LEVEL_DETECTED":
        return <IoAlertCircle className="event-icon-low" />;
      case "TANK_FULL":
        return <IoCheckmarkCircle className="event-icon-full" />;
      default:
        return <IoTimeOutline className="event-icon-default" />;
    }
  };

  const getStatusBadgeClass = (status) => {
    return `badge badge-${status.toLowerCase()}`;
  };

  if (loading) {
    return (
      <div className="event-history card">
        <div className="event-header">
          <h3 className="event-title">Event History</h3>
        </div>
        <div className="event-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="event-history card">
      <div className="event-header">
        <div>
          <h3 className="event-title">Event History</h3>
          <p className="event-subtitle">Low level detections & motor events</p>
        </div>
        <span className="event-count">{events.length} events</span>
      </div>

      {events.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Time</th>
                <th>Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => {
                const { date, time } = formatDateTime(event.timestamp);
                return (
                  <tr key={event._id || index} className="event-row">
                    <td>
                      <div className="event-type-cell">
                        {getEventIcon(event.type)}
                        <span>{event.message}</span>
                      </div>
                    </td>
                    <td>
                      <div className="event-time-cell">
                        <span className="event-date">{date}</span>
                        <span className="event-time">{time}</span>
                      </div>
                    </td>
                    <td>
                      <span className="event-level">{event.percentage}%</span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(event.status)}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="event-empty">
          <IoTimeOutline className="empty-icon" />
          <p>No events recorded yet</p>
          <span>Events will appear when water level drops below 25%</span>
        </div>
      )}
    </div>
  );
};

export default EventHistory;
