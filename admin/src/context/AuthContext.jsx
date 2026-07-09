import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { configureApiAuth } from '../api/client';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

const STORAGE_KEY = 'taxi_admin_auth';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStored(value) {
  if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStored);
  const [booting, setBooting] = useState(true);
  const authRef = useRef(auth);
  authRef.current = auth;

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    if (data.user.role !== 'ADMIN') {
      throw new Error('This account does not have admin access');
    }
    const next = { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
    setAuth(next);
    saveStored(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    const current = authRef.current;
    setAuth(null);
    saveStored(null);
    if (current?.refreshToken) authApi.logout(current.refreshToken).catch(() => {});
  }, []);

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => authRef.current?.accessToken || null,
      onUnauthorized: async () => {
        const current = authRef.current;
        if (!current?.refreshToken) return false;
        try {
          const { data } = await authApi.refresh(current.refreshToken);
          const next = { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
          setAuth(next);
          saveStored(next);
          return true;
        } catch {
          setAuth(null);
          saveStored(null);
          return false;
        }
      },
    });
    setBooting(false);
  }, []);

  const value = useMemo(
    () => ({ user: auth?.user || null, isAuthenticated: !!auth, booting, login, logout }),
    [auth, booting, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
