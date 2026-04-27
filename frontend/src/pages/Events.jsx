import Navbar from "../components/Navbar";
import EventHistory from "../components/EventHistory";
import "./Events.css";

const Events = () => {
  return (
    <>
      <Navbar />
      <div className="events-page">
        <div className="events-container">
          <div className="page-header animate-fade-in">
            <div className="page-header-left">
              <h1 className="page-title">Events</h1>
              <p className="page-subtitle-text">
                Low level detections and motor activity log
              </p>
            </div>
          </div>

          <EventHistory refreshTrigger={0} />
        </div>
      </div>
    </>
  );
};

export default Events;
