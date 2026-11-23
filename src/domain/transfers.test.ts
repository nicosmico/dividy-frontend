import { describe, expect, it } from 'vitest';
import { getPendingAmount, suggestTransfers } from './transfers';
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
      { fromId: 'C', toId: 'A', amount: 213 },
      { fromId: 'D', toId: 'A', amount: 202 },
      { fromId: 'E', toId: 'B', amount: 101 },
      { fromId: 'F', toId: 'A', amount: 101 },
      { fromId: 'G', toId: 'B', amount: 53 },
      { fromId: 'G', toId: 'A', amount: 48 },
    ]);
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
