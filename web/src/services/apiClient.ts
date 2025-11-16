// File: web/src/services/apiClient.ts
// Author: Gemini
// Date: 2025-11-13

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending HttpOnly cookies
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Function to get tokens based on rememberMe preference
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  // Refresh token is expected to be in HttpOnly cookie, so we don't store it in JS storage
  // This function is mainly for conceptual clarity or if we decide to store it in localStorage for dev/testing
  return localStorage.getItem('refreshToken'); // For development/testing purposes
};

export const setAuthTokens = (accessToken: string, refreshToken: string, rememberMe: boolean) => {
  if (rememberMe) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken); // For dev/testing, in prod it's HttpOnly cookie
  } else {
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken); // For dev/testing, in prod it's HttpOnly cookie
  }
};

export const clearAuthTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
};

// Function to refresh the access token
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    // The refresh token is sent via HttpOnly cookie automatically
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
    const { accessToken, refreshToken, user } = response.data;

    // Update tokens in storage (if localStorage is used for refresh token)
    // For HttpOnly cookie, the browser handles the refresh token storage
    const rememberMe = localStorage.getItem('accessToken') !== null; // Check if user chose "remember me" previously
    setAuthTokens(accessToken, refreshToken, rememberMe);
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.setItem('user', JSON.stringify(user));
    }
    return accessToken;
  } catch (error) {
    clearAuthTokens();
    window.location.href = '/login';
    return null;
  }
};

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration and refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 Unauthorized and not a login/refresh request
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== `${API_BASE_URL}/auth/login` && originalRequest.url !== `${API_BASE_URL}/auth/refresh`) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            processQueue(null, newAccessToken);
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    // If 401 on refresh token itself, or other unhandled 401
    if (error.response?.status === 401 && (originalRequest.url === `${API_BASE_URL}/auth/refresh` || originalRequest.url === `${API_BASE_URL}/auth/login`)) {
      clearAuthTokens();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
