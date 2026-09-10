import { create } from 'zustand';

import { getString, setString } from '../../lib/storage/mmkv';

/**
 * Settings slice. `webhookUrl` and `theme` hydrate from the shared MMKV
 * `storage` wrapper at store creation and persist back to it as a side effect
 * of their setters (Story 1.5). The auth secret is deliberately absent from
 * this store — it lives in `expo-secure-store` exclusively (AD-5), never here
 * and never in MMKV.
 */
export type Theme = 'light' | 'dark' | 'system';

const WEBHOOK_URL_KEY = 'settings.webhookUrl';
const THEME_KEY = 'settings.theme';

function isTheme(value: string | undefined): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * These hydration reads run at module-evaluation time (see `create(...)`
 * below), not inside any component — an uncaught throw here (e.g. a
 * corrupted MMKV store) would crash the entire app at import time, not just
 * this screen. Guarded so a broken store degrades to the same defaults as a
 * first launch instead.
 */
function safeGetString(key: string): string | undefined {
  try {
    return getString(key);
  } catch {
    return undefined;
  }
}

type SettingsState = {
  webhookUrl: string;
  theme: Theme;
  setWebhookUrl: (webhookUrl: string) => void;
  setTheme: (theme: Theme) => void;
};

const storedWebhookUrl = safeGetString(WEBHOOK_URL_KEY);
const storedTheme = safeGetString(THEME_KEY);

export const useSettingsStore = create<SettingsState>((set) => ({
  webhookUrl: storedWebhookUrl ?? '',
  theme: isTheme(storedTheme) ? storedTheme : 'system',
  setWebhookUrl: (webhookUrl) => {
    setString(WEBHOOK_URL_KEY, webhookUrl);
    set({ webhookUrl });
  },
  setTheme: (theme) => {
    setString(THEME_KEY, theme);
    set({ theme });
  },
}));
