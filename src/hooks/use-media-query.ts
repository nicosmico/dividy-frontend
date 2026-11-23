import { useSyncExternalStore } from 'react';

/**
 * Tracks a CSS media query. Without `matchMedia` (jsdom) it returns
 * `fallback`, which defaults to `true` (desktop behavior).
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () =>
      typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : fallback
  );
}
