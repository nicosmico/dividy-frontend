import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { buildExplanation } from './build-explanation';
import { buildExampleGroup } from './example-group';
import { joinList, narrate } from './narration';
import { buildShareSteps } from './share-steps';

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

describe('narrate, gastos con división personalizada', () => {
  const members = ['Ana', 'Beto', 'Carla'];
  const explain = (split: unknown, amount = 150_000) =>
    buildExplanation(
      makeGroup({
        members,
        expenses: [
          {
            id: 'e1',
            description: 'Cabaña',
            amount,
            payer: 'Ana',
            among: members,
            split: { participantIds: members, ...(split as object) } as never,
          },
          {
            id: 'e2',
            description: 'Pan',
            amount: 3000,
            payer: 'Beto',
            among: ['Ana', 'Beto'],
          },
        ],
      })
    );
  const stepText = (e: ReturnType<typeof explain>) =>
    narrate(e, 1, false, buildShareSteps(e)[0]);

  it('partes: "Ana pone 2 partes y los demás 1"', () => {
    expect(
      stepText(
        explain({ type: 'shares', parts: { Ana: 2, Beto: 1, Carla: 1 } })
      )
    ).toBe(
      'Ana pagó Cabaña ($150.000). Cabaña se divide por partes: Ana pone 2 partes y los demás 1.'
    );
  });

  it('partes todas distintas se nombran una por una', () => {
    expect(
      stepText(
        explain({ type: 'shares', parts: { Ana: 3, Beto: 1, Carla: 2 } })
      )
    ).toBe(
      'Ana pagó Cabaña ($150.000). Cabaña se divide por partes: Ana pone 3 partes, Beto 1 y Carla 2.'
    );
  });

  it('montos', () => {
    expect(
      stepText(
        explain({
          type: 'exact',
          amounts: { Ana: 50_000, Beto: 40_000, Carla: 60_000 },
        })
      )
    ).toBe(
      'Ana pagó Cabaña ($150.000). Cabaña se divide por montos: Ana pone $50.000, Beto $40.000 y Carla $60.000.'
    );
  });

  it('porcentaje', () => {
    expect(
      stepText(
        explain({
          type: 'percent',
          basisPoints: { Ana: 5000, Beto: 2500, Carla: 2500 },
        })
      )
    ).toBe(
      'Ana pagó Cabaña ($150.000). Cabaña se divide por porcentaje: Ana pone 50 % y los demás 25 %.'
    );
  });

  it('el resumen del paso 2 dice cuáles gastos no son iguales', () => {
    const e = explain({ type: 'shares', parts: { Ana: 2, Beto: 1, Carla: 1 } });
    expect(narrate(e, 1)).toBe(
      'Cada gasto se divide entre quienes lo comparten: Cabaña entre los 3, por partes; Pan solo entre Ana y Beto. Sumando, sale la parte de cada uno.'
    );
  });

  it('los gastos iguales siguen igual', () => {
    const e = buildExplanation(
      makeGroup({
        members,
        expenses: [{ id: 'e1', amount: 9000, payer: 'Ana', among: members }],
      })
    );
    expect(narrate(e, 1, false, buildShareSteps(e)[0])).toBe(
      'Ana pagó Gasto 1 ($9.000). Se divide entre 3: $3.000 cada uno.'
    );
  });
});
