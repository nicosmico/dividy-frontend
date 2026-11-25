import { describe, expect, it } from 'vitest';

import { members } from '@/domain/test-utils/fixtures';
import {
  describeSplitStatus,
  formatAmountTyping,
  normalizeAmountText,
  normalizeSplitText,
  parseAmount,
  parseSplitValue,
  presetValues,
  sanitizeSplitInput,
  validateExpenseForm,
  type ExpenseFormValues,
} from './expense-form';

const usd = {
  members: members('Ana', 'Beto', 'Caro'),
  currency: 'USD' as const,
};
const clp = { members: usd.members, currency: 'CLP' as const };

const base: ExpenseFormValues = {
  description: 'Cena',
  amount: '12,50',
  payerId: 'Beto',
  participantIds: ['Ana', 'Beto', 'Caro'],
  date: '2026-05-01',
  splitType: 'equal',
  splitValues: {},
};

describe('el monto escrito en USD', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['1234', '1.234'],
    ['1234,5', '1.234,5'],
    ['1234,56', '1.234,56'],
    [',5', '0,5'],
    ['12,3,4', '12,34'],
    ['abc12,5x', '12,5'],
    // A dot typed at the end is the decimal key of other keyboards.
    ['12.', '12,'],
    ['1.234', '1.234'],
    ['0,5', '0,5'],
  ])('escribir "%s" muestra "%s"', (typed, shown) => {
    expect(formatAmountTyping(typed, 'USD')).toBe(shown);
  });

  it('al salir del campo se completan los decimales', () => {
    expect(normalizeAmountText('12,5', 'USD')).toBe('12,50');
    expect(normalizeAmountText('1.234', 'USD')).toBe('1.234,00');
    expect(normalizeAmountText('12,345', 'USD')).toBe('12,345');
    expect(normalizeAmountText('', 'USD')).toBe('');
    expect(normalizeAmountText('12', 'CLP')).toBe('12');
  });

  it('se lee en centavos', () => {
    expect(parseAmount('12,50', 'USD')).toBe(1250);
    expect(parseAmount('1.234,56', 'USD')).toBe(123_456);
    expect(parseAmount('12,345', 'USD')).toBeNaN();
  });
});

describe('validar el formulario en USD', () => {
  it('guarda el monto en centavos', () => {
    expect(validateExpenseForm(usd, base)).toMatchObject({
      fields: { amount: 1250 },
    });
  });

  it('decimales de más: dice cuántos admite', () => {
    expect(validateExpenseForm(usd, { ...base, amount: '12,345' })).toEqual({
      errors: { amount: 'El dólar estadounidense admite hasta 2 decimales.' },
    });
  });

  it('en CLP los decimales no se aceptan y dice qué hacer', () => {
    expect(validateExpenseForm(clp, { ...base, amount: '12,5' })).toEqual({
      errors: { amount: 'El peso chileno no usa decimales.' },
    });
  });

  it('un monto vacío o en 0 nombra el rango en la moneda', () => {
    for (const amount of ['', '0', '0,00']) {
      const result = validateExpenseForm(usd, { ...base, amount });
      expect(result).toMatchObject({
        errors: { amount: expect.stringContaining('US$0,01') },
      });
    }
  });

  it('el monto máximo en USD son 9.999.999,99', () => {
    expect(
      validateExpenseForm(usd, { ...base, amount: '9.999.999,99' })
    ).toMatchObject({ fields: { amount: 999_999_999 } });
    expect(
      validateExpenseForm(usd, { ...base, amount: '10.000.000,00' })
    ).toHaveProperty('errors.amount');
  });
});

describe('división personalizada en USD', () => {
  const custom = (over: Partial<ExpenseFormValues>): ExpenseFormValues => ({
    ...base,
    amount: '10,01',
    ...over,
  });

  it.each([
    ['exact', '5,01', 501],
    ['exact', '5', 500],
    ['exact', '1.234,5', 123_450],
    ['exact', '', 0],
    ['exact', '5,001', NaN],
    ['percent', '12,5', 1250],
    ['shares', '3', 3],
  ] as const)('parseSplitValue(%s, "%s") = %s', (type, text, expected) => {
    expect(parseSplitValue(type, text, 'USD')).toBe(expected);
  });

  it('da formato con centavos al salir del campo', () => {
    expect(normalizeSplitText('exact', '5', 'USD')).toBe('5,00');
    expect(normalizeSplitText('exact', '5,5', 'USD')).toBe('5,50');
    expect(normalizeSplitText('exact', '1234,5', 'USD')).toBe('1.234,50');
    expect(sanitizeSplitInput('exact', 'a5,5$', 'USD')).toBe('5,5');
    // Without decimals the comma cannot be typed.
    expect(sanitizeSplitInput('exact', '5,5', 'CLP')).toBe('55');
  });

  it('precarga montos que ya cuadran, en centavos', () => {
    expect(
      presetValues('exact', 1001, ['Ana', 'Beto', 'Caro'], usd.members, 'USD')
    ).toEqual({ Ana: '3,34', Beto: '3,34', Caro: '3,33' });
  });

  it('montos con centavos que cuadran', () => {
    const result = validateExpenseForm(
      usd,
      custom({
        splitType: 'exact',
        splitValues: { Ana: '5,01', Beto: '3,00', Caro: '2,00' },
      })
    );
    expect(result).toMatchObject({
      fields: {
        amount: 1001,
        split: { type: 'exact', amounts: { Ana: 501, Beto: 300, Caro: 200 } },
      },
    });
  });

  it('montos que no cuadran dicen la diferencia en centavos', () => {
    const missing = validateExpenseForm(
      usd,
      custom({
        splitType: 'exact',
        splitValues: { Ana: '5,01', Beto: '3,00', Caro: '1,99' },
      })
    );
    expect(missing).toEqual({
      errors: { participantIds: expect.stringMatching(/^Faltan US\$0,01 /) },
    });
    const over = validateExpenseForm(
      usd,
      custom({
        splitType: 'exact',
        splitValues: { Ana: '5,01', Beto: '3,00', Caro: '2,50' },
      })
    );
    expect(over).toEqual({
      errors: {
        participantIds: expect.stringMatching(/^Te pasaste por US\$0,50/),
      },
    });
  });

  it('un monto con decimales de más en un participante dice qué hacer', () => {
    expect(
      validateExpenseForm(
        usd,
        custom({
          splitType: 'exact',
          splitValues: { Ana: '5,001', Beto: '3,00', Caro: '2,00' },
        })
      )
    ).toEqual({
      errors: {
        participantIds:
          'Revisa el monto de Ana: usa solo números, con hasta 2 decimales, como 12,50.',
      },
    });
  });

  it('un monto en CLP con coma dice que use pesos enteros', () => {
    expect(
      validateExpenseForm(
        clp,
        custom({
          amount: '10.000',
          splitType: 'exact',
          splitValues: { Ana: '5,5', Beto: '3.000', Caro: '2.000' },
        })
      )
    ).toEqual({
      errors: {
        participantIds: 'Revisa el monto de Ana: usa solo pesos enteros.',
      },
    });
  });

  it('porcentajes y partes reparten centavos con el resto de a 1', () => {
    expect(
      validateExpenseForm(
        usd,
        custom({
          splitType: 'shares',
          splitValues: { Ana: '2', Beto: '1', Caro: '1' },
        })
      )
    ).toMatchObject({
      fields: { split: { parts: { Ana: 2, Beto: 1, Caro: 1 } } },
    });
  });

  it('el estado en vivo habla en la moneda', () => {
    const text = (s: { lead: string; tail: string }) =>
      `${s.lead} | ${s.tail}`.replace(/\s/g, ' ');
    expect(text(describeSplitStatus('exact', 1001, [501, 300], 'USD'))).toBe(
      'Asignado US$8,01 de US$10,01 | faltan US$2,00'
    );
    expect(text(describeSplitStatus('exact', 1001, [1001], 'USD'))).toBe(
      'Asignado US$10,01 de US$10,01 | Cuadra'
    );
  });
});
