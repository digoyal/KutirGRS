/**
 * Read-once sessionStorage helpers for list-page filter restore after
 * navigating to add/detail and back. Matches the existing per-page pattern:
 * read + removeItem on first access, write via saveFilters() before navigate.
 *
 * Prefer `usePersistedFilterRestore` inside the page component so restore
 * works on SPA remount. Module-level consume ran only once per JS load and
 * never saw filters saved after first import (bug on Visits/Progress/Kutirs/
 * ExamCenters).
 */

import { useRef } from "react";

export function consumePersistedFilters<T>(storageKey: string): T | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    sessionStorage.removeItem(storageKey);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function persistFilters(storageKey: string, value: unknown): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Consume sessionStorage once per component mount (for useState init). */
export function usePersistedFilterRestore<T>(storageKey: string): T | null {
  const ref = useRef<T | null | undefined>(undefined);
  if (ref.current === undefined) {
    ref.current = consumePersistedFilters<T>(storageKey);
  }
  return ref.current;
}
