import { describe, expect, it } from 'vitest';
import { makeGroup } from '@/domain/test-utils/fixtures';
import {
  emptyDocument,
  migrations,
  parseDocument,
  runMigrations,
} from './migrations';

describe('parseDocument', () => {
  it('lee un documento v1 válido', () => {
    const doc = { version: 1, groups: [makeGroup({ members: ['A'] })] };
    expect(parseDocument(JSON.stringify(doc))).toEqual({
      ok: true,
      document: doc,
    });
  });

  it('un documento vacío es válido', () => {
    expect(parseDocument(JSON.stringify(emptyDocument()))).toEqual({
      ok: true,
      document: emptyDocument(),
    });
  });

  it.each([
    ['versión 0', { version: 0, groups: [] }],
    ['versión futura', { version: 2, groups: [] }],
    ['versión fraccionaria', { version: 1.5, groups: [] }],
  ])('rechaza %s', (_n, doc) => {
    expect(parseDocument(JSON.stringify(doc)).ok).toBe(false);
  });
});

describe('runMigrations', () => {
  const table = {
    1: (d: unknown) => ({ ...(d as object), a: 1 }),
    2: (d: unknown) => ({ ...(d as object), b: 2 }),
  };

  it('aplica en orden las migraciones entre la versión guardada y la objetivo', () => {
    expect(runMigrations({}, 1, 3, table)).toEqual({
      ok: true,
      value: { a: 1, b: 2 },
    });
    expect(runMigrations({}, 2, 3, table)).toEqual({
      ok: true,
      value: { b: 2 },
    });
  });

  it('no hace nada si ya está en la versión objetivo', () => {
    expect(runMigrations({ x: 1 }, 3, 3, table)).toEqual({
      ok: true,
      value: { x: 1 },
    });
  });

  it('falla si falta una migración intermedia', () => {
    expect(runMigrations({}, 1, 4, table)).toEqual({
      ok: false,
      reason: 'no migration from v3',
    });
  });

  it('la tabla real está vacía mientras exista sólo la v1', () => {
    expect(migrations).toEqual({});
  });
});
