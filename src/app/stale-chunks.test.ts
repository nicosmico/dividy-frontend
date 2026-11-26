import { describe, expect, it, vi } from 'vitest';

import { isChunkLoadError, reloadForNewVersion } from './stale-chunks';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('isChunkLoadError', () => {
  it.each([
    // Chrome / Edge
    'Failed to fetch dynamically imported module: https://dividy.app/assets/balances-BOd7T05c.js',
    // Safari
    'Importing a module script failed.',
    // Firefox
    'error loading dynamically imported module: https://dividy.app/assets/balances-BOd7T05c.js',
    // Vite, a screen's stylesheet
    'Unable to preload CSS for /assets/index-abc.css',
  ])('reconoce «%s»', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it.each([
    new Error('Cannot read properties of undefined'),
    'Importing a module script failed.',
    null,
  ])('no confunde otros errores: %s', (error) => {
    expect(isChunkLoadError(error)).toBe(false);
  });
});

describe('reloadForNewVersion', () => {
  it('recarga la primera vez', () => {
    const reload = vi.fn();
    expect(
      reloadForNewVersion({ storage: memoryStorage(), now: 1_000_000, reload })
    ).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('no recarga en bucle: espera 10 segundos entre recargas', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadForNewVersion({ storage, now: 1_000_000, reload });
    expect(reloadForNewVersion({ storage, now: 1_009_999, reload })).toBe(
      false
    );
    expect(reloadForNewVersion({ storage, now: 1_010_000, reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('sin almacenamiento de sesión no recarga (no podría evitar el bucle)', () => {
    const reload = vi.fn();
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    };
    expect(reloadForNewVersion({ storage: broken, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
