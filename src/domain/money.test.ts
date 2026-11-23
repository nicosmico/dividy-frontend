import { describe, expect, it } from 'vitest';
import { formatAmount, isValidAmount } from './money';

describe('isValidAmount', () => {
  it.each([
    [1, true],
    [999_999_999, true],
    [500, true],
    [0, false],
    [-5, false],
    [1000_000_000, false],
    [10.5, false],
    [NaN, false],
    [Infinity, false],
    ['100', false],
    [null, false],
  ])('%s -> %s', (value, expected) => {
    expect(isValidAmount(value)).toBe(expected);
  });
});

describe('formatAmount', () => {
  it.each([
    [10_000, '$10.000'],
    [0, '$0'],
    [1_234_567, '$1.234.567'],
  ])('formatea %s como %s', (amount, expected) => {
    expect(formatAmount(amount).replace(/\s/g, '')).toBe(expected);
  });

  it('formatea saldos negativos con signo', () => {
    expect(formatAmount(-500)).toContain('-');
    expect(formatAmount(-500)).toContain('500');
  });
});
