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
      rejected: [],
    });
  });

  it('un documento vacío es válido', () => {
    expect(parseDocument(JSON.stringify(emptyDocument()))).toEqual({
      ok: true,
      document: emptyDocument(),
      rejected: [],
    });
  });

  it('valida por grupo: devuelve los válidos y reporta los inválidos', () => {
    const good = makeGroup({ members: ['A'] });
    const bad = {
      ...good,
      id: 'bad',
      members: [],
      expenses: [{ ...good, id: 'x' }],
    };
    const result = parseDocument(
      JSON.stringify({ version: 1, groups: [bad, good, 7] })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.groups).toEqual([good]);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0].raw).toEqual(bad);
    expect(result.rejected[1].raw).toBe(7);
    expect(result.rejected[0].reason).toEqual(expect.any(String));
  });

  it('un documento con grupos que no son lista es corrupto', () => {
    expect(parseDocument('{"version":1,"groups":"x"}').ok).toBe(false);
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
