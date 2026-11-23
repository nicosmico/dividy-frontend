import { describe, expect, it } from 'vitest';
import { newId } from './id';

describe('newId', () => {
  it('genera ids no vacíos y seguros para URLs', () => {
    expect(newId()).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('no repite ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId));
    expect(ids.size).toBe(1000);
  });

  it('funciona sin crypto.randomUUID (contexto no seguro)', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });
    try {
      expect(newId()).toHaveLength(21);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        value: original,
        configurable: true,
      });
    }
  });
});
