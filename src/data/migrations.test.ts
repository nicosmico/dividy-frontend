import { describe, expect, it } from 'vitest';
import { makeGroup } from '@/domain/test-utils/fixtures';
import {
  emptyDocument,
  migrations,
  parseDocument,
  runMigrations,
} from './migrations';

describe('parseDocument', () => {
  it('lee un documento v2 válido', () => {
    const doc = { version: 2, groups: [makeGroup({ members: ['A'] })] };
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
      JSON.stringify({ version: 2, groups: [bad, good, 7] })
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
    ['versión futura', { version: 3, groups: [] }],
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

  it('la tabla real cubre cada versión anterior a la actual', () => {
    expect(Object.keys(migrations)).toEqual(['1']);
  });
});

describe('migración v1 -> v2 (mayúscula inicial)', () => {
  const v1 = (groups: unknown[]) => JSON.stringify({ version: 1, groups });
  const lower = () => {
    const g = makeGroup({
      name: 'viaje al sur',
      members: ['ana', 'beto'],
      expenses: [
        {
          id: 'e1',
          description: 'pizza',
          amount: 1000,
          payer: 'ana',
          among: ['ana', 'beto'],
        },
      ],
      payments: [{ id: 'p1', from: 'beto', to: 'ana', amount: 100 }],
    });
    return g;
  };

  it('capitaliza grupos, miembros y descripciones y sube a la v2', () => {
    const result = parseDocument(v1([lower()]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rejected).toEqual([]);
    expect(result.document.version).toBe(2);
    const [group] = result.document.groups;
    expect(group.name).toBe('Viaje al sur');
    expect(group.members.map((m) => m.name)).toEqual(['Ana', 'Beto']);
    expect(group.expenses[0].description).toBe('Pizza');
  });

  it('no toca nada más: ids, montos, fechas, pagos ni el resto del texto', () => {
    const original = {
      ...lower(),
      name: 'iPhone ñandú',
    };
    const result = parseDocument(v1([original]));
    if (!result.ok) throw new Error('should parse');
    const [group] = result.document.groups;
    expect(group.name).toBe('IPhone ñandú');
    expect(group.payments).toEqual(original.payments);
    expect(group.expenses[0]).toEqual({
      ...original.expenses[0],
      description: 'Pizza',
    });
    expect(group.members.map((m) => m.id)).toEqual(
      original.members.map((m) => m.id)
    );
    expect(group.updatedAt).toBe(original.updatedAt);
  });

  it('deja igual lo que no empieza con letra y lo que ya tiene mayúscula', () => {
    const g = makeGroup({ name: '123 completos', members: ['Ana'] });
    const result = parseDocument(v1([g]));
    if (!result.ok) throw new Error('should parse');
    expect(result.document.groups).toEqual([g]);
  });

  it('si capitalizar chocara con otro nombre, conserva el original (sin perder datos)', () => {
    const base = makeGroup({ members: ['x', 'y'] });
    // Cannot come from valid v1 data (names were unique ignoring case), so the
    // clash is built by hand: "ana" would become "Ana", equal to the kept "Ana".
    const clash = {
      ...base,
      members: [
        { id: 'm1', name: 'Ana' },
        { id: 'm2', name: 'ana' },
      ],
    };
    const migrated = runMigrations(JSON.parse(v1([clash])), 1, 2);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const groups = (migrated.value as { groups: (typeof clash)[] }).groups;
    expect(groups[0].members.map((m) => m.name)).toEqual(['Ana', 'ana']);
  });

  it('un documento v1 corrupto o vacío sigue siendo un caso controlado', () => {
    expect(parseDocument(v1([])).ok).toBe(true);
    expect(parseDocument('{"version":1,"groups":"x"}').ok).toBe(false);
  });
});
