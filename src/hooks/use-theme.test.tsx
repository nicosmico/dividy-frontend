import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import indexHtml from '../../index.html?raw';
import { THEME_STORAGE_KEY, useTheme } from './use-theme';

/** A controllable `matchMedia` for `(prefers-color-scheme: dark)`. */
function mockSystemTheme(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return dark;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return {
    set(next: boolean) {
      dark = next;
      listeners.forEach((fn) => fn());
    },
    listeners,
  };
}

const isDark = () => document.documentElement.classList.contains('dark');

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="theme-color" content="#f4f7f2" media="(prefers-color-scheme: light)">' +
        '<meta name="theme-color" content="#0b1730" media="(prefers-color-scheme: dark)">'
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.remove());
  });

  const metaColors = () =>
    [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
      .map((meta) => meta.content)
      .join(',');

  it('empieza en "Sistema" y sigue al sistema claro', () => {
    mockSystemTheme(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current).toMatchObject({
      theme: 'system',
      resolvedTheme: 'light',
    });
    expect(isDark()).toBe(false);
  });

  it('en "Sistema" usa oscuro si el sistema es oscuro', () => {
    mockSystemTheme(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current).toMatchObject({
      theme: 'system',
      resolvedTheme: 'dark',
    });
    expect(isDark()).toBe(true);
  });

  it('reacciona en vivo cuando cambia el sistema', () => {
    const system = mockSystemTheme(false);
    const { result } = renderHook(() => useTheme());
    act(() => system.set(true));
    expect(result.current.resolvedTheme).toBe('dark');
    expect(isDark()).toBe(true);
    act(() => system.set(false));
    expect(result.current.resolvedTheme).toBe('light');
    expect(isDark()).toBe(false);
  });

  it('elegir un tema lo aplica, lo guarda y manda sobre el sistema', () => {
    const system = mockSystemTheme(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme('dark'));
    expect(result.current).toMatchObject({
      theme: 'dark',
      resolvedTheme: 'dark',
    });
    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    // The system changing does not matter once the user chose.
    act(() => system.set(true));
    act(() => system.set(false));
    expect(result.current.resolvedTheme).toBe('dark');

    act(() => result.current.setTheme('light'));
    expect(isDark()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('volver a "Sistema" borra lo guardado y vuelve a seguir al sistema', () => {
    mockSystemTheme(true);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(isDark()).toBe(false);

    act(() => result.current.setTheme('system'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(result.current).toMatchObject({
      theme: 'system',
      resolvedTheme: 'dark',
    });
    expect(isDark()).toBe(true);
  });

  it('lee la elección guardada al montar', () => {
    mockSystemTheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(isDark()).toBe(true);
  });

  it('ignora un valor guardado inválido', () => {
    mockSystemTheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'azul');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('sigue funcionando (sin guardar) si localStorage falla', () => {
    mockSystemTheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');

    act(() => result.current.setTheme('dark'));
    expect(result.current).toMatchObject({
      theme: 'dark',
      resolvedTheme: 'dark',
    });
    expect(isDark()).toBe(true);

    // Storage back: a successful write replaces the in-memory choice.
    vi.restoreAllMocks();
    act(() => result.current.setTheme('system'));
    expect(result.current.theme).toBe('system');
  });

  it('sin matchMedia (navegadores viejos) cae a claro', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('se sincroniza con otra pestaña (evento storage)', () => {
    mockSystemTheme(false);
    const { result } = renderHook(() => useTheme());
    act(() => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY })
      );
    });
    expect(result.current.theme).toBe('dark');
    expect(isDark()).toBe(true);
  });

  it('actualiza theme-color: el del sistema en "Sistema" y el elegido si no', () => {
    mockSystemTheme(false);
    const { result } = renderHook(() => useTheme());
    expect(metaColors()).toBe('#f4f7f2,#0b1730');
    act(() => result.current.setTheme('dark'));
    expect(metaColors()).toBe('#0b1730,#0b1730');
    act(() => result.current.setTheme('system'));
    expect(metaColors()).toBe('#f4f7f2,#0b1730');
  });

  it('deja de escuchar al sistema al desmontar', () => {
    const system = mockSystemTheme(false);
    const { unmount } = renderHook(() => useTheme());
    expect(system.listeners.size).toBe(1);
    unmount();
    expect(system.listeners.size).toBe(0);
  });

  it('el script de index.html usa la misma clave de almacenamiento', () => {
    expect(indexHtml).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
  });
});
