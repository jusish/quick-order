import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

interface ExtendedInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipRefresh?: boolean;
}

let refreshTokenPromise: Promise<any> | null = null;

// Interceptor to handle token refresh on 401/403 (matching ims-client's axios config)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedInternalAxiosRequestConfig;
    const status = error?.response?.status;

    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh-token');
    const shouldSkipRefresh = originalRequest?._skipRefresh || isRefreshEndpoint;

    if (shouldSkipRefresh) {
      if (typeof window !== "undefined" && ((status === 401 || status === 403) || (isRefreshEndpoint && status === 400))) {
        document.cookie = "AUTH_SESSION_FLAG=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
      return Promise.reject(error);
    }

    if ((status === 401 || status === 403) && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (refreshTokenPromise) {
        return refreshTokenPromise.then(() => {
          return api.request(originalRequest);
        });
      }

      const config = {
        _skipRefresh: true,
      } as any;

      refreshTokenPromise = api.post("/auth/refresh-token", {}, config)
        .then(() => {
          refreshTokenPromise = null;
          return api.request(originalRequest);
        })
        .catch((err) => {
          refreshTokenPromise = null;
          if (typeof window !== "undefined") {
            document.cookie = "AUTH_SESSION_FLAG=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
            window.location.href = "/login";
          }
          return Promise.reject(err);
        });

      return refreshTokenPromise;
    }

    return Promise.reject(error);
  }
);

export default api;
