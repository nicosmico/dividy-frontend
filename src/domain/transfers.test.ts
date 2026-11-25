import { describe, expect, it } from 'vitest';
import {
  getPendingAmount,
  settleBalances,
  suggestTransfers,
} from './transfers';
import { greedyTransfers } from './test-utils/greedy-transfers';
import { billsGroup, makeGroup } from './test-utils/fixtures';

describe('suggestTransfers', () => {
  it('no sugiere nada si el grupo está al día', () => {
    expect(suggestTransfers(makeGroup({ members: ['A', 'B'] }))).toEqual([]);
  });

  it('10.000 entre 3 pagado por A: B y C pagan 3.333 y las transferencias suman exacto', () => {
    const group = makeGroup({
      members: ['A', 'B', 'C'],
      expenses: [{ amount: 10_000, payer: 'A', among: ['A', 'B', 'C'] }],
    });
    const transfers = suggestTransfers(group);
    expect(transfers).toEqual([
      { fromId: 'B', toId: 'A', amount: 3333 },
      { fromId: 'C', toId: 'A', amount: 3333 },
    ]);
    expect(transfers.reduce((s, t) => s + t.amount, 0)).toBe(6666);
  });

  it('caso bills: ninguna transferencia de $0 y a lo más n-1', () => {
    const transfers = suggestTransfers(billsGroup());
    expect(transfers.every((t) => t.amount > 0)).toBe(true);
    expect(transfers.every((t) => t.fromId !== t.toId)).toBe(true);
    expect(transfers.length).toBeLessThanOrEqual(6);
    expect(transfers).toEqual([
      // C owes the most (213), so C splits; G, E and F pay whole.
      { fromId: 'C', toId: 'B', amount: 154 },
      { fromId: 'C', toId: 'A', amount: 59 },
      { fromId: 'D', toId: 'A', amount: 202 },
      { fromId: 'E', toId: 'A', amount: 101 },
      { fromId: 'F', toId: 'A', amount: 101 },
      { fromId: 'G', toId: 'A', amount: 101 },
    ]);
  });

  it('Casa Marcelo: solo el que más debe parte su pago y no hay transferencias chicas', () => {
    const group = makeGroup({
      members: ['Nico', 'Marcelo', 'Kevin', 'Nati', 'Jorge', 'Pauli'],
      expenses: [
        { amount: 21_600, payer: 'Nico', among: ['Nico', 'Marcelo', 'Kevin'] },
        {
          amount: 11_000,
          payer: 'Nico',
          among: ['Nico', 'Marcelo', 'Kevin', 'Nati', 'Jorge'],
        },
        {
          amount: 16_000,
          payer: 'Marcelo',
          among: ['Nico', 'Marcelo', 'Kevin'],
        },
        {
          amount: 38_000,
          payer: 'Marcelo',
          among: ['Nico', 'Marcelo', 'Kevin', 'Nati', 'Pauli'],
        },
      ],
    });
    expect(suggestTransfers(group)).toEqual([
      { fromId: 'Kevin', toId: 'Marcelo', amount: 12_067 },
      { fromId: 'Kevin', toId: 'Nico', amount: 10_266 },
      { fromId: 'Nati', toId: 'Marcelo', amount: 9800 },
      { fromId: 'Pauli', toId: 'Marcelo', amount: 7600 },
      { fromId: 'Jorge', toId: 'Marcelo', amount: 2200 },
    ]);
  });

  it('parejas que se saldan solas: A debe 10 a X y B debe 20 a Y son 2 transferencias, no 3', () => {
    const group = makeGroup({
      members: ['A', 'B', 'X', 'Y'],
      expenses: [
        { amount: 10, payer: 'X', among: ['A'] },
        { amount: 20, payer: 'Y', among: ['B'] },
      ],
    });
    expect(suggestTransfers(group)).toEqual([
      { fromId: 'B', toId: 'Y', amount: 20 },
      { fromId: 'A', toId: 'X', amount: 10 },
    ]);
  });

  it('un grupo de 3 y una pareja que se saldan solos: 3 transferencias (el voraz hacía 4)', () => {
    const balances = [
      { id: 'A', balance: 6 },
      { id: 'B', balance: 5 },
      { id: 'C', balance: -3 },
      { id: 'D', balance: -3 },
      { id: 'E', balance: -5 },
    ];
    expect(greedyTransfers(balances)).toHaveLength(4);
    expect(settleBalances(balances)).toEqual([
      { fromId: 'E', toId: 'B', amount: 5 },
      { fromId: 'C', toId: 'A', amount: 3 },
      { fromId: 'D', toId: 'A', amount: 3 },
    ]);
  });

  it('un solo deudor con varios acreedores: paga a cada uno lo suyo', () => {
    const group = makeGroup({
      members: ['A', 'B', 'C', 'D'],
      expenses: [
        { amount: 1000, payer: 'A', among: ['D'] },
        { amount: 3000, payer: 'B', among: ['D'] },
        { amount: 2000, payer: 'C', among: ['D'] },
      ],
    });
    expect(suggestTransfers(group)).toEqual([
      { fromId: 'D', toId: 'B', amount: 3000 },
      { fromId: 'D', toId: 'C', amount: 2000 },
      { fromId: 'D', toId: 'A', amount: 1000 },
    ]);
  });

  it('varios acreedores iguales: el que más debe parte su pago, y también el siguiente si no cabe entero', () => {
    // Nobody can take 7 or 13 whole from four creditors of 5: both split, 5 transfers is still the minimum.
    const balances = [5, 5, 5, 5, -7, -13].map((balance, i) => ({
      id: `p${i}`,
      balance,
    }));
    expect(settleBalances(balances)).toEqual([
      { fromId: 'p5', toId: 'p2', amount: 5 },
      { fromId: 'p5', toId: 'p3', amount: 5 },
      { fromId: 'p5', toId: 'p1', amount: 3 },
      { fromId: 'p4', toId: 'p0', amount: 5 },
      { fromId: 'p4', toId: 'p1', amount: 2 },
    ]);
  });

  it('con más de 15 personas con saldo no busca subgrupos: un solo grupo, a lo más n-1', () => {
    // 8 independent pairs (16 people): the result still settles, in at most 15.
    const balances = Array.from({ length: 8 }, (_, i) => [
      { id: `d${i}`, balance: -(i + 1) },
      { id: `c${i}`, balance: i + 1 },
    ]).flat();
    const transfers = settleBalances(balances);
    expect(transfers.length).toBeLessThanOrEqual(15);
    const left = new Map(balances.map((b) => [b.id, b.balance]));
    for (const t of transfers) {
      left.set(t.fromId, left.get(t.fromId)! + t.amount);
      left.set(t.toId, left.get(t.toId)! - t.amount);
    }
    expect([...left.values()].every((v) => v === 0)).toBe(true);
  });

  it('desempata por el orden de los miembros', () => {
    const group = makeGroup({
      members: ['A', 'B', 'C', 'D'],
      expenses: [
        { amount: 100, payer: 'A', among: ['C'] },
        { amount: 100, payer: 'B', among: ['D'] },
      ],
    });
    expect(suggestTransfers(group)).toEqual([
      { fromId: 'C', toId: 'A', amount: 100 },
      { fromId: 'D', toId: 'B', amount: 100 },
    ]);
  });

  it('considera los pagos ya registrados', () => {
    const group = makeGroup({
      members: ['A', 'B'],
      expenses: [{ amount: 1000, payer: 'A', among: ['A', 'B'] }],
      payments: [{ from: 'B', to: 'A', amount: 200 }],
    });
    expect(suggestTransfers(group)).toEqual([
      { fromId: 'B', toId: 'A', amount: 300 },
    ]);
  });
});

describe('getPendingAmount', () => {
  it('es 0 si el grupo está al día o no tiene movimientos', () => {
    expect(getPendingAmount(makeGroup({ members: ['A', 'B'] }))).toBe(0);
    const settled = makeGroup({
      members: ['A', 'B'],
      expenses: [{ amount: 1000, payer: 'A', among: ['A', 'B'] }],
      payments: [{ from: 'B', to: 'A', amount: 500 }],
    });
    expect(getPendingAmount(settled)).toBe(0);
  });

  it('suma las transferencias sugeridas', () => {
    const group = makeGroup({
      members: ['A', 'B', 'C'],
      expenses: [{ amount: 10_000, payer: 'A', among: ['A', 'B', 'C'] }],
    });
    expect(getPendingAmount(group)).toBe(6666);
  });

  it('descuenta los pagos ya registrados', () => {
    const group = makeGroup({
      members: ['A', 'B', 'C'],
      expenses: [{ amount: 10_000, payer: 'A', among: ['A', 'B', 'C'] }],
      payments: [{ from: 'B', to: 'A', amount: 3333 }],
    });
    expect(getPendingAmount(group)).toBe(3333);
  });
});
