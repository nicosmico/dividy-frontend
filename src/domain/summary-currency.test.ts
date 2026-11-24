import { describe, expect, it } from 'vitest';
import type { CurrencyCode } from './currency';
import { formatGroupSummary } from './summary';
import { makeGroup } from './test-utils/fixtures';

describe('formatGroupSummary con moneda', () => {
  const group = (currency: CurrencyCode) =>
    makeGroup({
      name: 'Viaje a Lima',
      currency,
      members: ['Ana', 'Beto'],
      expenses: [
        {
          description: 'Cena',
          amount: 1_001,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
    });

  it('con CLP el título queda como siempre', () => {
    expect(formatGroupSummary(group('CLP')).split('\n')[0]).toBe(
      '*Viaje a Lima*'
    );
  });

  it('con otra moneda el título la dice una vez', () => {
    const text = formatGroupSummary(group('PEN'));
    expect(text.split('\n')[0]).toBe('*Viaje a Lima* · en soles (PEN)');
    expect(text.match(/soles/g)).toHaveLength(1);
  });

  it('los montos salen en la moneda del grupo, con centavos', () => {
    const text = formatGroupSummary(group('USD')).replace(/\u00a0/g, ' ');
    expect(text.split('\n')[0]).toBe(
      '*Viaje a Lima* · en dólares estadounidenses (USD)'
    );
    expect(text).toContain('• Cena: US$10,01, pagó Ana, entre Ana y Beto');
    expect(text).toContain('• Ana: le deben US$5,00');
    expect(text).toContain('• Beto: debe US$5,00');
    expect(text).toContain('• Beto le transfiere US$5,00 a Ana');
  });

  it('una división por montos dice los montos con centavos', () => {
    const base = group('USD');
    const withSplit = {
      ...base,
      expenses: [
        {
          ...base.expenses[0],
          split: {
            type: 'exact' as const,
            participantIds: ['Ana', 'Beto'],
            amounts: { Ana: 701, Beto: 300 },
          },
        },
      ],
    };
    expect(formatGroupSummary(withSplit)).toContain(
      'por montos (Ana US$7,01, Beto US$3,00)'
    );
  });
});
