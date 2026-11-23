import { describe, expect, it } from 'vitest';
import { formatToCurrency } from './format-to';

// Intl uses a non-breaking space between the symbol and the amount in es-CL
const normalize = (value: string) => value.replace(/\s/g, ' ');

describe('formatToCurrency', () => {
  it.each([
    [0, '$0'],
    [1000, '$1.000'],
    [1234567, '$1.234.567'],
    [-2500, '$-2.500'],
  ])('formats %d as %s', (value, expected) => {
    expect(normalize(formatToCurrency(value))).toBe(expected);
  });
});
