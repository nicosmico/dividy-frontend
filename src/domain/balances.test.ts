import { describe, expect, it } from 'vitest';
import { computeBalances, getMemberBreakdown, isSettled } from './balances';
import { billsGroup, makeGroup } from './test-utils/fixtures';

const balancesOf = (group = billsGroup()) =>
  Object.fromEntries(
    computeBalances(group).map((b) => [b.memberId, b.balance])
  );

describe('computeBalances', () => {
  it('devuelve un grupo sin movimientos en cero, en el orden de los miembros', () => {
    const result = computeBalances(makeGroup({ members: ['B', 'A'] }));
    expect(result.map((b) => b.memberId)).toEqual(['B', 'A']);
    expect(result.every((b) => b.balance === 0)).toBe(true);
  });

  it('calcula pagado, parte y saldo de un gasto con resto', () => {
    const group = makeGroup({
      members: ['A', 'B', 'C'],
      expenses: [{ amount: 10_000, payer: 'A', among: ['A', 'B', 'C'] }],
    });
    expect(computeBalances(group)).toEqual([
      {
        memberId: 'A',
        paid: 10_000,
        share: 3334,
        paymentsSent: 0,
        paymentsReceived: 0,
        balance: 6666,
      },
      {
        memberId: 'B',
        paid: 0,
        share: 3333,
        paymentsSent: 0,
        paymentsReceived: 0,
        balance: -3333,
      },
      {
        memberId: 'C',
        paid: 0,
        share: 3333,
        paymentsSent: 0,
        paymentsReceived: 0,
        balance: -3333,
      },
    ]);
  });

  it('el pagador puede no participar', () => {
    const group = makeGroup({
      members: ['A', 'B'],
      expenses: [{ amount: 100, payer: 'A', among: ['B'] }],
    });
    expect(balancesOf(group)).toEqual({ A: 100, B: -100 });
  });

  it('los pagos mueven el saldo: quien paga sube, quien recibe baja', () => {
    const group = makeGroup({
      members: ['A', 'B'],
      expenses: [{ amount: 1000, payer: 'A', among: ['A', 'B'] }],
      payments: [{ from: 'B', to: 'A', amount: 200 }],
    });
    const [a, b] = computeBalances(group);
    expect(a).toMatchObject({ paymentsReceived: 200, balance: 300 });
    expect(b).toMatchObject({ paymentsSent: 200, balance: -300 });
  });

  it('un pago mayor a la deuda invierte el saldo', () => {
    const group = makeGroup({
      members: ['A', 'B'],
      expenses: [{ amount: 100, payer: 'A', among: ['A', 'B'] }],
      payments: [{ from: 'B', to: 'A', amount: 80 }],
    });
    expect(balancesOf(group)).toEqual({ A: -30, B: 30 });
  });

  it('caso bills (regresión de los $0 fantasma): saldos enteros que suman 0', () => {
    expect(balancesOf()).toEqual({
      A: 564,
      B: 154,
      C: -213,
      D: -202,
      E: -101,
      F: -101,
      G: -101,
    });
  });

  it('no cuenta a un pagador inexistente', () => {
    const group = makeGroup({
      members: ['A'],
      expenses: [{ amount: 100, payer: 'Z', among: ['A'] }],
    });
    expect(balancesOf(group)).toEqual({ A: -100 });
  });
});

describe('getMemberBreakdown', () => {
  const group = makeGroup({
    members: ['A', 'B', 'C'],
    expenses: [
      {
        id: 'e1',
        description: 'Pizza',
        amount: 1000,
        payer: 'A',
        among: ['A', 'B', 'C'],
      },
      {
        id: 'e2',
        description: 'Bebidas',
        amount: 300,
        payer: 'B',
        among: ['B', 'C'],
      },
      { id: 'e3', description: 'Taxi', amount: 90, payer: 'C', among: ['A'] },
    ],
    payments: [
      { id: 'p1', from: 'B', to: 'A', amount: 50 },
      { id: 'p2', from: 'A', to: 'C', amount: 20 },
    ],
  });

  it('devuelve null si el miembro no existe', () => {
    expect(getMemberBreakdown(group, 'Z')).toBeNull();
  });

  it('lista sólo los gastos donde pagó o participa, con lo pagado y su parte', () => {
    const breakdown = getMemberBreakdown(group, 'B')!;
    expect(breakdown.expenses).toEqual([
      {
        expenseId: 'e1',
        description: 'Pizza',
        date: '2026-01-01',
        paid: 0,
        share: 333,
      },
      {
        expenseId: 'e2',
        description: 'Bebidas',
        date: '2026-01-01',
        paid: 300,
        share: 150,
      },
    ]);
  });

  it('incluye un gasto que pagó sin participar, con parte 0', () => {
    const breakdown = getMemberBreakdown(group, 'C')!;
    expect(breakdown.expenses.find((l) => l.expenseId === 'e3')).toMatchObject({
      paid: 90,
      share: 0,
    });
  });

  it('separa pagos enviados y recibidos', () => {
    const breakdown = getMemberBreakdown(group, 'A')!;
    expect(breakdown.paymentsSent.map((p) => p.id)).toEqual(['p2']);
    expect(breakdown.paymentsReceived.map((p) => p.id)).toEqual(['p1']);
  });

  it('el saldo del desglose coincide con computeBalances y con sus líneas', () => {
    for (const member of group.members) {
      const b = getMemberBreakdown(group, member.id)!;
      const paid = b.expenses.reduce((s, l) => s + l.paid, 0);
      const share = b.expenses.reduce((s, l) => s + l.share, 0);
      expect(b.balance).toEqual(
        computeBalances(group).find((x) => x.memberId === member.id)
      );
      expect(b.balance.paid).toBe(paid);
      expect(b.balance.share).toBe(share);
    }
  });
});

describe('isSettled', () => {
  it('un grupo vacío está al día', () => {
    expect(isSettled(makeGroup({ members: ['A', 'B'] }))).toBe(true);
  });

  it('no está al día con deudas pendientes', () => {
    expect(isSettled(billsGroup())).toBe(false);
  });

  it('queda al día cuando los pagos cubren las deudas', () => {
    const group = makeGroup({
      members: ['A', 'B'],
      expenses: [{ amount: 100, payer: 'A', among: ['A', 'B'] }],
      payments: [{ from: 'B', to: 'A', amount: 50 }],
    });
    expect(isSettled(group)).toBe(true);
  });
});
