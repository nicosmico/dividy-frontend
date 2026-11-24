import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeBalances } from './balances';
import {
  createSnapshot,
  decideSnapshotSave,
  fromCompactSnapshotV1,
  getSnapshotIssues,
  snapshotToGroup,
  toCompactSnapshotV1,
  type CompactSnapshotV1,
  type Snapshot,
} from './snapshot';
import { groupArb } from './test-utils/arbitraries';
import { makeGroup } from './test-utils/fixtures';
import { suggestTransfers } from './transfers';
import type { Group } from './types';

const TAKEN = '2026-11-24T13:42:10.123Z';

const sample = (): Group => ({
  ...makeGroup({
    name: 'Viaje',
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        description: 'Cabaña',
        amount: 90_000,
        payer: 'Carla',
        among: ['Carla', 'Ana', 'Beto'],
        date: '2026-03-10',
        createdAt: '2026-03-10T15:00:00.000Z',
      },
      {
        description: 'Pan',
        amount: 1_001,
        payer: 'Ana',
        among: ['Beto', 'Ana'],
        date: '2026-03-11',
        createdAt: '2026-03-11T09:30:00.000Z',
      },
    ],
    payments: [
      {
        from: 'Beto',
        to: 'Carla',
        amount: 5_000,
        date: '2026-03-12',
        createdAt: '2026-03-12T10:00:00.000Z',
      },
    ],
  }),
  id: 'group-xyz',
});

describe('createSnapshot', () => {
  it('copia el grupo con ids por posición y solo los datos acordados', () => {
    const snapshot = createSnapshot(sample(), TAKEN);
    expect(snapshot.sourceGroupId).toBe('group-xyz');
    expect(snapshot.takenAt).toBe(TAKEN);
    expect(snapshot.name).toBe('Viaje');
    expect(snapshot.members.map((m) => [m.id, m.name])).toEqual([
      ['m0', 'Ana'],
      ['m1', 'Beto'],
      ['m2', 'Carla'],
    ]);
    expect(snapshot.expenses[0]).toMatchObject({
      id: 'e0',
      payerId: 'm2',
      split: { type: 'equal', participantIds: ['m0', 'm1', 'm2'] },
    });
    expect(snapshot.payments[0]).toMatchObject({
      id: 'p0',
      fromId: 'm1',
      toId: 'm2',
    });
    expect(Object.keys(snapshot).sort()).toEqual([
      'expenses',
      'members',
      'name',
      'payments',
      'sourceGroupId',
      'takenAt',
    ]);
  });

  it('conserva el avatar (color y semilla) de cada miembro', () => {
    const group = sample();
    group.members[1].avatar = { color: 5, seed: 'otra-cara' };
    expect(createSnapshot(group, TAKEN).members[1].avatar).toEqual({
      color: 5,
      seed: 'otra-cara',
    });
  });

  it('ordena a los participantes por posición de miembro', () => {
    const snapshot = createSnapshot(sample(), TAKEN);
    expect(snapshot.expenses[1].split.participantIds).toEqual(['m0', 'm1']);
  });

  it('escribe las fechas en forma canónica', () => {
    const group = sample();
    group.expenses[0].createdAt = '2026-03-10T12:00:00-03:00';
    const snapshot = createSnapshot(group, '2026-11-24T10:42:10.123-03:00');
    expect(snapshot.takenAt).toBe(TAKEN);
    expect(snapshot.expenses[0].createdAt).toBe('2026-03-10T15:00:00.000Z');
  });

  it('no altera el grupo original', () => {
    const group = sample();
    const before = structuredClone(group);
    createSnapshot(group, TAKEN);
    expect(group).toEqual(before);
  });
});

describe('snapshotToGroup', () => {
  it('es un grupo válido con el id del grupo de origen', () => {
    const snapshot = createSnapshot(sample(), TAKEN);
    const group = snapshotToGroup(snapshot);
    expect(group.id).toBe('group-xyz');
    expect(group.updatedAt).toBe(TAKEN);
    expect(getSnapshotIssues(snapshot)).toEqual([]);
  });

  it('da los mismos saldos y transferencias que el grupo original', () => {
    const original = sample();
    const copy = snapshotToGroup(createSnapshot(original, TAKEN));
    expect(computeBalances(copy).map((b) => b.balance)).toEqual(
      computeBalances(original).map((b) => b.balance)
    );
    const named = (g: Group) =>
      suggestTransfers(g).map((t) => [
        g.members.find((m) => m.id === t.fromId)?.name,
        g.members.find((m) => m.id === t.toId)?.name,
        t.amount,
      ]);
    expect(named(copy)).toEqual(named(original));
  });
});

describe('getSnapshotIssues', () => {
  const base = () => createSnapshot(sample(), TAKEN);

  it.each<[string, (s: Snapshot) => void]>([
    ['sourceGroupId vacío', (s) => (s.sourceGroupId = '')],
    ['takenAt inválido', (s) => (s.takenAt = 'ayer')],
    ['pagador inexistente', (s) => (s.expenses[0].payerId = 'm9')],
    ['monto inválido', (s) => (s.expenses[0].amount = 0)],
    ['pago a uno mismo', (s) => (s.payments[0].toId = s.payments[0].fromId)],
    ['createdAt inválido de un gasto', (s) => (s.expenses[0].createdAt = 'x')],
    ['createdAt inválido de un pago', (s) => (s.payments[0].createdAt = 'x')],
  ])('detecta %s', (_name, mutate) => {
    const snapshot = base();
    mutate(snapshot);
    expect(getSnapshotIssues(snapshot).length).toBeGreaterThan(0);
  });
});

describe('decideSnapshotSave', () => {
  const at = (takenAt: string) => createSnapshot(sample(), takenAt);

  it.each([
    ['no hay nada guardado', null, '2026-11-24T10:00:00.000Z', 'save'],
    [
      'llega uno más nuevo',
      '2026-11-24T10:00:00.000Z',
      '2026-11-24T10:00:01.000Z',
      'replace',
    ],
    [
      'llega uno más viejo',
      '2026-11-24T10:00:00.000Z',
      '2026-11-23T10:00:00.000Z',
      'older',
    ],
    [
      'llega la misma captura',
      '2026-11-24T10:00:00.000Z',
      '2026-11-24T10:00:00.000Z',
      'same',
    ],
    [
      'la diferencia es de un milisegundo',
      '2026-11-24T10:00:00.001Z',
      '2026-11-24T10:00:00.000Z',
      'older',
    ],
  ])('%s', (_name, saved, incoming, expected) => {
    expect(decideSnapshotSave(saved ? at(saved) : null, at(incoming))).toBe(
      expected
    );
  });
});

describe('formato compacto v1', () => {
  const compact = (): CompactSnapshotV1 =>
    toCompactSnapshotV1(createSnapshot(sample(), TAKEN));

  it('ida y vuelta devuelve la misma captura', () => {
    const snapshot = createSnapshot(sample(), TAKEN);
    expect(fromCompactSnapshotV1(toCompactSnapshotV1(snapshot))).toEqual({
      ok: true,
      value: snapshot,
    });
  });

  it('usa arreglos por posición, sin ids ni claves', () => {
    const data = compact();
    expect(data[0]).toBe('group-xyz');
    expect(data[1]).toBe(Date.parse(TAKEN));
    expect(data[3][2]).toEqual(['Carla', 2, 'Carla']);
    expect(data[4][0]).toEqual([
      'Cabaña',
      90_000,
      2,
      [0, 1, 2],
      '2026-03-10',
      Date.parse('2026-03-10T15:00:00.000Z'),
    ]);
    expect(data[5][0][0]).toBe(1);
  });

  it.each<[string, (c: CompactSnapshotV1) => void]>([
    ['pagador fuera de rango', (c) => (c[4][0][2] = 7)],
    ['pagador negativo', (c) => (c[4][0][2] = -1)],
    ['pagador fraccionario', (c) => (c[4][0][2] = 0.5)],
    ['participante fuera de rango', (c) => (c[4][0][3] = [0, 9])],
    ['pago con miembro inexistente', (c) => (c[5][0][1] = 3)],
    ['fecha de captura imposible', (c) => (c[1] = 9e15)],
    ['fecha de gasto no finita', (c) => (c[4][0][5] = Infinity)],
    ['nombre de grupo vacío', (c) => (c[2] = '')],
    ['miembros repetidos', (c) => (c[3][1][0] = 'Ana')],
    ['color de avatar inválido', (c) => (c[3][0][1] = 12)],
    ['monto negativo', (c) => (c[4][1][1] = -5)],
    ['participantes repetidos', (c) => (c[4][0][3] = [1, 1])],
  ])('rechaza %s con un error en español', (_name, mutate) => {
    const data = compact();
    mutate(data);
    const result = fromCompactSnapshotV1(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_snapshot');
      expect(result.error.message).toMatch(/link/);
    }
  });
});

describe('propiedades de la captura', () => {
  const groupAndTime = fc.record({
    group: groupArb({ maxMembers: 10, maxExpenses: 20, maxPayments: 8 }),
    takenAt: fc
      .integer({ min: Date.parse('2020-01-01'), max: Date.parse('2035-01-01') })
      .map((ms) => new Date(ms).toISOString()),
  });

  it('ida y vuelta por el formato compacto es la identidad', () => {
    fc.assert(
      fc.property(groupAndTime, ({ group, takenAt }) => {
        const snapshot = createSnapshot(group, takenAt);
        expect(getSnapshotIssues(snapshot)).toEqual([]);
        expect(fromCompactSnapshotV1(toCompactSnapshotV1(snapshot))).toEqual({
          ok: true,
          value: snapshot,
        });
      })
    );
  });

  it('la captura da los mismos saldos y transferencias que el grupo', () => {
    fc.assert(
      fc.property(groupAndTime, ({ group, takenAt }) => {
        const copy = snapshotToGroup(createSnapshot(group, takenAt));
        expect(computeBalances(copy).map((b) => b.balance)).toEqual(
          computeBalances(group).map((b) => b.balance)
        );
        expect(suggestTransfers(copy).map((t) => t.amount)).toEqual(
          suggestTransfers(group).map((t) => t.amount)
        );
      })
    );
  });

  it('tomar la captura de una captura da el mismo resultado', () => {
    fc.assert(
      fc.property(groupAndTime, ({ group, takenAt }) => {
        const once = createSnapshot(group, takenAt);
        const twice = createSnapshot(snapshotToGroup(once), takenAt);
        expect(twice).toEqual(once);
      })
    );
  });
});
