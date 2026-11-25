import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateAvatar } from './avatar';
import { isSettled } from './balances';
import { parseExpenseFilter, filterExpenses } from './filter';
import { addPayment, removePayment } from './group';
import {
  formatAmountInput,
  amountRangeMessage,
  parseAmountText,
} from './money';
import {
  createSnapshot,
  fromCompactSnapshotV3,
  toCompactSnapshotV3,
} from './snapshot';
import { validateSplit } from './split';
import { makeGroup } from './test-utils/fixtures';
import { settleBalances, type Party } from './transfers';
import {
  validateDate,
  validateGroupName,
  validateMemberName,
} from './validation';

/**
 * Gaps found by mutation testing (`npm run test:mutation`, Stryker): changes
 * to the domain that no test noticed. Each block names what was not checked.
 */

const trip = () =>
  makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        id: 'e1',
        description: 'Asado',
        amount: 30_000,
        payer: 'Ana',
        among: ['Ana', 'Beto'],
      },
    ],
  });

describe('isSettled mira a todos, no a alguno', () => {
  it('con alguien en $0 pero otros con saldo, no está al día', () => {
    // Carla is at $0; Ana and Beto are not.
    expect(isSettled(trip())).toBe(false);
  });
  it('sin gastos, todos en $0: al día', () => {
    expect(isSettled(makeGroup({ members: ['Ana', 'Beto'] }))).toBe(true);
  });
});

describe('pagos en el dominio', () => {
  const payment = {
    id: 'p1',
    fromId: 'Beto',
    toId: 'Ana',
    amount: 15_000,
    date: '2026-01-02',
    createdAt: '2026-01-02T10:00:00.000Z',
  };

  it('registrar un pago lo agrega y salda', () => {
    const result = addPayment(trip(), payment);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.payments).toEqual([payment]);
    expect(isSettled(result.value)).toBe(true);
  });

  it('un pago con un id que ya existe se rechaza', () => {
    const once = addPayment(trip(), payment);
    if (!once.ok) throw new Error('setup');
    const twice = addPayment(once.value, payment);
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.error.code).toBe('duplicate_id');
  });

  it('eliminar un pago quita solo ese', () => {
    const one = addPayment(trip(), payment);
    if (!one.ok) throw new Error('setup');
    const two = addPayment(one.value, { ...payment, id: 'p2', amount: 1 });
    if (!two.ok) throw new Error('setup');
    const result = removePayment(two.value, 'p1');
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.payments.map((p) => p.id)).toEqual(['p2']);
  });

  it('eliminar un pago que no existe avisa y no cambia nada', () => {
    const result = removePayment(trip(), 'nada');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('payment_not_found');
  });
});

describe('montos: cero y vacío', () => {
  it('cero no lleva signo', () => {
    expect(formatAmountInput(0, 'USD')).toBe('0,00');
    expect(formatAmountInput(0, 'CLP')).toBe('0');
  });
  it('un monto vacío pide un monto dentro del rango', () => {
    const result = parseAmountText('  ', 'CLP');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(amountRangeMessage('CLP'));
    }
  });
});

describe('validateSplit rechaza valores que no son enteros', () => {
  const members = [
    { id: 'A', name: 'Ana' },
    { id: 'B', name: 'Beto' },
  ];
  it.each([1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2])('monto %s', (bad) => {
    const result = validateSplit(
      100,
      {
        type: 'exact',
        participantIds: ['A', 'B'],
        amounts: { A: bad, B: 100 - bad },
      },
      members,
      'CLP'
    );
    expect(result.ok).toBe(false);
  });
});

describe('fechas', () => {
  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    'x2026-01-01',
    '2026-01-01x',
  ])('%s no es una fecha válida', (date) => {
    expect(validateDate(date).ok).toBe(false);
  });
  it.each(['2026-02-28', '2024-02-29', '2026-12-31'])(
    '%s es válida',
    (date) => {
      expect(validateDate(date).ok).toBe(true);
    }
  );
});

describe('nombres', () => {
  it('un nombre repetido se detecta sin importar mayúsculas', () => {
    const group = makeGroup({ members: ['Ana'] });
    expect(validateMemberName(group, 'ana').ok).toBe(false);
    expect(validateMemberName(group, '  ANA ').ok).toBe(false);
  });
  it('el mensaje de largo dice el máximo', () => {
    const result = validateGroupName('x'.repeat(200));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/\d+ caracteres/);
  });
});

describe('avatar', () => {
  it('una semilla vacía no es válida', () => {
    expect(validateAvatar({ color: 0, seed: '   ' }).ok).toBe(false);
  });
});

describe('filtros sin saber quién eres', () => {
  it('"Donde participo" y "Pagué yo" no muestran nada', () => {
    const group = trip();
    expect(filterExpenses(group, { kind: 'mine' }, '', null)).toEqual([]);
    expect(filterExpenses(group, { kind: 'paid' }, '', null)).toEqual([]);
  });
  it('un parámetro de persona sin id o mal formado se ignora', () => {
    const group = trip();
    expect(parseExpenseFilter('member', group)).toBeNull();
    expect(parseExpenseFilter(':Ana', group)).toBeNull();
  });
});

describe('links: moneda inválida', () => {
  it('un link v3 con una moneda que no existe no se abre', () => {
    const compact = toCompactSnapshotV3(
      createSnapshot(trip(), '2026-11-24T13:42:00.000Z')
    );
    const tampered = [
      ...compact.slice(0, 6),
      'XXX',
    ] as unknown as typeof compact;
    expect(fromCompactSnapshotV3(tampered).ok).toBe(false);
  });
});

/**
 * Reference for the minimum number of transfers: people with a balance minus
 * the largest number of groups that settle among themselves (brute force over
 * every partition, fine for up to 8 people).
 */
function minimumTransfers(balances: number[]): number {
  const values = balances.filter((b) => b !== 0);
  const n = values.length;
  const zeroSum = (mask: number) =>
    values.reduce((s, v, i) => (mask & (1 << i) ? s + v : s), 0) === 0;
  const memo = new Map<number, number>();
  const groups = (mask: number): number => {
    if (mask === 0) return 0;
    const cached = memo.get(mask);
    if (cached !== undefined) return cached;
    const low = mask & -mask;
    let best = -Infinity;
    // Every zero-sum subset that contains the lowest person.
    for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
      if (sub & low && zeroSum(sub))
        best = Math.max(best, 1 + groups(mask ^ sub));
    }
    memo.set(mask, best);
    return best;
  };
  return n === 0 ? 0 : n - groups((1 << n) - 1);
}

const partiesArb = fc
  .array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 7 })
  .map((values) => {
    const sum = values.reduce((s, v) => s + v, 0);
    return [...values, -sum].map((balance, i): Party => ({
      id: `p${i}`,
      balance,
    }));
  });

describe('transferencias: exactamente el mínimo', () => {
  it('coincide con una búsqueda exhaustiva (hasta 8 personas)', () => {
    fc.assert(
      fc.property(partiesArb, (parties) => {
        expect(settleBalances(parties)).toHaveLength(
          minimumTransfers(parties.map((p) => p.balance))
        );
      }),
      { numRuns: 500 }
    );
  });

  it('con exactamente 15 personas con saldo todavía busca los grupos que se saldan solos', () => {
    // 6 exact pairs and a group of 3: 15 people, minimum 15 − 7 = 8 transfers.
    const balances = [
      ...[10, 20, 30, 40, 50, 60].flatMap((v) => [v, -v]),
      7,
      5,
      -12,
    ];
    const parties = balances.map((balance, i): Party => ({
      id: `p${i}`,
      balance,
    }));
    expect(parties).toHaveLength(15);
    expect(settleBalances(parties)).toHaveLength(8);
  });
});
