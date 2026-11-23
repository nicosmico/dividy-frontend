import { describe, expect, it } from 'vitest';

import { plural } from './plural';

describe('plural', () => {
  it.each([
    [0, '0 gastos'],
    [1, '1 gasto'],
    [2, '2 gastos'],
    [1000, '1000 gastos'],
  ])('con %i usa la forma correcta', (n, expected) => {
    expect(plural(n, 'gasto', 'gastos')).toBe(expected);
  });
});
