import { describe, expect, it } from 'vitest';

import { members } from '@/domain/test-utils/fixtures';
import {
  describeSplitStatus,
  formatSplitValue,
  formatAmountTyping,
  normalizeSplitText,
  parseAmount,
  parseSplitValue,
  presetValues,
  sanitizeSplitInput,
  startingValue,
  validateExpenseForm,
  type ExpenseFormValues,
} from './expense-form';

const group = {
  members: members('Ana', 'Beto', 'Caro'),
  currency: 'CLP' as const,
};

const valid: ExpenseFormValues = {
  description: '  Pizza ',
  amount: '12000',
  payerId: 'Beto',
  participantIds: ['Caro', 'Ana'],
  date: '2026-05-01',
  splitType: 'equal',
  splitValues: {},
};

describe('formatAmountTyping / parseAmount (CLP)', () => {
  it.each([
    ['', ''],
    ['5', '5'],
    ['1000', '1.000'],
    ['1234567', '1.234.567'],
    ['$ 1a0.0b0', '1.000'],
    ['0007', '7'],
    ['abc', ''],
    ['123456789012', '1.234.567.890'],
    // The comma is kept so the form can say CLP has no decimals.
    ['12,5', '12,5'],
  ])('escribir "%s" muestra "%s"', (typed, shown) => {
    expect(formatAmountTyping(typed, 'CLP')).toBe(shown);
  });

  it('parseAmount da un entero, o NaN si no hay nada o hay decimales', () => {
    expect(parseAmount('10.000', 'CLP')).toBe(10000);
    expect(parseAmount('10000', 'CLP')).toBe(10000);
    expect(parseAmount('', 'CLP')).toBeNaN();
    expect(parseAmount('12,5', 'CLP')).toBeNaN();
  });
});

describe('validateExpenseForm', () => {
  it('devuelve los campos normalizados con los participantes en el orden del grupo', () => {
    expect(validateExpenseForm(group, valid)).toEqual({
      fields: {
        description: 'Pizza',
        amount: 12000,
        payerId: 'Beto',
        split: { type: 'equal', participantIds: ['Ana', 'Caro'] },
        date: '2026-05-01',
      },
    });
  });

  it('devuelve un mensaje por cada campo equivocado', () => {
    const result = validateExpenseForm(group, {
      ...valid,
      description: ' ',
      amount: '',
      date: '2026-02-31',
    });
    expect(result).toEqual({
      errors: {
        description: 'Escribe una descripción del gasto.',
        amount: expect.stringContaining('Ingresa un monto entre $1 y'),
        date: 'Elige una fecha válida.',
      },
    });
  });

  it('exige al menos un participante', () => {
    expect(
      validateExpenseForm(group, { ...valid, participantIds: [] })
    ).toEqual({
      errors: {
        participantIds: 'Elige al menos una persona para dividir el gasto.',
      },
    });
  });

  it('rechaza un pagador que no es del grupo', () => {
    expect(validateExpenseForm(group, { ...valid, payerId: 'Zoe' })).toEqual({
      errors: { payerId: 'Elige quién pagó entre los miembros del grupo.' },
    });
  });

  it('rechaza un monto sobre el máximo', () => {
    const result = validateExpenseForm(group, {
      ...valid,
      amount: '1000000000',
    });
    expect(result).toHaveProperty('errors.amount');
  });
});

describe('campos de una división personalizada', () => {
  it.each([
    ['exact', '10.000', 10_000],
    ['exact', '', 0],
    ['exact', '1.234.567', 1_234_567],
    ['exact', '12,5', NaN],
    ['percent', '12,5', 1250],
    ['percent', '12.5', 1250],
    ['percent', '33,33', 3333],
    ['percent', '100', 10_000],
    ['percent', '1.000,5', 100_050],
    ['percent', '12,555', NaN],
    ['percent', '1,2,3', NaN],
    ['percent', '', 0],
    ['percent', '50 %', 5000],
    ['shares', '3', 3],
    ['shares', '1,5', NaN],
    ['shares', '', 0],
  ] as const)('parseSplitValue(%s, "%s") = %s', (type, text, expected) => {
    expect(parseSplitValue(type, text, 'CLP')).toBe(expected);
  });

  it('da formato chileno al salir del campo', () => {
    expect(normalizeSplitText('exact', '10000', 'CLP')).toBe('10.000');
    expect(normalizeSplitText('exact', '1.0.0.0', 'CLP')).toBe('1.000');
    expect(normalizeSplitText('percent', '12.50', 'CLP')).toBe('12,5');
    expect(normalizeSplitText('percent', '33,3', 'CLP')).toBe('33,3');
    expect(normalizeSplitText('percent', '50', 'CLP')).toBe('50');
    expect(normalizeSplitText('shares', '03', 'CLP')).toBe('3');
    expect(normalizeSplitText('exact', '', 'CLP')).toBe('');
    expect(normalizeSplitText('percent', '1,2,3', 'CLP')).toBe('1,2,3');
    expect(formatSplitValue('percent', 3334, 'CLP')).toBe('33,34');
  });

  it('solo deja escribir lo que tiene sentido en cada modo', () => {
    expect(sanitizeSplitInput('exact', '$ 1a0.0,0', 'CLP')).toBe('10.00');
    expect(sanitizeSplitInput('percent', '1a2,5%', 'CLP')).toBe('12,5');
    expect(sanitizeSplitInput('shares', '1,2.3', 'CLP')).toBe('123');
  });

  it('precarga valores que ya cuadran', () => {
    const ids = ['Ana', 'Beto', 'Caro'];
    expect(presetValues('exact', 100_000, ids, group.members, 'CLP')).toEqual({
      Ana: '33.334',
      Beto: '33.333',
      Caro: '33.333',
    });
    expect(presetValues('percent', 100_000, ids, group.members, 'CLP')).toEqual(
      {
        Ana: '33,34',
        Beto: '33,33',
        Caro: '33,33',
      }
    );
    expect(presetValues('shares', 100_000, ids, group.members, 'CLP')).toEqual({
      Ana: '1',
      Beto: '1',
      Caro: '1',
    });
    expect(presetValues('equal', 100_000, ids, group.members, 'CLP')).toEqual(
      {}
    );
    // No amount yet: the amounts start empty.
    expect(presetValues('exact', NaN, ['Ana'], group.members, 'CLP')).toEqual({
      Ana: '',
    });
  });

  it('un participante nuevo empieza en 0, o en 1 parte', () => {
    expect(startingValue('exact')).toBe('0');
    expect(startingValue('percent')).toBe('0');
    expect(startingValue('shares')).toBe('1');
  });
});

describe('describeSplitStatus', () => {
  it.each([
    [
      'exact',
      100_000,
      [90_000],
      {
        tone: 'warn',
        lead: 'Asignado $90.000 de $100.000',
        tail: 'faltan $10.000',
      },
    ],
    [
      'exact',
      100_000,
      [110_000],
      {
        tone: 'warn',
        lead: 'Asignado $110.000 de $100.000',
        tail: 'te pasaste por $10.000',
      },
    ],
    [
      'exact',
      100_000,
      [60_000, NaN, 40_000],
      { tone: 'ok', lead: 'Asignado $100.000 de $100.000', tail: 'Cuadra' },
    ],
    [
      'exact',
      NaN,
      [500],
      {
        tone: 'info',
        lead: 'Asignado $500',
        tail: 'ingresa el monto para ver cuánto falta',
      },
    ],
    [
      'percent',
      1,
      [9500],
      { tone: 'warn', lead: 'Suma 95 %', tail: 'faltan 5 %' },
    ],
    [
      'percent',
      1,
      [10_050],
      { tone: 'warn', lead: 'Suma 100,5 %', tail: 'te pasaste por 0,5 %' },
    ],
    ['percent', 1, [3334, 3333, 3333], { tone: 'ok', lead: '', tail: '100 %' }],
    [
      'shares',
      1,
      [2, 1, 1],
      { tone: 'info', lead: '4 partes en total', tail: '' },
    ],
    ['shares', 1, [1], { tone: 'info', lead: '1 parte en total', tail: '' }],
    [
      'shares',
      1,
      [2, 0],
      { tone: 'warn', lead: '', tail: 'Cada parte debe ser al menos 1.' },
    ],
  ] as const)('%s con monto %s y %j', (type, amount, values, expected) => {
    expect(describeSplitStatus(type, amount, values, 'CLP')).toEqual(expected);
  });
});

describe('validateExpenseForm con división personalizada', () => {
  const custom = (over: Partial<ExpenseFormValues>): ExpenseFormValues => ({
    ...valid,
    participantIds: ['Caro', 'Ana', 'Beto'],
    ...over,
  });

  it('montos que cuadran: devuelve la división con los participantes en orden del grupo', () => {
    const result = validateExpenseForm(
      group,
      custom({
        splitType: 'exact',
        splitValues: { Ana: '5.000', Beto: '4.000', Caro: '3.000' },
      })
    );
    expect(result).toMatchObject({
      fields: {
        split: {
          type: 'exact',
          participantIds: ['Ana', 'Beto', 'Caro'],
          amounts: { Ana: 5000, Beto: 4000, Caro: 3000 },
        },
      },
    });
  });

  it.each([
    [
      'montos que faltan',
      {
        splitType: 'exact',
        splitValues: { Ana: '5.000', Beto: '4.000', Caro: '2.000' },
      },
      'Faltan $1.000 por asignar.',
    ],
    [
      'montos que se pasan',
      {
        splitType: 'exact',
        splitValues: { Ana: '5.000', Beto: '4.000', Caro: '4.000' },
      },
      'Te pasaste por $1.000.',
    ],
    [
      'un monto en 0',
      {
        splitType: 'exact',
        splitValues: { Ana: '8.000', Beto: '4.000', Caro: '0' },
      },
      'Quita de la división a Caro, que tiene $0, o asígnale un monto.',
    ],
    [
      'un campo vacío',
      {
        splitType: 'exact',
        splitValues: { Ana: '8.000', Beto: '4.000', Caro: '' },
      },
      'Quita de la división a Caro, que tiene $0, o asígnale un monto.',
    ],
    [
      'porcentajes que no suman',
      {
        splitType: 'percent',
        splitValues: { Ana: '50', Beto: '25', Caro: '20' },
      },
      'Los porcentajes suman 95 %; deben sumar 100 %.',
    ],
    [
      'porcentaje con 3 decimales',
      {
        splitType: 'percent',
        splitValues: { Ana: '50', Beto: '25', Caro: '25,555' },
      },
      'Revisa el porcentaje de Caro: usa hasta 2 decimales, como 12,5.',
    ],
    [
      'partes en 0',
      { splitType: 'shares', splitValues: { Ana: '2', Beto: '1', Caro: '0' } },
      'Cada parte debe ser al menos 1.',
    ],
    [
      'partes con coma',
      {
        splitType: 'shares',
        splitValues: { Ana: '2', Beto: '1', Caro: '1,5' },
      },
      'Revisa las partes de Caro: usa números enteros.',
    ],
  ] as const)(
    '%s → error en la lista de participantes',
    (_name, over, message) => {
      expect(validateExpenseForm(group, custom(over))).toEqual({
        errors: { participantIds: message },
      });
    }
  );

  it('porcentajes y partes que cuadran', () => {
    expect(
      validateExpenseForm(
        group,
        custom({
          splitType: 'percent',
          splitValues: { Ana: '33,34', Beto: '33,33', Caro: '33,33' },
        })
      )
    ).toMatchObject({
      fields: { split: { basisPoints: { Ana: 3334, Beto: 3333, Caro: 3333 } } },
    });
    expect(
      validateExpenseForm(
        group,
        custom({
          splitType: 'shares',
          splitValues: { Ana: '2', Beto: '1', Caro: '1' },
        })
      )
    ).toMatchObject({
      fields: { split: { parts: { Ana: 2, Beto: 1, Caro: 1 } } },
    });
  });

  it('sin monto válido solo se queja del monto, no de que no cuadre', () => {
    expect(
      validateExpenseForm(
        group,
        custom({
          amount: '',
          splitType: 'exact',
          splitValues: { Ana: '5.000', Beto: '4.000', Caro: '2.000' },
        })
      )
    ).toEqual({
      errors: {
        amount: expect.stringContaining('Ingresa un monto entre $1 y'),
      },
    });
  });

  it('editar el monto de un gasto por montos deja de cuadrar', () => {
    expect(
      validateExpenseForm(
        group,
        custom({
          amount: '15000',
          splitType: 'exact',
          splitValues: { Ana: '5.000', Beto: '4.000', Caro: '3.000' },
        })
      )
    ).toEqual({ errors: { participantIds: 'Faltan $3.000 por asignar.' } });
  });
});
