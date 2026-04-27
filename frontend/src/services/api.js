import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  verifyOTP: (data) => api.post("/auth/verify-otp", data),
  getMe: () => api.get("/auth/me"),
};

// Water Data API
export const waterAPI = {
  getLatest: () => api.get("/water-data/latest"),
  getHistory: (limit = 50) => api.get(`/water-data/history?limit=${limit}`),
  getChartData: (hours = 24) => api.get(`/water-data/chart?hours=${hours}`),
  getEvents: (limit = 50) => api.get(`/water-data/events?limit=${limit}`),
  getStats: () => api.get("/water-data/stats"),
  getMotorStatus: () => api.get("/water-data/motor-status"),
  controlMotor: (action, mode = "manual") =>
    api.post("/water-data/motor-control", { action, mode }),
  controlLed: (status) =>
    api.post("/water-data/led-control", { status }),
};

export default api;
