import { beforeEach, describe, expect, it } from 'vitest';
import { getGroupIssues } from '@/domain';
import {
  LEGACY_BILLS_KEY,
  LEGACY_MEMBERS_KEY,
  migrateLegacyData,
} from './legacy-migration';
import {
  LocalStorageGroupRepository,
  STORAGE_KEY,
} from './local-storage-group-repository';

const NOW = '2026-05-01T10:00:00.000Z';

/** Data as the old app saved it with zustand/persist. */
const oldMembers = JSON.stringify({
  state: {
    members: {
      m1: {
        id: 'm1',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '+56 9 1111 1111',
        picture: 'https://api.dicebear.com/x/lorelei/svg?seed=Ana',
      },
      m2: {
        id: 'm2',
        name: 'Beto',
        picture: 'https://api.dicebear.com/x/lorelei/svg?seed=Beto',
      },
      m3: {
        id: 'm3',
        name: 'Cami',
        picture: 'https://api.dicebear.com/x/lorelei/svg?seed=Cami',
      },
    },
    membersOrder: ['m1', 'm2', 'm3'],
  },
  version: 0,
});
const oldBills = JSON.stringify({
  state: {
    bills: {
      b1: {
        id: 'b1',
        name: 'Pizza',
        total: 10000,
        paidBy: 'm1',
        members: ['m1', 'm2', 'm3'],
      },
      b2: {
        id: 'b2',
        name: 'Bebidas',
        total: 2500.6,
        paidBy: 'm2',
        members: ['m2', 'm3'],
      },
    },
    billsOrder: ['b1', 'b2'],
  },
  version: 0,
});

const input = (membersStore: string | null, billsStore: string | null) => {
  let n = 0;
  return { membersStore, billsStore, newId: () => `n${++n}`, now: NOW };
};
const legacy = (
  members: Record<string, unknown>,
  bills: Record<string, unknown> = {}
) => ({
  members: JSON.stringify({
    state: { members, membersOrder: Object.keys(members) },
    version: 0,
  }),
  bills: JSON.stringify({
    state: { bills, billsOrder: Object.keys(bills) },
    version: 0,
  }),
});
const mem = (id: string, name: string) => ({ id, name, picture: '' });
const bill = (over: Record<string, unknown>) => ({
  id: 'b',
  name: 'X',
  total: 100,
  paidBy: 'a',
  members: ['a'],
  ...over,
});

describe('migrateLegacyData', () => {
  it('convierte datos antiguos reales en el grupo "Mi grupo"', () => {
    const group = migrateLegacyData(input(oldMembers, oldBills))!;
    expect(group).toEqual({
      id: 'n1',
      name: 'Mi grupo',
      currency: 'CLP',
      members: [
        { id: 'm1', name: 'Ana' },
        { id: 'm2', name: 'Beto' },
        { id: 'm3', name: 'Cami' },
      ],
      expenses: [
        {
          id: 'n2',
          description: 'Pizza',
          amount: 10000,
          payerId: 'm1',
          split: { type: 'equal', participantIds: ['m1', 'm2', 'm3'] },
          date: '2026-05-01',
          createdAt: NOW,
        },
        {
          id: 'n3',
          description: 'Bebidas',
          amount: 2501,
          payerId: 'm2',
          split: { type: 'equal', participantIds: ['m2', 'm3'] },
          date: '2026-05-01',
          createdAt: NOW,
        },
      ],
      payments: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(getGroupIssues(group)).toEqual([]);
  });

  it('respeta membersOrder y billsOrder aunque el record venga en otro orden', () => {
    const members = JSON.stringify({
      state: {
        members: { b: mem('b', 'Beto'), a: mem('a', 'Ana') },
        membersOrder: ['a', 'b'],
      },
      version: 0,
    });
    const group = migrateLegacyData(input(members, null))!;
    expect(group.members.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('agrega los miembros que faltan en el orden y omite ids del orden que no existen', () => {
    const members = JSON.stringify({
      state: {
        members: { a: mem('a', 'Ana'), b: mem('b', 'Beto') },
        membersOrder: ['ghost', 'b'],
      },
      version: 0,
    });
    expect(
      migrateLegacyData(input(members, null))!.members.map((m) => m.id)
    ).toEqual(['b', 'a']);
  });

  it('capitaliza nombres de miembros y descripciones de gastos', () => {
    const { members, bills } = legacy(
      { a: mem('a', 'ana'), b: mem('b', 'beto') },
      { x: bill({ name: 'pizza', members: ['a', 'b'] }) }
    );
    const group = migrateLegacyData(input(members, bills))!;
    expect(group.members.map((m) => m.name)).toEqual(['Ana', 'Beto']);
    expect(group.expenses[0].description).toBe('Pizza');
  });

  it('agrega sufijo " (2)" a nombres repetidos, sin distinguir mayúsculas', () => {
    const { members } = legacy({
      a: mem('a', 'Ana'),
      b: mem('b', 'ana'),
      c: mem('c', 'Ana '),
    });
    const group = migrateLegacyData(input(members, null))!;
    expect(group.members.map((m) => m.name)).toEqual([
      'Ana',
      'Ana (2)',
      'Ana (3)',
    ]);
  });

  it('corrige nombres vacíos o demasiado largos', () => {
    const { members } = legacy({
      a: mem('a', '  '),
      b: mem('b', 'x'.repeat(60)),
      c: mem('c', 'x'.repeat(60)),
    });
    const group = migrateLegacyData(input(members, null))!;
    expect(group.members[0].name).toBe('Sin nombre');
    expect(group.members[1].name).toHaveLength(40);
    expect(group.members[2].name).toHaveLength(40);
    expect(group.members[2].name.endsWith(' (2)')).toBe(true);
    expect(getGroupIssues(group)).toEqual([]);
  });

  it('filtra participantes inexistentes y duplicados', () => {
    const l = legacy(
      { a: mem('a', 'Ana'), b: mem('b', 'Beto') },
      { x: bill({ members: ['a', 'ghost', 'a', 'b'] }) }
    );
    const group = migrateLegacyData(input(l.members, l.bills))!;
    expect(group.expenses[0].split.participantIds).toEqual(['a', 'b']);
  });

  it.each([
    ['sin participantes válidos', { members: ['ghost'] }],
    ['sin participantes', { members: [] }],
    ['pagador inexistente', { paidBy: 'ghost' }],
    ['monto 0', { total: 0 }],
    ['monto negativo', { total: -5 }],
    ['monto que redondea a 0', { total: 0.3 }],
    ['monto NaN', { total: 'abc' }],
    ['monto demasiado grande', { total: 5_000_000_000 }],
  ])('descarta el gasto %s', (_n, over) => {
    const l = legacy(
      { a: mem('a', 'Ana') },
      { x: bill(over), ok: bill({ id: 'ok', name: 'Bueno' }) }
    );
    const group = migrateLegacyData(input(l.members, l.bills))!;
    expect(group.expenses.map((e) => e.description)).toEqual(['Bueno']);
  });

  it('acepta montos como texto numérico y corrige descripciones vacías o largas', () => {
    const l = legacy(
      { a: mem('a', 'Ana') },
      {
        x: bill({ total: '1500', name: '' }),
        y: bill({ id: 'y', name: 'd'.repeat(100) }),
      }
    );
    const group = migrateLegacyData(input(l.members, l.bills))!;
    expect(group.expenses.map((e) => [e.description.length, e.amount])).toEqual(
      [
        [5, 1500],
        [80, 100],
      ]
    );
    expect(group.expenses[0].description).toBe('Gasto');
  });

  it('migra los miembros aunque no existan gastos', () => {
    expect(migrateLegacyData(input(oldMembers, null))!.expenses).toEqual([]);
  });

  it.each([
    ['sin datos', null, null],
    ['sin miembros', legacy({}).members, oldBills],
    ['JSON inválido', '{bad', oldBills],
    ['forma desconocida', JSON.stringify({ foo: 1 }), null],
  ])('devuelve null %s', (_n, members, bills) => {
    expect(migrateLegacyData(input(members, bills))).toBeNull();
  });

  it('ignora un bills-store ilegible y migra sólo los miembros', () => {
    expect(migrateLegacyData(input(oldMembers, '{bad'))!.expenses).toEqual([]);
  });
});

describe('migración perezosa en LocalStorageGroupRepository', () => {
  beforeEach(() => window.localStorage.clear());
  const makeRepo = () => {
    let n = 0;
    return new LocalStorageGroupRepository({
      newId: () => `id${++n}`,
      now: () => NOW,
    });
  };

  it('migra en la primera operación y borra las claves antiguas después de guardar', async () => {
    window.localStorage.setItem(LEGACY_MEMBERS_KEY, oldMembers);
    window.localStorage.setItem(LEGACY_BILLS_KEY, oldBills);
    const groups = await makeRepo().list();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Mi grupo');
    expect(groups[0].expenses).toHaveLength(2);
    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).groups
    ).toHaveLength(1);
    expect(window.localStorage.getItem(LEGACY_MEMBERS_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_BILLS_KEY)).toBeNull();
  });

  it('migra aunque sólo exista una de las dos claves', async () => {
    window.localStorage.setItem(LEGACY_MEMBERS_KEY, oldMembers);
    expect(await makeRepo().list()).toHaveLength(1);
    expect(window.localStorage.getItem(LEGACY_MEMBERS_KEY)).toBeNull();
  });

  it('no migra dos veces: tras borrar el grupo migrado no reaparece', async () => {
    window.localStorage.setItem(LEGACY_MEMBERS_KEY, oldMembers);
    const repo = makeRepo();
    const [group] = await repo.list();
    await repo.delete(group.id);
    expect(await makeRepo().list()).toEqual([]);
  });

  it('no toca los datos antiguos si ya existe el documento nuevo', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, groups: [] })
    );
    window.localStorage.setItem(LEGACY_MEMBERS_KEY, oldMembers);
    expect(await makeRepo().list()).toEqual([]);
    expect(window.localStorage.getItem(LEGACY_MEMBERS_KEY)).toBe(oldMembers);
  });

  it('deja las claves antiguas intactas si no hay nada migrable', async () => {
    window.localStorage.setItem(LEGACY_MEMBERS_KEY, '{bad');
    expect(await makeRepo().list()).toEqual([]);
    expect(window.localStorage.getItem(LEGACY_MEMBERS_KEY)).toBe('{bad');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
