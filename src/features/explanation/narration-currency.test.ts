import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { buildExplanation } from './build-explanation';
import { describeDivision } from './cuts';
import { narrate } from './narration';

const flat = (text: string) => text.replace(/\s/g, ' ');

const usd = () =>
  makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    currency: 'USD',
    expenses: [
      {
        id: 'e1',
        description: 'Cena',
        amount: 1001,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
    ],
  });

describe('narración en USD', () => {
  it('lleva la moneda del grupo en la explicación', () => {
    expect(buildExplanation(usd()).currency).toBe('USD');
  });

  it('cada paso habla en dólares y el redondeo es de un centavo', () => {
    const explanation = buildExplanation(usd());
    expect(flat(narrate(explanation, 0))).toBe('Ana pagó Cena (US$10,01).');
    const share = flat(
      narrate(explanation, 1, false, {
        kind: 'expense',
        expenseIds: ['e1'],
        revealedIds: ['e1'],
      })
    );
    expect(share).toContain('Se divide entre 3: US$3,33 cada uno.');
    expect(share).toContain('A Ana y Beto les toca US$0,01 más por redondeo.');
    expect(share).not.toContain('$1 más');
    expect(flat(narrate(explanation, 2))).toContain('a Ana le deben US$6,67');
    expect(flat(narrate(explanation, 3))).toContain(
      'Beto le transfiere US$3,34 a Ana'
    );
  });

  it('en CLP el redondeo sigue siendo "$1 más"', () => {
    const clp = makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [
        {
          id: 'e1',
          description: 'Cena',
          amount: 1001,
          payer: 'Ana',
          among: ['Ana', 'Beto', 'Carla'],
        },
      ],
    });
    const share = narrate(buildExplanation(clp), 1, false, {
      kind: 'expense',
      expenseIds: ['e1'],
      revealedIds: ['e1'],
    });
    expect(share).toContain('les toca $1 más por redondeo');
  });

  it('la división del tooltip usa centavos', () => {
    const [expense] = buildExplanation(usd()).expenses;
    expect(flat(describeDivision(expense, 'USD') ?? '')).toBe(
      'entre 3: US$3,34 / US$3,34 / US$3,33'
    );
  });
});
