import { describe, expect, it } from 'vitest';
import { formatGroupSummary } from './summary';
import { makeGroup } from './test-utils/fixtures';

describe('formatGroupSummary', () => {
  it('resume gastos, saldos y transferencias en español', () => {
    const group = makeGroup({
      name: 'Asado',
      members: ['Ana', 'Beto', 'Cami'],
      expenses: [
        {
          description: 'Carne',
          amount: 10_000,
          payer: 'Ana',
          among: ['Cami', 'Ana', 'Beto'],
        },
      ],
    });
    expect(formatGroupSummary(group)).toBe(
      [
        '*Asado*',
        '',
        '*Gastos*',
        '• Carne: $10.000, pagó Ana, entre Ana, Beto y Cami',
        '',
        '*Saldos*',
        '• Ana: le deben $6.666',
        '• Beto: debe $3.333',
        '• Cami: debe $3.333',
        '',
        '*Para quedar al día*',
        '• Beto le transfiere $3.333 a Ana',
        '• Cami le transfiere $3.333 a Ana',
      ].join('\n')
    );
  });

  it('dice que están al día cuando no hay transferencias', () => {
    const text = formatGroupSummary(makeGroup({ members: ['Ana', 'Beto'] }));
    expect(text).toContain('Aún no hay gastos.');
    expect(text).toContain('• Ana: está al día');
    expect(text).toContain('¡Están al día! 🎉');
  });

  it('usa "entre" con uno o dos nombres', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        { description: 'Taxi', amount: 500, payer: 'Ana', among: ['Beto'] },
        {
          description: 'Cena',
          amount: 500,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
    });
    const text = formatGroupSummary(group);
    expect(text).toContain('pagó Ana, entre Beto');
    expect(text).toContain('pagó Ana, entre Ana y Beto');
  });

  it('muestra "?" si el pagador no existe', () => {
    const group = makeGroup({
      members: ['Ana'],
      expenses: [{ amount: 500, payer: 'Z', among: ['Ana'] }],
    });
    expect(formatGroupSummary(group)).toContain('pagó ?');
  });

  it('en una captura agrega "Cuentas al <fecha>" bajo el título y el link al final', () => {
    const group = makeGroup({
      name: 'Asado',
      members: ['Ana', 'Beto'],
      expenses: [
        {
          description: 'Carne',
          amount: 1000,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
    });
    const lines = formatGroupSummary(group, {
      asOf: '24 nov 2026, 10:42',
      link: 'https://dividy.app/shared#v1.abc',
    }).split('\n');
    expect(lines.slice(0, 3)).toEqual([
      '*Asado*',
      'Cuentas al 24 nov 2026, 10:42',
      '',
    ]);
    expect(lines.slice(-2)).toEqual([
      '',
      'Ver el detalle: https://dividy.app/shared#v1.abc',
    ]);
  });

  it('sin opciones el texto no lleva fecha ni link', () => {
    const group = makeGroup({ name: 'Asado', members: ['Ana'] });
    const text = formatGroupSummary(group);
    expect(text).not.toContain('Cuentas al');
    expect(text).not.toContain('Ver el detalle');
  });
});
