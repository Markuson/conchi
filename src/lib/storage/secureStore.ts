import * as SecureStore from 'expo-secure-store';

/**
 * Typed wrapper around `expo-secure-store` (the device secure enclave / Keystore).
 * This module holds no business logic — callers decide what keys mean.
 */
export async function readSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function writeSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
