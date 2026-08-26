import { MMKV } from 'react-native-mmkv';

/**
 * Single shared MMKV instance for the app. This module only wraps the raw
 * instance with typed helpers — it holds no business logic and no feature-specific
 * keys (those live in the feature/store module that owns them).
 */
export const storage = new MMKV({ id: 'conchi-storage' });

export function getString(key: string): string | undefined {
  return storage.getString(key);
}

export function setString(key: string, value: string): void {
  storage.set(key, value);
}

export function getBoolean(key: string): boolean | undefined {
  return storage.getBoolean(key);
}

export function setBoolean(key: string, value: boolean): void {
  storage.set(key, value);
}

export function getNumber(key: string): number | undefined {
  return storage.getNumber(key);
}

export function setNumber(key: string, value: number): void {
  storage.set(key, value);
}

export function deleteKey(key: string): void {
  storage.delete(key);
}
