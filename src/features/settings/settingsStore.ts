import { create } from 'zustand';

/**
 * Placeholder settings slice for the project skeleton.
 *
 * `webhookUrl` and `theme` are in-memory only at this stage — persistence to
 * MMKV / expo-secure-store is wired up in Story 1.5, not here.
 */
export type Theme = 'light' | 'dark' | 'system';

type SettingsState = {
  webhookUrl: string;
  theme: Theme;
  setWebhookUrl: (webhookUrl: string) => void;
  setTheme: (theme: Theme) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  webhookUrl: '',
  theme: 'system',
  setWebhookUrl: (webhookUrl) => set({ webhookUrl }),
  setTheme: (theme) => set({ theme }),
}));
