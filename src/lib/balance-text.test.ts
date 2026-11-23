import { describe, expect, it } from 'vitest';
import { describeBalance } from './balance-text';

describe('describeBalance', () => {
  it.each([
    [0, 'Al día'],
    [6666, 'Le deben $6.666'],
    [-6666, 'Debe $6.666'],
  ])('%i -> %s', (balance, text) => {
    expect(describeBalance(balance)).toBe(text);
  });
});
