import axios, { AxiosRequestConfig } from "axios";

function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "127.0.0.1" || host === "localhost") {
      return "http://127.0.0.1:4000";
    }
    return `http://${host}:4000`;
  }
  return "http://127.0.0.1:4000";
}

const api = axios.create({
  baseURL: resolveBaseUrl() + "/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("coopgig_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      const token = localStorage.getItem("coopgig_token");
      if (token) {
        localStorage.removeItem("coopgig_token");
        localStorage.removeItem("coopgig_user");
        const currentPath = window.location.pathname;
        const isProtected =
          currentPath.startsWith("/consumer") ||
          currentPath.startsWith("/worker") ||
          currentPath.startsWith("/admin") ||
          currentPath.startsWith("/coop-admin");
        if (isProtected) {
          window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
      }
    }
    return Promise.reject(err);
  }
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<T>(url, config);
  return res.data;
}

export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<T>(url, data, config);
  return res.data;
}

export async function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.put<T>(url, data, config);
  return res.data;
}

export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.patch<T>(url, data, config);
  return res.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete<T>(url, config);
  return res.data;
}

export async function apiUpload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<T>(url, formData, {
    ...config,
    headers: { "Content-Type": undefined, ...config?.headers },
  });
  return res.data;
}

export default api;
