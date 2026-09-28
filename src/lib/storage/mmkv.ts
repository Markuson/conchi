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

/**
 * JSON-serialized structured-data read/write, layered on `getString`/
 * `setString` rather than a separate MMKV API — there isn't one. Returns
 * `undefined` for a missing key or a value that fails to parse as JSON
 * (e.g. a corrupted/partial write) so a caller's hydration guard treats both
 * the same as "no cache" instead of throwing.
 */
export function getObject<T>(key: string): T | undefined {
  const raw = storage.getString(key);
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function setObject<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}
