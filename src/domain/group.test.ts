import { describe, expect, it } from 'vitest';
import {
  addExpense,
  addMember,
  addPayment,
  createGroup,
  getMemberRemovalImpact,
  getTotalSpent,
  removeExpense,
  removeMember,
  removePayment,
  renameGroup,
  renameMember,
  touch,
  updateExpense,
} from './group';
import { getGroupIssues } from './validation';
import type { Group, Result } from './types';
import { NOW, makeGroup, members } from './test-utils/fixtures';

function unwrap<T>(result: Result<T>): T {
  if (!result.ok)
    throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}
const code = (r: Result<unknown>) => (r.ok ? 'ok' : r.error.code);

const expenseInput = {
  id: 'e9',
  description: 'Pizza',
  amount: 900,
  payerId: 'A',
  split: { type: 'equal' as const, participantIds: ['A', 'B'] },
  date: '2026-01-02',
  createdAt: NOW,
};

describe('createGroup', () => {
  it('crea un grupo en CLP con los timestamps recibidos', () => {
    const group = unwrap(
      createGroup({
        id: 'g1',
        name: '  Viaje ',
        members: members('A', 'B'),
        now: NOW,
      })
    );
    expect(group).toEqual({
      id: 'g1',
      name: 'Viaje',
      currency: 'CLP',
      members: members('A', 'B'),
      expenses: [],
      payments: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it.each([
    [
      'nombre vacío',
      { name: ' ', members: members('A') },
      'invalid_group_name',
    ],
    [
      'miembro con nombre vacío',
      { name: 'G', members: [{ id: 'a', name: '' }] },
      'invalid_member_name',
    ],
    [
      'nombres repetidos',
      {
        name: 'G',
        members: [
          { id: 'a', name: 'Ana' },
          { id: 'b', name: ' ana ' },
        ],
      },
      'duplicate_member_name',
    ],
    [
      'ids repetidos',
      {
        name: 'G',
        members: [
          { id: 'a', name: 'Ana' },
          { id: 'a', name: 'Beto' },
        ],
      },
      'duplicate_member_id',
    ],
  ])('rechaza %s', (_n, input, expected) => {
    expect(code(createGroup({ id: 'g', now: NOW, ...input }))).toBe(expected);
  });

  it('acepta un grupo sin miembros', () => {
    expect(
      code(createGroup({ id: 'g', name: 'G', members: [], now: NOW }))
    ).toBe('ok');
  });
});

describe('renameGroup / touch', () => {
  const group = makeGroup({ members: ['A'] });
  it('renombra con trim y no toca updatedAt', () => {
    const renamed = unwrap(renameGroup(group, ' Nuevo '));
    expect(renamed.name).toBe('Nuevo');
    expect(renamed.updatedAt).toBe(group.updatedAt);
  });
  it('rechaza nombres inválidos', () => {
    expect(code(renameGroup(group, ''))).toBe('invalid_group_name');
  });
  it('touch actualiza sólo updatedAt sin mutar el original', () => {
    const touched = touch(group, '2027-01-01T00:00:00.000Z');
    expect(touched.updatedAt).toBe('2027-01-01T00:00:00.000Z');
    expect({ ...touched, updatedAt: group.updatedAt }).toEqual(group);
    expect(group.updatedAt).toBe(NOW);
  });
});

describe('addMember / renameMember', () => {
  const group = makeGroup({ members: ['Ana', 'Beto'] });

  it('agrega al final con el nombre recortado', () => {
    const next = unwrap(addMember(group, { id: 'c', name: ' Cami ' }));
    expect(next.members.map((m) => m.name)).toEqual(['Ana', 'Beto', 'Cami']);
    expect(group.members).toHaveLength(2);
  });

  it.each([
    ['nombre repetido', { id: 'x', name: 'ANA' }, 'duplicate_member_name'],
    ['id repetido', { id: 'Ana', name: 'Otra' }, 'duplicate_member_id'],
    ['nombre vacío', { id: 'x', name: '' }, 'invalid_member_name'],
  ])('addMember rechaza %s', (_n, member, expected) => {
    expect(code(addMember(group, member))).toBe(expected);
  });

  it('renameMember cambia el nombre manteniendo el id y el orden', () => {
    const next = unwrap(renameMember(group, 'Ana', 'Anita'));
    expect(next.members).toEqual([
      { ...group.members[0], name: 'Anita' },
      group.members[1],
    ]);
  });

  it('renameMember permite cambiar sólo mayúsculas de sí mismo', () => {
    expect(unwrap(renameMember(group, 'Ana', 'ANA')).members[0].name).toBe(
      'ANA'
    );
  });

  it('renameMember rechaza el nombre de otro y miembros inexistentes', () => {
    expect(code(renameMember(group, 'Ana', 'beto'))).toBe(
      'duplicate_member_name'
    );
    expect(code(renameMember(group, 'Z', 'X'))).toBe('member_not_found');
  });
});

describe('expenses', () => {
  const group = makeGroup({ members: ['A', 'B', 'C'] });

  it('addExpense agrega el gasto con id y createdAt recibidos', () => {
    const next = unwrap(addExpense(group, expenseInput));
    expect(next.expenses).toEqual([expenseInput]);
    expect(group.expenses).toEqual([]);
  });

  it('addExpense rechaza datos inválidos e ids repetidos', () => {
    expect(code(addExpense(group, { ...expenseInput, amount: 0 }))).toBe(
      'invalid_amount'
    );
    const withOne = unwrap(addExpense(group, expenseInput));
    expect(code(addExpense(withOne, expenseInput))).toBe('duplicate_id');
  });

  it('updateExpense reemplaza los campos y conserva id y createdAt', () => {
    const withOne = unwrap(addExpense(group, expenseInput));
    const { id: _id, createdAt: _c, ...fields } = expenseInput;
    void _id;
    void _c;
    const next = unwrap(
      updateExpense(withOne, 'e9', {
        ...fields,
        amount: 1200,
        description: ' Cena ',
      })
    );
    expect(next.expenses[0]).toMatchObject({
      id: 'e9',
      createdAt: NOW,
      amount: 1200,
      description: 'Cena',
    });
  });

  it('updateExpense falla si el gasto no existe o los datos son inválidos', () => {
    const withOne = unwrap(addExpense(group, expenseInput));
    const { id: _id, createdAt: _c, ...fields } = expenseInput;
    void _id;
    void _c;
    expect(code(updateExpense(withOne, 'nope', fields))).toBe(
      'expense_not_found'
    );
    expect(
      code(updateExpense(withOne, 'e9', { ...fields, payerId: 'Z' }))
    ).toBe('payer_not_found');
  });

  it('updateExpense sólo modifica el gasto indicado (regresión del bug de tarjetas)', () => {
    let g = unwrap(addExpense(group, expenseInput));
    g = unwrap(
      addExpense(g, { ...expenseInput, id: 'e10', description: 'Otro' })
    );
    const { id: _id, createdAt: _c, ...fields } = expenseInput;
    void _id;
    void _c;
    g = unwrap(updateExpense(g, 'e10', { ...fields, description: 'Editado' }));
    expect(g.expenses.map((e) => e.description)).toEqual(['Pizza', 'Editado']);
  });

  it('removeExpense elimina por id, no por posición', () => {
    let g = unwrap(addExpense(group, expenseInput));
    g = unwrap(
      addExpense(g, { ...expenseInput, id: 'e10', description: 'Otro' })
    );
    g = unwrap(removeExpense(g, 'e9'));
    expect(g.expenses.map((e) => e.id)).toEqual(['e10']);
    expect(code(removeExpense(g, 'e9'))).toBe('expense_not_found');
  });
});

describe('payments', () => {
  const group = makeGroup({ members: ['A', 'B'] });
  const input = {
    id: 'p1',
    fromId: 'A',
    toId: 'B',
    amount: 100,
    date: '2026-01-02',
    createdAt: NOW,
  };

  it('addPayment agrega y removePayment elimina', () => {
    const g = unwrap(addPayment(group, input));
    expect(g.payments).toEqual([input]);
    expect(unwrap(removePayment(g, 'p1')).payments).toEqual([]);
  });

  it.each([
    ['a sí mismo', { ...input, toId: 'A' }, 'same_member_payment'],
    ['monto 0', { ...input, amount: 0 }, 'invalid_amount'],
    ['miembro inexistente', { ...input, toId: 'Z' }, 'member_not_found'],
  ])('addPayment rechaza %s', (_n, p, expected) => {
    expect(code(addPayment(group, p))).toBe(expected);
  });

  it('addPayment rechaza ids repetidos y removePayment ids inexistentes', () => {
    const g = unwrap(addPayment(group, input));
    expect(code(addPayment(g, input))).toBe('duplicate_id');
    expect(code(removePayment(g, 'nope'))).toBe('payment_not_found');
  });
});

describe('getMemberRemovalImpact / removeMember', () => {
  // A paga e1 (A,B,C); B paga e2 (B,C); C paga e3 (A); D paga e4 (D sola) ; E sin movimientos
  const group: Group = makeGroup({
    members: ['A', 'B', 'C', 'D', 'E'],
    expenses: [
      { id: 'e1', amount: 900, payer: 'A', among: ['A', 'B', 'C'] },
      { id: 'e2', amount: 300, payer: 'B', among: ['B', 'C'] },
      { id: 'e3', amount: 90, payer: 'C', among: ['A'] },
      { id: 'e4', amount: 50, payer: 'D', among: ['D'] },
    ],
    payments: [
      { id: 'p1', from: 'B', to: 'A', amount: 10 },
      { id: 'p2', from: 'A', to: 'C', amount: 20 },
    ],
  });

  it('describe el impacto: pagados, participaciones, pagos, borrados y repartidos', () => {
    const impact = unwrap(getMemberRemovalImpact(group, 'A'));
    expect(impact.paidExpenses.map((e) => e.id)).toEqual(['e1']);
    expect(impact.participatingExpenses.map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(impact.payments.map((p) => p.id)).toEqual(['p1', 'p2']);
    // e1 (la pagó) y e3 (A era su único participante)
    expect(impact.deletedExpenses.map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(impact.redistributedExpenses).toEqual([]);
    expect(impact.requiresStrategy).toBe(true);
  });

  it('un miembro sin movimientos no requiere estrategia', () => {
    const impact = unwrap(getMemberRemovalImpact(group, 'E'));
    expect(impact).toEqual({
      paidExpenses: [],
      participatingExpenses: [],
      payments: [],
      deletedExpenses: [],
      redistributedExpenses: [],
      expensesConvertedToAmounts: [],
      requiresStrategy: false,
    });
  });

  it('el impacto de un miembro inexistente es un error', () => {
    expect(code(getMemberRemovalImpact(group, 'Z'))).toBe('member_not_found');
    expect(code(removeMember(group, 'Z', { type: 'none' }))).toBe(
      'member_not_found'
    );
  });

  describe('none', () => {
    it('elimina a quien no tiene movimientos', () => {
      const next = unwrap(removeMember(group, 'E', { type: 'none' }));
      expect(next.members.map((m) => m.id)).toEqual(['A', 'B', 'C', 'D']);
      expect(next.expenses).toEqual(group.expenses);
    });
    it.each(['A', 'B', 'D'])('rechaza a %s porque tiene movimientos', (id) => {
      expect(code(removeMember(group, id, { type: 'none' }))).toBe(
        'member_has_activity'
      );
    });
    it('rechaza a quien sólo aparece en pagos', () => {
      const g = makeGroup({
        members: ['A', 'B'],
        payments: [{ from: 'A', to: 'B', amount: 5 }],
      });
      expect(code(removeMember(g, 'A', { type: 'none' }))).toBe(
        'member_has_activity'
      );
    });
  });

  describe('redistribute', () => {
    it('borra sus gastos y pagos y reparte su parte en los demás', () => {
      const next = unwrap(removeMember(group, 'B', { type: 'redistribute' }));
      expect(next.members.map((m) => m.id)).toEqual(['A', 'C', 'D', 'E']);
      expect(next.expenses.map((e) => [e.id, e.split.participantIds])).toEqual([
        ['e1', ['A', 'C']],
        ['e3', ['A']],
        ['e4', ['D']],
      ]);
      expect(next.payments.map((p) => p.id)).toEqual(['p2']);
      expect(getGroupIssues(next)).toEqual([]);
    });

    it('borra los gastos que quedarían sin participantes (nunca deja gastos huérfanos)', () => {
      const next = unwrap(removeMember(group, 'A', { type: 'redistribute' }));
      // e1 la pagó A; e3 tenía a A como único participante
      expect(next.expenses.map((e) => e.id)).toEqual(['e2', 'e4']);
      expect(next.payments).toEqual([]);
      expect(
        next.expenses.every((e) => e.split.participantIds.length > 0)
      ).toBe(true);
      expect(getGroupIssues(next)).toEqual([]);
    });

    it('lo que dice el impacto coincide con lo que se borra y se reparte', () => {
      for (const m of group.members) {
        const impact = unwrap(getMemberRemovalImpact(group, m.id));
        const next = unwrap(
          removeMember(group, m.id, { type: 'redistribute' })
        );
        expect(group.expenses.length - next.expenses.length).toBe(
          impact.deletedExpenses.length
        );
        expect(
          impact.redistributedExpenses.length + impact.deletedExpenses.length
        ).toBe(
          new Set(
            [...impact.participatingExpenses, ...impact.paidExpenses].map(
              (e) => e.id
            )
          ).size
        );
      }
    });
  });
});

describe('getTotalSpent', () => {
  it('suma los gastos y ignora los pagos', () => {
    const group = makeGroup({
      members: ['A', 'B'],
      expenses: [
        { amount: 1000, payer: 'A', among: ['A', 'B'] },
        { amount: 2500, payer: 'B', among: ['A'] },
      ],
      payments: [{ from: 'A', to: 'B', amount: 300 }],
    });
    expect(getTotalSpent(group)).toBe(3500);
  });

  it('es 0 sin gastos', () => {
    expect(getTotalSpent(makeGroup({ members: ['A'] }))).toBe(0);
  });
});

describe('mayúscula inicial en las operaciones', () => {
  const base = () => makeGroup({ members: ['Ana', 'Beto'] });
  const value = <T>(r: Result<T>): T => {
    if (!r.ok) throw new Error(r.error.code);
    return r.value;
  };

  it('createGroup capitaliza el grupo y los miembros', () => {
    const g = value(
      createGroup({
        id: 'g',
        name: 'viaje al sur',
        members: [
          { id: 'a', name: 'ana' },
          { id: 'b', name: 'beto' },
        ],
        now: NOW,
      })
    );
    expect(g.name).toBe('Viaje al sur');
    expect(g.members.map((m) => m.name)).toEqual(['Ana', 'Beto']);
  });

  it('createGroup rechaza "ana" y "Ana" juntos', () => {
    const r = createGroup({
      id: 'g',
      name: 'x',
      members: [
        { id: 'a', name: 'ana' },
        { id: 'b', name: 'Ana' },
      ],
      now: NOW,
    });
    expect(r.ok).toBe(false);
  });

  it('renameGroup, addMember y renameMember capitalizan', () => {
    let g = value(renameGroup(base(), 'casa'));
    expect(g.name).toBe('Casa');
    g = value(addMember(g, { id: 'c', name: 'carla' }));
    expect(g.members[2].name).toBe('Carla');
    g = value(renameMember(g, 'c', 'ñuñoa'));
    expect(g.members[2].name).toBe('Ñuñoa');
  });

  it('addExpense y updateExpense capitalizan la descripción', () => {
    const fields = {
      description: 'pizza',
      amount: 1000,
      payerId: 'Ana',
      split: { type: 'equal' as const, participantIds: ['Ana', 'Beto'] },
      date: '2026-01-01',
    };
    let g = value(addExpense(base(), { ...fields, id: 'e1', createdAt: NOW }));
    expect(g.expenses[0].description).toBe('Pizza');
    g = value(updateExpense(g, 'e1', { ...fields, description: 'bebidas' }));
    expect(g.expenses[0].description).toBe('Bebidas');
  });
});
