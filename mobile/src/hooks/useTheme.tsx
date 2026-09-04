import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, getPalette, type Palette, type Scheme, type ThemeMode } from '@/core/theme';

export type { Palette, Scheme, ThemeMode };

const STORAGE_KEY = '@tmt/theme-mode';

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: Scheme;
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
}

const noopSetMode = () => {};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  scheme: 'dark',
  colors: darkPalette,
  setMode: noopSetMode,
});

function resolveScheme(mode: ThemeMode, systemScheme: string | null | undefined): Scheme {
  if (mode === 'system') return systemScheme === 'light' ? 'light' : 'dark';
  return mode;
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted || !isThemeMode(stored)) return;
        setModeState(stored);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme = resolveScheme(mode, systemScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors: getPalette(scheme), setMode }),
    [mode, scheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useThemeColors(): Palette {
  return useContext(ThemeContext).colors;
}
