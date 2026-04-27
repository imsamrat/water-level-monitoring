import { useState, useEffect } from "react";
import { IoAlertCircle, IoCloseCircle } from "react-icons/io5";
import "./AlertBanner.css";

const AlertBanner = ({ waterData }) => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (waterData && waterData.percentage <= 25 && !dismissed) {
      setShow(true);
    } else if (waterData && waterData.percentage > 25) {
      setShow(false);
      setDismissed(false);
    }
  }, [waterData, dismissed]);

  if (!show) return null;

  return (
    <div className="alert-banner animate-fade-in">
      <div className="alert-content">
        <div className="alert-icon-wrap">
          <IoAlertCircle className="alert-icon" />
        </div>
        <div className="alert-text">
          <strong>⚠️ Low Water Level Alert!</strong>
          <span>
            Water level is at <strong>{waterData.percentage}%</strong> — Motor has been activated automatically.
            Please monitor the system.
          </span>
        </div>
      </div>
      <button
        className="alert-dismiss"
        onClick={() => {
          setDismissed(true);
          setShow(false);
        }}
      >
        <IoCloseCircle />
      </button>
    </div>
  );
};

export default AlertBanner;
