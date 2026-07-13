import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as authApi from '../api/authApi';
import { updatePushToken } from '../api/userApi';
import { configureApiAuth, ApiError } from '../api/client';

const REFRESH_TOKEN_KEY = 'refreshToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('booting'); // booting | signedOut | signedIn
  const [user, setUser] = useState(null);
  const accessTokenRef = useRef(null);
  const refreshPromiseRef = useRef(null);

  const applySession = useCallback(async (session) => {
    accessTokenRef.current = session.accessToken;
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const clearSession = useCallback(async () => {
    accessTokenRef.current = null;
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Shares one in-flight refresh across concurrent callers (a 401 retry, the
  // socket reconnect, the boot check, ...): the backend's refresh tokens are
  // single-use/rotating, so two parallel /auth/refresh calls would have the
  // second one rejected against an already-rotated token.
  const refreshTokens = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const attempt = (async () => {
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        await clearSession();
        return null;
      }

      try {
        const session = await authApi.refresh(storedRefreshToken);
        await applySession(session);
        return session.accessToken;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // The refresh token itself is invalid/expired/revoked - genuinely signed out.
          await clearSession();
        } else {
          // Network/server hiccup: don't destroy a possibly-still-valid stored
          // token, just leave this session attempt as signed-out for now.
          setStatus('signedOut');
        }
        return null;
      }
    })();

    refreshPromiseRef.current = attempt;
    try {
      return await attempt;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => accessTokenRef.current,
      onUnauthorized: async () => {
        const token = await refreshTokens();
        return !!token;
      },
    });
  }, [refreshTokens]);

  useEffect(() => {
    refreshTokens();
    // Run once on mount to silently resume a session from the stored refresh token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async ({ email, password }) => applySession(await authApi.login({ email, password })),
    [applySession]
  );

  const registerUser = useCallback(async (fields) => applySession(await authApi.register(fields)), [applySession]);

  const loginByPhone = useCallback(
    async (phone, password) => applySession(await authApi.loginByPhone(phone, password)),
    [applySession]
  );

  const registerByPhone = useCallback(
    async (fields) => applySession(await authApi.registerByPhone(fields)),
    [applySession]
  );

  const logout = useCallback(async () => {
    // Best-effort: a stale token left registered after logout could still
    // receive pushes meant for whoever signs into this device next.
    await updatePushToken(null).catch(() => {});
    const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (storedRefreshToken) {
      await authApi.logout(storedRefreshToken).catch(() => {});
    }
    await clearSession();
  }, [clearSession]);

  // Lets screens (e.g. EditProfile) merge a fresh user object from the API
  // response into the in-memory session without a full re-login.
  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      register: registerUser,
      loginByPhone,
      registerByPhone,
      logout,
      updateUser,
      refreshTokens,
      getAccessToken: () => accessTokenRef.current,
    }),
    [status, user, login, registerUser, loginByPhone, registerByPhone, logout, updateUser, refreshTokens]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
