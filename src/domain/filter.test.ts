import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  expenseShareOf,
  filterExpenses,
  filterNeedsViewer,
  normalizeSearchText,
  parseExpenseFilter,
  searchWords,
  serializeExpenseFilter,
  summarizeExpenses,
  type ExpenseFilter,
} from './filter';
import { computeShares } from './split';
import { groupArb } from './test-utils/arbitraries';
import { makeGroup } from './test-utils/fixtures';
import type { Expense, Group } from './types';

const ALL_SPLITS = ['equal', 'exact', 'percent', 'shares'] as const;

function trip() {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        id: 'e1',
        description: 'Cabaña en el sur',
        amount: 90000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
      {
        id: 'e2',
        description: 'Taxi al aeropuerto',
        amount: 10000,
        payer: 'Beto',
        among: ['Ana', 'Beto'],
      },
      {
        id: 'e3',
        description: 'Bencina',
        amount: 20001,
        payer: 'Carla',
        among: ['Beto', 'Carla'],
      },
      {
        id: 'e4',
        description: 'Café con leche',
        amount: 3000,
        payer: 'Ana',
        among: ['Ana'],
      },
    ],
  });
}

const ids = (expenses: Expense[]) => expenses.map((e) => e.id);

describe('normalizeSearchText y searchWords', () => {
  it.each([
    ['Cabaña', 'cabana'],
    ['CAFÉ', 'cafe'],
    ['Último   día', 'ultimo   dia'],
    ['', ''],
  ])('normaliza "%s" a "%s"', (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });

  it('parte en palabras y descarta los espacios sobrantes', () => {
    expect(searchWords('  Café   con  ')).toEqual(['cafe', 'con']);
    expect(searchWords('   ')).toEqual([]);
    expect(searchWords('')).toEqual([]);
  });
});

describe('filterExpenses (tabla de casos)', () => {
  const group = trip();
  it.each<[string, ExpenseFilter | null, string, string | null, string[]]>([
    [
      'sin filtro ni búsqueda devuelve todo',
      null,
      '',
      'Ana',
      ['e1', 'e2', 'e3', 'e4'],
    ],
    [
      'sin viewer y sin filtro devuelve todo',
      null,
      '',
      null,
      ['e1', 'e2', 'e3', 'e4'],
    ],
    ['donde participo (Ana)', { kind: 'mine' }, '', 'Ana', ['e1', 'e2', 'e4']],
    ['donde participo (Carla)', { kind: 'mine' }, '', 'Carla', ['e1', 'e3']],
    ['pagué yo (Ana)', { kind: 'paid' }, '', 'Ana', ['e1', 'e4']],
    ['pagué yo (Beto)', { kind: 'paid' }, '', 'Beto', ['e2']],
    [
      'donde participo sin viewer no coincide con nada',
      { kind: 'mine' },
      '',
      null,
      [],
    ],
    [
      'pagué yo sin viewer no coincide con nada',
      { kind: 'paid' },
      '',
      null,
      [],
    ],
    [
      'persona participa',
      { kind: 'member', memberId: 'Beto' },
      '',
      null,
      ['e1', 'e2', 'e3'],
    ],
    ['persona pagó', { kind: 'paidby', memberId: 'Carla' }, '', null, ['e3']],
    [
      'persona sin gastos',
      { kind: 'paidby', memberId: 'Carla' },
      'taxi',
      null,
      [],
    ],
    ['búsqueda sin tilde encuentra con tilde', null, 'cabana', null, ['e1']],
    ['búsqueda con tilde encuentra sin tilde', null, 'bencína', null, ['e3']],
    ['mayúsculas no importan', null, 'TAXI', null, ['e2']],
    ['todas las palabras deben estar', null, 'cafe leche', null, ['e4']],
    ['las palabras pueden ir en otro orden', null, 'leche cafe', null, ['e4']],
    ['una palabra que falta descarta', null, 'cafe taxi', null, []],
    ['una parte de la palabra basta', null, 'aero', null, ['e2']],
    ['solo espacios no filtra', null, '   ', null, ['e1', 'e2', 'e3', 'e4']],
    [
      'filtro y búsqueda se intersectan',
      { kind: 'mine' },
      'a',
      'Carla',
      ['e1', 'e3'],
    ],
    ['intersección vacía', { kind: 'paid' }, 'taxi', 'Ana', []],
    [
      'intersección con persona',
      { kind: 'member', memberId: 'Beto' },
      'taxi',
      null,
      ['e2'],
    ],
  ])('%s', (_name, filter, query, viewerId, expected) => {
    expect(ids(filterExpenses(group, filter, query, viewerId))).toEqual(
      expected
    );
  });

  it('no modifica el grupo ni reordena', () => {
    const copy = structuredClone(group);
    const result = filterExpenses(group, null, '', null);
    expect(result).toEqual(copy.expenses);
    expect(group).toEqual(copy);
  });
});

describe('filterNeedsViewer', () => {
  it('solo "mine" y "paid" necesitan saber quién eres', () => {
    expect(filterNeedsViewer(null)).toBe(false);
    expect(filterNeedsViewer({ kind: 'mine' })).toBe(true);
    expect(filterNeedsViewer({ kind: 'paid' })).toBe(true);
    expect(filterNeedsViewer({ kind: 'member', memberId: 'Ana' })).toBe(false);
    expect(filterNeedsViewer({ kind: 'paidby', memberId: 'Ana' })).toBe(false);
  });
});

describe('expenseShareOf y summarizeExpenses (tabla de casos)', () => {
  const group = trip();

  it('la parte sale de computeShares (con resto) y es null si no participa', () => {
    const bencina = group.expenses[2];
    // 20001 entre dos: el resto va al primero según el orden de los miembros.
    expect(expenseShareOf(group, bencina, 'Beto')).toBe(10001);
    expect(expenseShareOf(group, bencina, 'Carla')).toBe(10000);
    expect(expenseShareOf(group, bencina, 'Ana')).toBeNull();
  });

  it('suma el total y las partes del viewer y de una persona', () => {
    const summary = summarizeExpenses(
      group,
      group.expenses.filter((e) => e.id !== 'e4'),
      'Beto',
      'Carla'
    );
    expect(summary).toEqual({
      count: 3,
      total: 120001,
      viewerShare: 30000 + 5000 + 10001,
      memberShare: 30000 + 10000,
    });
  });

  it('sin viewer ni persona las partes son null', () => {
    expect(summarizeExpenses(group, group.expenses, null)).toEqual({
      count: 4,
      total: 123001,
      viewerShare: null,
      memberShare: null,
    });
  });

  it('una lista vacía suma cero', () => {
    expect(summarizeExpenses(group, [], 'Ana', 'Beto')).toEqual({
      count: 0,
      total: 0,
      viewerShare: 0,
      memberShare: 0,
    });
  });

  it('con divisiones personalizadas y una moneda con decimales', () => {
    const usd = makeGroup({
      members: ['Ana', 'Beto'],
      currency: 'USD',
      expenses: [
        {
          description: 'A',
          amount: 1001,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
          split: {
            type: 'percent',
            participantIds: ['Ana', 'Beto'],
            basisPoints: { Ana: 3333, Beto: 6667 },
          },
        },
        {
          description: 'B',
          amount: 500,
          payer: 'Beto',
          among: ['Ana', 'Beto'],
          split: {
            type: 'exact',
            participantIds: ['Ana', 'Beto'],
            amounts: { Ana: 125, Beto: 375 },
          },
        },
      ],
    });
    const summary = summarizeExpenses(usd, usd.expenses, 'Ana');
    const manual = usd.expenses.reduce(
      (sum, e) => sum + (computeShares(e, usd.members).get('Ana') ?? 0),
      0
    );
    expect(summary.viewerShare).toBe(manual);
    expect(summary.total).toBe(1501);
  });
});

describe('parseExpenseFilter y serializeExpenseFilter', () => {
  const group = trip();
  it.each<[string | null | undefined, ExpenseFilter | null]>([
    ['mine', { kind: 'mine' }],
    ['paid', { kind: 'paid' }],
    ['member:Ana', { kind: 'member', memberId: 'Ana' }],
    ['paidby:Carla', { kind: 'paidby', memberId: 'Carla' }],
    ['member:Zoe', null],
    ['paidby:', null],
    ['otro:Ana', null],
    ['Ana', null],
    ['', null],
    [null, null],
    [undefined, null],
  ])('"%s"', (raw, expected) => {
    expect(parseExpenseFilter(raw, group)).toEqual(expected);
  });

  it('un id con ":" se conserva entero', () => {
    const odd: Pick<Group, 'members'> = {
      members: [{ id: 'a:b', name: 'X', avatar: { color: 0, seed: 'x' } }],
    };
    expect(parseExpenseFilter('member:a:b', odd)).toEqual({
      kind: 'member',
      memberId: 'a:b',
    });
  });

  it('serializar y leer da el mismo filtro', () => {
    const filters: ExpenseFilter[] = [
      { kind: 'mine' },
      { kind: 'paid' },
      { kind: 'member', memberId: 'Beto' },
      { kind: 'paidby', memberId: 'Ana' },
    ];
    for (const filter of filters) {
      expect(parseExpenseFilter(serializeExpenseFilter(filter), group)).toEqual(
        filter
      );
    }
  });
});

describe('propiedades (fast-check)', () => {
  const RUNS = { numRuns: 200 };
  const wordArb = fc.constantFrom(
    'Cabaña',
    'taxi',
    'Café',
    'ÁRBOL',
    'pan',
    'día',
    'Bencina'
  );
  const descriptionArb = fc
    .array(wordArb, { minLength: 1, maxLength: 3 })
    .map((words) => words.join(' '));

  /** A group with random descriptions, every kind of split and any currency. */
  const groupWithTextArb = groupArb({
    minMembers: 2,
    maxExpenses: 12,
    splits: [...ALL_SPLITS],
  }).chain((group) =>
    fc
      .array(descriptionArb, {
        minLength: group.expenses.length,
        maxLength: group.expenses.length,
      })
      .map((descriptions): Group => ({
        ...group,
        expenses: group.expenses.map((e, i) => ({
          ...e,
          description: descriptions[i],
        })),
      }))
  );

  const filterArb = (group: Group): fc.Arbitrary<ExpenseFilter | null> =>
    fc.oneof(
      fc.constant(null),
      fc.constant<ExpenseFilter>({ kind: 'mine' }),
      fc.constant<ExpenseFilter>({ kind: 'paid' }),
      fc
        .constantFrom(...group.members.map((m) => m.id))
        .map((memberId): ExpenseFilter => ({ kind: 'member', memberId })),
      fc
        .constantFrom(...group.members.map((m) => m.id))
        .map((memberId): ExpenseFilter => ({ kind: 'paidby', memberId }))
    );

  const caseArb = groupWithTextArb.chain((group) =>
    fc.record({
      group: fc.constant(group),
      filter: filterArb(group),
      viewerId: fc.oneof(
        fc.constant(null),
        fc.constantFrom(...group.members.map((m) => m.id))
      ),
      query: fc.oneof(fc.constant(''), descriptionArb, wordArb),
    })
  );

  const isSubsequence = (sub: Expense[], all: Expense[]) => {
    let i = 0;
    for (const e of all) if (i < sub.length && sub[i] === e) i++;
    return i === sub.length;
  };

  it('sin filtro ni búsqueda devuelve todo, en el mismo orden', () => {
    fc.assert(
      fc.property(groupWithTextArb, fc.constantFrom(null, 'a'), (group, v) => {
        expect(filterExpenses(group, null, '', v)).toEqual(group.expenses);
      }),
      RUNS
    );
  });

  it('cada filtro devuelve un subconjunto en orden que cumple la condición', () => {
    fc.assert(
      fc.property(caseArb, ({ group, filter, viewerId }) => {
        const result = filterExpenses(group, filter, '', viewerId);
        expect(isSubsequence(result, group.expenses)).toBe(true);
        for (const e of result) {
          if (!filter) continue;
          if (filter.kind === 'mine')
            expect(e.split.participantIds).toContain(viewerId);
          if (filter.kind === 'paid') expect(e.payerId).toBe(viewerId);
          if (filter.kind === 'member')
            expect(e.split.participantIds).toContain(filter.memberId);
          if (filter.kind === 'paidby') expect(e.payerId).toBe(filter.memberId);
        }
        // Nothing that fulfils the condition is left out.
        const kept = new Set(result);
        for (const e of group.expenses) {
          if (kept.has(e) || !filter) continue;
          if (filter.kind === 'mine')
            expect(e.split.participantIds).not.toContain(viewerId);
          if (filter.kind === 'paidby')
            expect(e.payerId).not.toBe(filter.memberId);
        }
      }),
      RUNS
    );
  });

  it('la búsqueda ignora mayúsculas y tildes', () => {
    fc.assert(
      fc.property(groupWithTextArb, descriptionArb, (group, query) => {
        const plain = filterExpenses(group, null, query, null);
        const shouted = filterExpenses(
          group,
          null,
          query.toLocaleUpperCase('es-CL'),
          null
        );
        const stripped = filterExpenses(
          group,
          null,
          query.normalize('NFD').replace(/\p{M}/gu, ''),
          null
        );
        expect(shouted).toEqual(plain);
        expect(stripped).toEqual(plain);
      }),
      RUNS
    );
  });

  it('una descripción siempre se encuentra a sí misma, y por palabras en cualquier orden', () => {
    fc.assert(
      fc.property(groupWithTextArb, (group) => {
        for (const e of group.expenses) {
          const own = filterExpenses(group, null, e.description, null);
          expect(own).toContain(e);
          const reversed = e.description.split(' ').reverse().join(' ');
          expect(filterExpenses(group, null, reversed, null)).toEqual(own);
        }
      }),
      RUNS
    );
  });

  it('agregar una palabra nunca agrega resultados', () => {
    fc.assert(
      fc.property(groupWithTextArb, descriptionArb, wordArb, (g, q, extra) => {
        const base = filterExpenses(g, null, q, null);
        const narrower = filterExpenses(g, null, `${q} ${extra}`, null);
        expect(isSubsequence(narrower, base)).toBe(true);
      }),
      RUNS
    );
  });

  it('filtro + búsqueda es la intersección de cada uno por separado', () => {
    fc.assert(
      fc.property(caseArb, ({ group, filter, viewerId, query }) => {
        const both = filterExpenses(group, filter, query, viewerId);
        const byFilter = new Set(filterExpenses(group, filter, '', viewerId));
        const byQuery = new Set(filterExpenses(group, null, query, viewerId));
        const expected = group.expenses.filter(
          (e) => byFilter.has(e) && byQuery.has(e)
        );
        expect(both).toEqual(expected);
      }),
      RUNS
    );
  });

  it('el resumen suma los montos y la parte del viewer es la suma de computeShares', () => {
    fc.assert(
      fc.property(caseArb, ({ group, filter, viewerId, query }) => {
        fc.pre(viewerId !== null);
        const expenses = filterExpenses(group, filter, query, viewerId);
        const other = group.members[group.members.length - 1].id;
        const summary = summarizeExpenses(group, expenses, viewerId, other);
        expect(summary.count).toBe(expenses.length);
        expect(summary.total).toBe(
          expenses.reduce((sum, e) => sum + e.amount, 0)
        );
        const reference = (memberId: string) =>
          expenses.reduce(
            (sum, e) =>
              sum + (computeShares(e, group.members).get(memberId) ?? 0),
            0
          );
        expect(summary.viewerShare).toBe(reference(viewerId as string));
        expect(summary.memberShare).toBe(reference(other));
      }),
      RUNS
    );
  });

  it('las partes de todos los miembros suman el total del resumen', () => {
    fc.assert(
      fc.property(groupWithTextArb, (group) => {
        const summary = summarizeExpenses(group, group.expenses, null);
        const sharesSum = group.members.reduce(
          (sum, m) =>
            sum +
            (summarizeExpenses(group, group.expenses, m.id).viewerShare ?? 0),
          0
        );
        expect(sharesSum).toBe(summary.total);
      }),
      RUNS
    );
  });

  it('serializar y leer el filtro es la identidad', () => {
    fc.assert(
      fc.property(caseArb, ({ group, filter }) => {
        fc.pre(filter !== null);
        expect(
          parseExpenseFilter(
            serializeExpenseFilter(filter as ExpenseFilter),
            group
          )
        ).toEqual(filter);
      }),
      RUNS
    );
  });
});
