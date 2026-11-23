import { describe, expect, it } from 'vitest';
import { formatDate, todayLocal } from './dates';

describe('todayLocal', () => {
  it('usa la fecha local, no la UTC', () => {
    // 23:30 local on 31 Dec: in UTC (+3h or more) it would already be next year.
    expect(todayLocal(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
  });

  it('rellena mes y día con ceros', () => {
    expect(todayLocal(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDate', () => {
  it('formatea un día sin desplazarlo por zona horaria', () => {
    expect(formatDate('2026-05-01')).toBe('1 may 2026');
  });

  it('formatea un timestamp ISO', () => {
    expect(formatDate('2026-05-10T12:00:00.000Z')).toBe('10 may 2026');
  });

  it('devuelve el texto original si no es una fecha', () => {
    expect(formatDate('ayer')).toBe('ayer');
  });
});
