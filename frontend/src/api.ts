import axios from "axios";
export const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: { Accept: "application/json" },
});
let token: string | null = null;
export function setToken(value: string | null) {
  token = value;
}
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    )
      window.dispatchEvent(new Event("session-expired"));
    return Promise.reject(error);
  },
);
export function message(error: unknown): string {
  if (!axios.isAxiosError(error))
    return "Something went wrong. Please try again.";
  const data = error.response?.data as
    | { detail?: string; title?: string; errors?: Record<string, string[]> }
    | undefined;
  if (data?.errors) return Object.values(data.errors).flat().join(" ");
  return (
    data?.detail ||
    data?.title ||
    "We could not reach the library. Check your connection and try again."
  );
}
