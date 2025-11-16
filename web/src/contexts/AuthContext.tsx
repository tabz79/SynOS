// File: web/src/contexts/AuthContext.tsx
// Author: Gemini
// Date: 2025-11-13

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import apiClient, { setAuthTokens, clearAuthTokens, getAccessToken, getRefreshToken } from '../services/apiClient';

interface User {
  userId: number;
  email: string;
  name: string;
  roles: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedAccessToken = getAccessToken();
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (storedAccessToken && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = response.data;

      setAuthTokens(accessToken, refreshToken, rememberMe);
      if (rememberMe) {
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('user', JSON.stringify(userData));
      }
      setIsAuthenticated(true);
      setUser(userData);
    } catch (error: any) {
      clearAuthTokens();
      setIsAuthenticated(false);
      setUser(null);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      // The refresh token is sent via HttpOnly cookie automatically
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout failed on server:', error);
    } finally {
      clearAuthTokens();
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/login'; // Redirect to login page after logout
    }
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
