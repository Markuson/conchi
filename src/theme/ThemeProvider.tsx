import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors } from './colors';
import type { ColorTokens } from './colors';
import { spacing } from './spacing';
import type { SpacingTokens } from './spacing';
import { typography } from './typography';
import type { Typography } from './typography';

export type ThemeMode = 'dark' | 'light';

export type Theme = {
  mode: ThemeMode;
  colors: ColorTokens;
  typography: Typography;
  spacing: SpacingTokens;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export type ThemeProviderProps = {
  children: React.ReactNode;
  /**
   * Force a mode, bypassing the device color scheme. Used only by the Storybook
   * decorator to render a specific mode regardless of the host browser's
   * `prefers-color-scheme`. Not intended for app-shell use.
   */
  mode?: ThemeMode;
};

/**
 * Theme context provider. Deliberately usable standalone — it is NOT mounted in
 * `App.tsx` by this story (Story 1.4 owns app-shell wiring); Storybook instantiates
 * it directly for isolated component rendering.
 */
export function ThemeProvider({ children, mode }: ThemeProviderProps): React.JSX.Element {
  const systemScheme = useColorScheme();
  // useColorScheme() returning null defaults to dark mode (DESIGN.md's stated default).
  const resolvedMode: ThemeMode = mode ?? (systemScheme === 'light' ? 'light' : 'dark');

  const theme = useMemo<Theme>(
    () => ({
      mode: resolvedMode,
      colors: resolvedMode === 'dark' ? darkColors : lightColors,
      typography,
      spacing,
    }),
    [resolvedMode],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Reads the current theme. Must be called within a `ThemeProvider`. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be called within a <ThemeProvider>.');
  }
  return theme;
}
