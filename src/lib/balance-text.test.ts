import { describe, expect, it } from 'vitest';

import { describeBalanceChange } from './balance-text';

describe('describeBalanceChange', () => {
  it.each([
    [20_000, 15_000, 'le deben $20.000 → $15.000'],
    [-10_000, -15_000, 'debe $10.000 → $15.000'],
    [5_000, -2_000, 'le deben $5.000 → debe $2.000'],
    [-3_000, 0, 'debe $3.000 → al día'],
    [0, 4_000, 'al día → le deben $4.000'],
  ])('%i → %i: %s', (before, after, expected) => {
    expect(describeBalanceChange(before, after, 'CLP')).toBe(expected);
  });
});
