import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  IoWater,
  IoLogOutOutline,
  IoGridOutline,
  IoBarChartOutline,
  IoTimeOutline,
  IoPersonCircleOutline,
} from "react-icons/io5";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { path: "/dashboard", label: "Dashboard", icon: <IoGridOutline /> },
    // { path: "/analytics", label: "Analytics", icon: <IoBarChartOutline /> }, // Hidden - Analytics tab
    { path: "/events", label: "Events", icon: <IoTimeOutline /> },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand" onClick={() => navigate("/dashboard")}>
          <div className="navbar-logo">
            <IoWater />
          </div>
          <div className="navbar-title">
            <span className="navbar-name">AquaMonitor</span>
            <span className="navbar-subtitle">IoT Water Level System</span>
          </div>
        </div>

        <div className="navbar-links">
          {navLinks.map((link) => (
            <button
              key={link.path}
              className={`nav-link ${location.pathname === link.path ? "active" : ""}`}
              onClick={() => navigate(link.path)}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          ))}
        </div>

        <div className="navbar-actions">
          <div className="navbar-user">
            <IoPersonCircleOutline className="user-avatar" />
            <span className="user-name">{user?.name || "User"}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            <IoLogOutOutline />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
