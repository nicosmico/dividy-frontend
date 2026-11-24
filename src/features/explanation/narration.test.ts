import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { buildExplanation } from './build-explanation';
import { buildExampleGroup } from './example-group';
import { joinList, narrate } from './narration';

describe('joinList', () => {
  it.each([
    [[], ''],
    [['a'], 'a'],
    [['a', 'b'], 'a y b'],
    [['a', 'b', 'c'], 'a, b y c'],
  ])('%j', (items, expected) => {
    expect(joinList(items)).toBe(expected);
  });
});

describe('narrate, ejemplo de la bienvenida', () => {
  const explanation = buildExplanation(buildExampleGroup());

  it('paso 1: quién pagó qué', () => {
    expect(narrate(explanation, 0)).toBe(
      'Ana pagó Carne ($30.000), Beto pagó Alojamiento ($45.000) y Carla pagó Bebidas ($15.000).'
    );
  });

  it('paso 2: entre quiénes se divide cada gasto', () => {
    expect(narrate(explanation, 1)).toBe(
      'Cada gasto se divide entre quienes lo comparten: Alojamiento y Carne entre los 3; Bebidas solo entre Beto y Carla. Sumando, sale la parte de cada uno.'
    );
  });

  it('paso 3: la comparación', () => {
    expect(narrate(explanation, 2)).toBe(
      'Se compara lo que gastó cada uno con su parte: a Ana le deben $5.000, a Beto le deben $12.500 y Carla debe $17.500.'
    );
  });

  it('paso 4: las transferencias y el final feliz', () => {
    expect(narrate(explanation, 3, true)).toBe(
      'Carla le transfiere $12.500 a Beto y $5.000 a Ana. Ahora cada uno pagó exactamente su parte: ¡están al día!'
    );
  });
});

describe('narrate, grupos reales', () => {
  it('con muchos gastos y miembros resume en vez de listar', () => {
    const group = makeGroup({
      members: ['A', 'B', 'C', 'D', 'E', 'F'],
      expenses: Array.from({ length: 6 }, (_, i) => ({
        amount: 1000 * (i + 1),
        payer: 'A',
        among: ['A', 'B', 'C', 'D', 'E', 'F'],
      })),
    });
    const e = buildExplanation(group);
    expect(narrate(e, 0)).toBe(
      'Se registraron 6 gastos por $21.000 en total. La barra "Gastó" muestra cuánto gastó cada uno, dividido por gasto.'
    );
    expect(narrate(e, 1)).toBe(
      'Cada gasto se divide entre quienes lo comparten. Sumando todos los gastos, sale la parte de cada uno.'
    );
    expect(narrate(e, 2)).toBe(
      'Se compara lo que gastó cada uno con su parte: 1 persona tiene saldo a favor y 5 deben.'
    );
  });

  it('con pagos registrados lo dice, y sin transferencias pendientes está al día', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [{ amount: 6000, payer: 'Ana', among: ['Ana', 'Beto'] }],
      payments: [{ from: 'Beto', to: 'Ana', amount: 3000 }],
    });
    const e = buildExplanation(group);
    expect(narrate(e, 2)).toContain('Ya cuenta los pagos registrados.');
    expect(narrate(e, 3)).toBe(
      'Ya se registró 1 pago. No falta ninguna transferencia: ¡están al día!'
    );
  });

  it('con pagos y transferencias pendientes explica lo que falta', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [{ amount: 6000, payer: 'Ana', among: ['Ana', 'Beto'] }],
      payments: [{ from: 'Beto', to: 'Ana', amount: 1000 }],
    });
    expect(narrate(buildExplanation(group), 3)).toBe(
      'Ya se registró 1 pago. Para quedar al día: Beto le transfiere $2.000 a Ana. Con eso, cada uno habrá pagado exactamente su parte.'
    );
  });

  it('sin gastos', () => {
    const e = buildExplanation(makeGroup({ members: ['Ana'] }));
    expect(narrate(e, 0)).toBe('Todavía no hay gastos.');
  });
});
