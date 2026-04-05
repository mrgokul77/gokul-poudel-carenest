import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const API_BASE_URL = "http://localhost:8000/api";
const REFRESH_URL = `${API_BASE_URL}/user/token/refresh/`;
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const LEGACY_ACCESS_TOKEN_KEY = "access";
const LEGACY_REFRESH_TOKEN_KEY = "refresh";

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
}

function saveTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, access);
  localStorage.setItem(LEGACY_REFRESH_TOKEN_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

type TokenRefreshListener = () => void;
const tokenRefreshListeners: TokenRefreshListener[] = [];

// when the token refreshes, WebSockets need to reconnect with the new one
function notifyAccessTokenRefreshed() {
  tokenRefreshListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("token refresh listener error:", e);
      }
    }
  });
}

// lets other parts of the app know when the token got refreshed
export function subscribeAccessTokenRefresh(cb: TokenRefreshListener) {
  tokenRefreshListeners.push(cb);
  return () => {
    const i = tokenRefreshListeners.indexOf(cb);
    if (i >= 0) tokenRefreshListeners.splice(i, 1);
  };
}

let refreshPromise: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  // prevent multiple refresh calls at once
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refresh = getRefreshToken();
      if (!refresh) return null;
      const { data } = await axios.post<{ access: string }>(REFRESH_URL, {
        refresh,
      });
      if (data?.access) {
        const currentRefresh = refresh || "";
        saveTokens(data.access, currentRefresh);
        notifyAccessTokenRefreshed();
        return data.access;
      }
      return null;
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("Token refresh failed:", e);
      }
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function shouldSkipTokenRefresh(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config?.url) return false;
  const path = `${config.baseURL || ""}${config.url}`;
  return /\/login\/|\/register\/|\/verify-otp\/|send-reset-password|reset-password|token\/refresh/i.test(
    path
  );
}

function attach401Refresh(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };
      if (
        !config ||
        error.response?.status !== 401 ||
        config._retry ||
        shouldSkipTokenRefresh(config)
      ) {
        return Promise.reject(error);
      }

      config._retry = true;
      const access = await performTokenRefresh();
      if (!access) {
        return Promise.reject(error);
      }

      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${access}`;
      return instance(config);
    }
  );
}

// Main API instance for user/auth endpoints
const api = axios.create({
  baseURL: `${API_BASE_URL}/user/`,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    const publicEndpoints = [
      "/login/",
      "/register/",
      "/verify-otp/",
      "/send-reset-password-email/",
    ];

    const isPublic =
      publicEndpoints.some((endpoint) => config.url?.includes(endpoint)) ||
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
  baseURL: `${API_BASE_URL}/bookings/`,
});

bookingsApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for payment endpoints
export const paymentsApi = axios.create({
  baseURL: `${API_BASE_URL}/payments/`,
  headers: {
    "Content-Type": "application/json",
  },
});

paymentsApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for chat endpoints
export const chatApi = axios.create({
  baseURL: `${API_BASE_URL}/chat/`,
  headers: {
    "Content-Type": "application/json",
  },
});

chatApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for caregiver dashboard
export const caregiverApi = axios.create({
  baseURL: `${API_BASE_URL}/caregiver/`,
});

caregiverApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for careseeker dashboard
export const careseekerApi = axios.create({
  baseURL: `${API_BASE_URL}/careseeker/`,
});

careseekerApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for admin user management
export const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin/`,
  headers: {
    "Content-Type": "application/json",
  },
});

adminApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for emergency management endpoints
export const emergencyApi = axios.create({
  baseURL: `${API_BASE_URL}/emergency/`,
  headers: {
    "Content-Type": "application/json",
  },
});

emergencyApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for review endpoints
export const reviewsApi = axios.create({
  baseURL: `${API_BASE_URL}/reviews/`,
  headers: {
    "Content-Type": "application/json",
  },
});

reviewsApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Public list for careseekers/caregivers — active announcements
export const announcementsApi = axios.create({
  baseURL: `${API_BASE_URL}/announcements/`,
  headers: {
    "Content-Type": "application/json",
  },
});

announcementsApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for complaint endpoints
export const complaintsApi = axios.create({
  baseURL: `${API_BASE_URL}/complaints/`,
  headers: {
    "Content-Type": "application/json",
  },
});

complaintsApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clientsWithRefresh: AxiosInstance[] = [
  api,
  bookingsApi,
  paymentsApi,
  chatApi,
  caregiverApi,
  careseekerApi,
  adminApi,
  emergencyApi,
  reviewsApi,
  announcementsApi,
  complaintsApi,
];
clientsWithRefresh.forEach(attach401Refresh);

export default api;
