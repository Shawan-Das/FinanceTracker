import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { authApi, setForceLogoutHandler, cancelAllRequests } from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  forceLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Clear all cached data for the previous user
  const clearUserCache = useCallback(() => {
    queryClient.clear();
    cancelAllRequests();
  }, [queryClient]);

  // Register force-logout handler for 401 auto-logout
  const forceLogout = useCallback(() => {
    setUser(null);
    clearUserCache();
  }, [clearUserCache]);

  useEffect(() => {
    setForceLogoutHandler(forceLogout);
  }, [forceLogout]);

  // Check if user is logged in on mount
  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setUser(res.data.data);
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string, confirmPassword: string) => {
    await authApi.register({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors (session may already be expired)
    }
    setUser(null);
    clearUserCache();
  }, [clearUserCache]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data.data);
    } catch {
      setUser(null);
      clearUserCache();
    }
  }, [clearUserCache]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
