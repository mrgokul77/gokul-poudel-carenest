import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const REFRESH_URL = "http://127.0.0.1:8000/api/user/token/refresh/";

type TokenRefreshListener = () => void;
const tokenRefreshListeners: TokenRefreshListener[] = [];

/** Notify WebSockets (and other subscribers) to reconnect with the new access token. */
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

/** Subscribe to successful access-token refresh (e.g. reconnect WebSockets). */
export function subscribeAccessTokenRefresh(cb: TokenRefreshListener) {
  tokenRefreshListeners.push(cb);
  return () => {
    const i = tokenRefreshListeners.indexOf(cb);
    if (i >= 0) tokenRefreshListeners.splice(i, 1);
  };
}

let refreshPromise: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      if (!refresh) return null;
      const { data } = await axios.post<{ access: string }>(REFRESH_URL, {
        refresh,
      });
      if (data?.access) {
        localStorage.setItem("access", data.access);
        notifyAccessTokenRefreshed();
        return data.access;
      }
      return null;
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("Token refresh failed:", e);
      }
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
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
  baseURL: "http://127.0.0.1:8000/api/user/",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

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
  baseURL: "http://127.0.0.1:8000/api/bookings/",
});

bookingsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for payment endpoints
export const paymentsApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/payments/",
  headers: {
    "Content-Type": "application/json",
  },
});

paymentsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for chat endpoints
export const chatApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/chat/",
  headers: {
    "Content-Type": "application/json",
  },
});

chatApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for caregiver dashboard
export const caregiverApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/caregiver/",
});

caregiverApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for careseeker dashboard
export const careseekerApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/careseeker/",
});

careseekerApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for admin user management
export const adminApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/admin/",
  headers: {
    "Content-Type": "application/json",
  },
});

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Separate instance for review endpoints
export const reviewsApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/reviews/",
  headers: {
    "Content-Type": "application/json",
  },
});

reviewsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Public list for careseekers/caregivers — active announcements
export const announcementsApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/announcements/",
  headers: {
    "Content-Type": "application/json",
  },
});

announcementsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
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
  reviewsApi,
  announcementsApi,
];
clientsWithRefresh.forEach(attach401Refresh);

export default api;
