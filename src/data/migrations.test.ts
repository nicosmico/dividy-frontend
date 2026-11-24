import { describe, expect, it } from 'vitest';
import { makeGroup } from '@/domain/test-utils/fixtures';
import {
  emptyDocument,
  migrations,
  parseDocument,
  runMigrations,
} from './migrations';

describe('parseDocument', () => {
  it('lee un documento v3 válido', () => {
    const doc = { version: 3, groups: [makeGroup({ members: ['A'] })] };
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
      JSON.stringify({ version: 3, groups: [bad, good, 7] })
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
    ['versión futura', { version: 4, groups: [] }],
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
    expect(Object.keys(migrations)).toEqual(['1', '2']);
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

  it('capitaliza grupos, miembros y descripciones y sube hasta la v3', () => {
    const result = parseDocument(v1([lower()]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rejected).toEqual([]);
    expect(result.document.version).toBe(3);
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

describe('migración v2 -> v3 (avatares)', () => {
  const v2Member = (id: string, name: string) => ({ id, name });
  const v2Group = (memberCount: number) => {
    const base = makeGroup({ members: ['x', 'y'] });
    return {
      ...base,
      members: Array.from({ length: memberCount }, (_, i) =>
        v2Member(`m${i}`, `Miembro ${i}`)
      ),
      expenses: [],
      payments: [],
    };
  };
  const parseV2 = (groups: unknown[]) =>
    parseDocument(JSON.stringify({ version: 2, groups }));

  it('la semilla es el id y los colores van en orden de miembros', () => {
    const result = parseV2([v2Group(3)]);
    if (!result.ok) throw new Error('should parse');
    expect(result.rejected).toEqual([]);
    expect(result.document.version).toBe(3);
    expect(result.document.groups[0].members).toEqual([
      { id: 'm0', name: 'Miembro 0', avatar: { color: 0, seed: 'm0' } },
      { id: 'm1', name: 'Miembro 1', avatar: { color: 1, seed: 'm1' } },
      { id: 'm2', name: 'Miembro 2', avatar: { color: 2, seed: 'm2' } },
    ]);
  });

  it('no repite colores hasta 8 miembros y vuelve a empezar desde el 9.º', () => {
    const result = parseV2([v2Group(10)]);
    if (!result.ok) throw new Error('should parse');
    const colors = result.document.groups[0].members.map((m) => m.avatar.color);
    expect(colors).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0, 1]);
  });

  it('cada grupo cuenta sus colores por separado', () => {
    const a = { ...v2Group(2), id: 'a' };
    const b = { ...v2Group(2), id: 'b' };
    const result = parseV2([a, b]);
    if (!result.ok) throw new Error('should parse');
    expect(
      result.document.groups.map((g) => g.members.map((m) => m.avatar.color))
    ).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  it('no pierde datos: gastos, pagos, fechas y nombres quedan iguales', () => {
    const base = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        {
          id: 'e1',
          description: 'Pizza',
          amount: 1000,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
      payments: [{ id: 'p1', from: 'Beto', to: 'Ana', amount: 100 }],
    });
    const v2 = {
      ...base,
      members: base.members.map(({ id, name }) => ({ id, name })),
    };
    const result = parseV2([v2]);
    if (!result.ok) throw new Error('should parse');
    const [group] = result.document.groups;
    expect({
      ...group,
      members: group.members.map(({ id, name }) => ({ id, name })),
    }).toEqual(v2);
    expect(group.members.map((m) => m.avatar.seed)).toEqual(['Ana', 'Beto']);
  });

  it('un documento v2 vacío sube a v3', () => {
    const result = parseV2([]);
    expect(result).toEqual({
      ok: true,
      document: { version: 3, groups: [] },
      rejected: [],
    });
  });
});
