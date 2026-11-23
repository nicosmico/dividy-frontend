import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Same key as the inline script in `index.html`, which runs before React. */
export const THEME_STORAGE_KEY = 'dividy-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_QUERY).matches
  );
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

/**
 * Puts the theme in the document: the `dark` class on <html> and the browser
 * bar color. The `theme-color` metas in index.html carry a `media` attribute,
 * which follows the system; when the user chose a theme every meta takes the
 * color of that theme, and "Sistema" restores each one. The colors are read
 * from the metas themselves (`data-system-color` keeps the original).
 */
function applyToDocument(preference: ThemePreference, resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  const metas = [
    ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  ];
  for (const meta of metas) meta.dataset.systemColor ??= meta.content;
  const colorOf = (scheme: ResolvedTheme) =>
    metas.find(
      (meta) =>
        (meta.getAttribute('media')?.includes('dark') ? 'dark' : 'light') ===
        scheme
    )?.dataset.systemColor;
  for (const meta of metas) {
    meta.content =
      (preference === 'system'
        ? meta.dataset.systemColor
        : colorOf(resolved)) ?? meta.content;
  }
}

interface Snapshot {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

/** Choice made while localStorage was unavailable (kept until reload). */
let memoryPreference: ThemePreference | undefined;
let snapshot: Snapshot | undefined;
const listeners = new Set<() => void>();
let teardown: (() => void) | undefined;

function compute(): Snapshot {
  const preference = memoryPreference ?? readStoredPreference();
  return { preference, resolvedTheme: resolve(preference) };
}

/** Same object while nothing changed, as `useSyncExternalStore` requires. */
function getSnapshot(): Snapshot {
  const next = compute();
  if (
    snapshot?.preference !== next.preference ||
    snapshot.resolvedTheme !== next.resolvedTheme
  ) {
    snapshot = next;
  }
  return snapshot;
}

/** Re-applies the theme to the document and tells subscribers. */
function refresh() {
  const { preference, resolvedTheme } = getSnapshot();
  applyToDocument(preference, resolvedTheme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    // "System" follows the OS live; `storage` keeps other tabs in sync.
    const media =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(DARK_QUERY)
        : undefined;
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) refresh();
    };
    media?.addEventListener('change', refresh);
    window.addEventListener('storage', onStorage);
    teardown = () => {
      media?.removeEventListener('change', refresh);
      window.removeEventListener('storage', onStorage);
    };
    // Storage or system may have changed since the page was loaded.
    applyToDocument(getSnapshot().preference, getSnapshot().resolvedTheme);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      teardown?.();
      teardown = undefined;
    }
  };
}

function setTheme(preference: ThemePreference) {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
    memoryPreference = undefined;
  } catch {
    // Storage blocked: the choice still applies until the page is closed.
    memoryPreference = preference;
  }
  refresh();
}

/**
 * Theme preference ("Sistema", "Claro" or "Oscuro") and the theme in effect.
 * The choice is saved in localStorage and applied as the `dark` class on
 * <html>; "Sistema" follows `prefers-color-scheme` live.
 */
export function useTheme() {
  const { preference, resolvedTheme } = useSyncExternalStore(
    subscribe,
    getSnapshot
  );
  return { theme: preference, resolvedTheme, setTheme };
}
