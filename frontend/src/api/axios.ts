import axios from "axios";

// Main API instance for user/auth endpoints
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/user/",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    // Don't add token to public endpoints
    const publicEndpoints = [
      "/login/",
      "/register/",
      "/verify-otp/",
      "/send-reset-password-email/",
    ];

    const isPublic =
      publicEndpoints.some(endpoint => config.url?.includes(endpoint)) ||
      config.url?.includes("/reset-password/");

    if (token && !isPublic) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for booking endpoints
export const bookingsApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/bookings/",
});

bookingsApi.interceptors.request.use(
  (config) => {
    // All booking endpoints require auth
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
