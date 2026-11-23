import { describe, expect, it } from 'vitest';

import { members } from '@/domain/test-utils/fixtures';
import {
  formatDigits,
  onlyDigits,
  parseAmount,
  validateExpenseForm,
  type ExpenseFormValues,
} from './expense-form';

const group = { members: members('Ana', 'Beto', 'Caro') };

const valid: ExpenseFormValues = {
  description: '  Pizza ',
  amount: '12000',
  payerId: 'Beto',
  participantIds: ['Caro', 'Ana'],
  date: '2026-05-01',
};

describe('formatDigits / onlyDigits / parseAmount', () => {
  it.each([
    ['', ''],
    ['5', '5'],
    ['1000', '1.000'],
    ['1234567', '1.234.567'],
  ])('formatea %s como %s', (digits, expected) => {
    expect(formatDigits(digits)).toBe(expected);
  });

  it('onlyDigits quita lo que no es dígito, los ceros iniciales y limita el largo', () => {
    expect(onlyDigits('$ 1a0.0b0')).toBe('1000');
    expect(onlyDigits('0007')).toBe('7');
    expect(onlyDigits('abc')).toBe('');
    expect(onlyDigits('123456789012')).toBe('1234567890');
  });

  it('parseAmount da un entero, o NaN si no hay nada', () => {
    expect(parseAmount('10000')).toBe(10000);
    expect(parseAmount('')).toBeNaN();
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
        description: 'La descripción no puede estar vacío.',
        amount: expect.stringContaining('El monto debe ser un número entero'),
        date: 'La fecha no es válida.',
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
      errors: { payerId: 'Quien pagó no es parte del grupo.' },
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
