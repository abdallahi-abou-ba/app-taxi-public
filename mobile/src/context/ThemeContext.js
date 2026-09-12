import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors } from '../theme/theme';

const ThemeContext = createContext(null);

const THEME_KEY = 'themePreference';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') setTheme(stored);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const colors = theme === 'dark' ? darkColors : lightColors;

  const value = useMemo(() => ({ theme, colors, toggleTheme }), [theme, colors, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
