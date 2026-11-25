import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  CURRENCY_CODES,
  CURRENCY_LOCKED_MESSAGE,
  canChangeCurrency,
  changeCurrency,
  currencyInfo,
  currencyLabel,
  currencyNameInSentence,
  currencyPluralLabel,
  isCurrencyCode,
} from './currency';
import { addExpense, addPayment, createGroup } from './group';
import { formatAmount } from './money';
import { computeShares } from './split';
import { currencyArb } from './test-utils/arbitraries';
import { makeGroup, members } from './test-utils/fixtures';
import { getGroupIssues, validateExpenseFields } from './validation';

describe('tabla de monedas', () => {
  it('es la lista cerrada, en este orden', () => {
    expect([...CURRENCY_CODES]).toEqual([
      'CLP',
      'USD',
      'EUR',
      'ARS',
      'BRL',
      'PEN',
      'MXN',
      'COP',
      'GBP',
    ]);
  });

  it.each([
    ['CLP', 0, 'Peso chileno'],
    ['USD', 2, 'Dólar estadounidense'],
    ['EUR', 2, 'Euro'],
    ['ARS', 2, 'Peso argentino'],
    ['BRL', 2, 'Real brasileño'],
    ['PEN', 2, 'Sol peruano'],
    ['MXN', 2, 'Peso mexicano'],
    // 0 on purpose: cents of a Colombian peso are not used in practice.
    ['COP', 0, 'Peso colombiano'],
    ['GBP', 2, 'Libra esterlina'],
  ] as const)('%s: %s decimales, "%s"', (code, decimals, name) => {
    expect(currencyInfo(code)).toMatchObject({ code, decimals, name });
  });

  it('cada fila se llama como su código y solo hay 0 o 2 decimales', () => {
    for (const code of CURRENCY_CODES) {
      expect(CURRENCIES[code].code).toBe(code);
      expect([0, 2]).toContain(CURRENCIES[code].decimals);
    }
  });

  it('isCurrencyCode solo acepta los códigos de la tabla', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('usd')).toBe(false);
    expect(isCurrencyCode('JPY')).toBe(false);
    expect(isCurrencyCode(undefined)).toBe(false);
  });

  it('los nombres para la interfaz', () => {
    expect(currencyLabel('CLP')).toBe('Peso chileno (CLP)');
    expect(currencyNameInSentence('CLP')).toBe('el peso chileno');
    expect(currencyNameInSentence('GBP')).toBe('la libra esterlina');
    expect(currencyPluralLabel('PEN')).toBe('soles (PEN)');
    expect(currencyPluralLabel('USD')).toBe('dólares estadounidenses (USD)');
  });
});

describe('cambiar la moneda', () => {
  const empty = () => makeGroup({ members: ['Ana', 'Beto'] });
  const withExpense = () =>
    makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [{ amount: 1000, payer: 'Ana', among: ['Ana', 'Beto'] }],
    });
  const withPayment = () =>
    makeGroup({
      members: ['Ana', 'Beto'],
      payments: [{ from: 'Ana', to: 'Beto', amount: 500 }],
    });

  it('se puede mientras no hay gastos ni pagos', () => {
    expect(canChangeCurrency(empty())).toBe(true);
    const result = changeCurrency(empty(), 'USD');
    expect(result.ok && result.value.currency).toBe('USD');
  });

  it.each([
    ['un gasto', withExpense],
    ['un pago', withPayment],
  ])('no se puede con %s: dice por qué', (_name, make) => {
    expect(canChangeCurrency(make())).toBe(false);
    const result = changeCurrency(make(), 'EUR');
    expect(result).toEqual({
      ok: false,
      error: { code: 'currency_locked', message: CURRENCY_LOCKED_MESSAGE },
    });
    expect(CURRENCY_LOCKED_MESSAGE).toBe(
      'Para cambiar la moneda, el grupo no puede tener gastos ni pagos.'
    );
  });

  it('elegir la misma moneda no es un cambio, ni con gastos', () => {
    const group = withExpense();
    expect(changeCurrency(group, 'CLP')).toEqual({ ok: true, value: group });
  });

  it('rechaza una moneda que no está en la lista', () => {
    expect(changeCurrency(empty(), 'JPY')).toMatchObject({
      ok: false,
      error: { code: 'invalid_currency' },
    });
  });

  it('volver a un grupo vacío lo deja cambiar otra vez', () => {
    const group = withExpense();
    const emptied = { ...group, expenses: [] };
    expect(changeCurrency(emptied, 'MXN')).toMatchObject({
      ok: true,
      value: { currency: 'MXN' },
    });
  });
});

describe('crear un grupo con moneda', () => {
  const input = {
    id: 'g1',
    name: 'Viaje',
    members: [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ],
    now: '2026-01-01T00:00:00.000Z',
  };

  it('es CLP por defecto', () => {
    const result = createGroup(input);
    expect(result.ok && result.value.currency).toBe('CLP');
  });

  it('usa la moneda elegida', () => {
    const result = createGroup({ ...input, currency: 'USD' });
    expect(result.ok && result.value.currency).toBe('USD');
  });

  it('rechaza una moneda desconocida', () => {
    const result = createGroup({ ...input, currency: 'XXX' as 'CLP' });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'invalid_currency' },
    });
  });

  it('un grupo con una moneda inválida rompe una invariante', () => {
    const group = { ...makeGroup({ members: ['A', 'B'] }), currency: 'XXX' };
    expect(getGroupIssues(group as never)).toContain('invalid currency');
  });
});

describe('montos en la moneda del grupo', () => {
  const usd = () => makeGroup({ members: ['Ana', 'Beto'], currency: 'USD' });

  it('los mensajes de monto nombran la moneda del grupo', () => {
    const result = addExpense(usd(), {
      id: 'e1',
      createdAt: '2026-01-01T00:00:00.000Z',
      description: 'Cena',
      amount: 0,
      payerId: 'Ana',
      split: { type: 'equal', participantIds: ['Ana', 'Beto'] },
      date: '2026-01-01',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('US$');
  });

  it('una división por montos que no cuadra dice la diferencia en centavos', () => {
    const result = addExpense(usd(), {
      id: 'e1',
      createdAt: '2026-01-01T00:00:00.000Z',
      description: 'Cena',
      amount: 1001,
      payerId: 'Ana',
      split: {
        type: 'exact',
        participantIds: ['Ana', 'Beto'],
        amounts: { Ana: 500, Beto: 500 },
      },
      date: '2026-01-01',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        `Faltan ${formatAmount(1, 'USD')} por asignar.`
      );
    }
  });

  it('un pago también se valida en la moneda', () => {
    const result = addPayment(usd(), {
      id: 'p1',
      createdAt: '2026-01-01T00:00:00.000Z',
      fromId: 'Ana',
      toId: 'Beto',
      amount: 1250,
      date: '2026-01-01',
    });
    expect(result.ok).toBe(true);
  });
});

describe('división en unidades mínimas (0 y 2 decimales)', () => {
  const sum = (values: Iterable<number>) =>
    [...values].reduce((s, v) => s + v, 0);

  it('USD: 10,00 entre 3 son 3,34 / 3,33 / 3,33', () => {
    const shares = computeShares(
      {
        amount: 1000,
        split: { type: 'equal', participantIds: ['A', 'B', 'C'] },
      },
      members('A', 'B', 'C')
    );
    expect([...shares.values()]).toEqual([334, 333, 333]);
  });

  it('USD: 0,01 entre 3 le toca a la primera persona', () => {
    const shares = computeShares(
      { amount: 1, split: { type: 'equal', participantIds: ['A', 'B', 'C'] } },
      members('A', 'B', 'C')
    );
    expect([...shares.values()]).toEqual([1, 0, 0]);
  });

  it('propiedad: la suma es exacta, nada es negativo y la diferencia es de una unidad mínima o menos', () => {
    fc.assert(
      fc.property(
        currencyArb,
        fc.integer({ min: 1, max: 999_999_999 }),
        fc.integer({ min: 1, max: 9 }),
        fc.array(fc.integer({ min: 1, max: 20 }), {
          minLength: 9,
          maxLength: 9,
        }),
        fc.constantFrom('equal', 'shares', 'percent'),
        (currency, amount, count, weights, kind) => {
          const people = members(
            ...Array.from({ length: count }, (_, i) => `M${i}`)
          );
          const ids = people.map((m) => m.id);
          const split =
            kind === 'equal'
              ? ({ type: 'equal', participantIds: ids } as const)
              : kind === 'shares'
                ? ({
                    type: 'shares',
                    participantIds: ids,
                    parts: Object.fromEntries(
                      ids.map((id, i) => [id, weights[i]])
                    ),
                  } as const)
                : ({
                    type: 'percent',
                    participantIds: ids,
                    basisPoints: Object.fromEntries(
                      ids.map((id) => [id, 10_000 / count])
                    ),
                  } as const);
          if (kind === 'percent' && !Number.isInteger(10_000 / count)) return;
          // The expense is valid in the group's currency (0 or 2 decimals).
          expect(
            validateExpenseFields(
              { members: people, currency },
              {
                description: 'Gasto',
                amount,
                payerId: ids[0],
                split,
                date: '2026-01-01',
              }
            ).ok
          ).toBe(true);
          const shares = computeShares({ amount, split }, people);
          const values = [...shares.values()];
          expect(sum(values)).toBe(amount);
          expect(values.every((v) => Number.isInteger(v) && v >= 0)).toBe(true);
          if (kind === 'equal') {
            expect(Math.max(...values) - Math.min(...values)).toBeLessThan(2);
          }
          if (kind !== 'equal') {
            // Each part is within 1 smallest unit of its exact proportion.
            const total =
              kind === 'shares' ? sum(weights.slice(0, count)) : 10_000;
            ids.forEach((id, i) => {
              const weight = kind === 'shares' ? weights[i] : 10_000 / count;
              const exact = (amount * weight) / total;
              expect(Math.abs((shares.get(id) ?? 0) - exact)).toBeLessThan(1);
            });
          }
        }
      )
    );
  });
});
