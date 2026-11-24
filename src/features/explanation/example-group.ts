import {
  addExpense,
  addPayment,
  createGroup,
  suggestTransfers,
  type Group,
  type Result,
} from '@/domain';

const EXAMPLE_NOW = '2026-01-10T12:00:00.000Z';
const EXAMPLE_DATE = '2026-01-10';

/**
 * The welcome example (decision 90), built with the real domain and never
 * saved: Ana pays the meat, Carla the drinks (only Beto and Carla share them)
 * and Beto the lodging.
 */
export function buildExampleGroup(): Group {
  let group: Group = unwrap(
    createGroup({
      id: 'example',
      name: 'Asado entre amigos',
      members: [
        { id: 'ana', name: 'Ana' },
        { id: 'beto', name: 'Beto' },
        { id: 'carla', name: 'Carla' },
      ],
      now: EXAMPLE_NOW,
    })
  );
  const everyone = ['ana', 'beto', 'carla'];
  const expenses = [
    { description: 'Carne', amount: 30000, payerId: 'ana', among: everyone },
    {
      description: 'Bebidas',
      amount: 15000,
      payerId: 'carla',
      among: ['beto', 'carla'],
    },
    {
      description: 'Alojamiento',
      amount: 45000,
      payerId: 'beto',
      among: everyone,
    },
  ];
  expenses.forEach((e, i) => {
    group = unwrap(
      addExpense(group, {
        id: `example-e${i + 1}`,
        description: e.description,
        amount: e.amount,
        payerId: e.payerId,
        split: { type: 'equal', participantIds: e.among },
        date: EXAMPLE_DATE,
        createdAt: `2026-01-10T12:00:0${i}.000Z`,
      })
    );
  });
  return group;
}

/**
 * The group after registering, in memory, every suggested transfer as a
 * payment. Used to show the "settled" end of the animation; never saved.
 */
export function settleGroup(group: Group): Group {
  const date = group.expenses.reduce(
    (latest, e) => (e.date > latest ? e.date : latest),
    EXAMPLE_DATE
  );
  return suggestTransfers(group).reduce<Group>((next, transfer, i) => {
    const result = addPayment(next, {
      id: `settle-${i + 1}`,
      fromId: transfer.fromId,
      toId: transfer.toId,
      amount: transfer.amount,
      date,
      createdAt: group.updatedAt,
    });
    return result.ok ? result.value : next;
  }, group);
}

function unwrap(result: Result<Group>): Group {
  if (!result.ok) throw new Error('The welcome example must be a valid group');
  return result.value;
}
