import * as SecureStore from 'expo-secure-store';

/**
 * Typed wrapper around `expo-secure-store` (the device secure enclave / Keystore).
 * This module holds no business logic — callers decide what keys mean.
 */

/**
 * The auth secret is intentionally never stored in `settingsStore`/MMKV
 * (AD-5) — it lives in `expo-secure-store` exclusively. Shared here (rather
 * than a private local const per call site) so `SettingsScreen` and Story
 * 1.6's tracer-bullet flow read/write the exact same key.
 */
export const AUTH_SECRET_KEY = 'settings.authSecret';

export async function readSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function writeSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
