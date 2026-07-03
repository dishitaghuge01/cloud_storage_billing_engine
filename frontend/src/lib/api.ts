import axios, { AxiosInstance } from "axios";
import { supabase } from "./supabase";

const api: AxiosInstance = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Request Interceptor: Attach JWT token to Authorization header
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Failed to retrieve session:", error);
  }
  return config;
});

// Response Interceptor: Handle 401 errors by redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear authentication state
      supabase.auth.signOut().catch(() => {});
      // Redirect to login page
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
