import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeBalances } from './balances';
import { groupArb } from './test-utils/arbitraries';
import { makeGroup, members } from './test-utils/fixtures';
import { getPendingAmount, suggestTransfers } from './transfers';
import {
  describeViewerStatus,
  isStaleViewerChoice,
  resolveViewer,
  viewerFirst,
} from './viewer';

const people = members('Ana', 'Beto', 'Carla');

describe('resolveViewer', () => {
  const cases = [
    ['sin elección: aún no se preguntó', null, { kind: 'unasked' }],
    [
      'miembro existente',
      { memberId: 'Beto' },
      { kind: 'member', memberId: 'Beto' },
    ],
    ['"none"', { none: true as const }, { kind: 'none' }],
    [
      'miembro que ya no existe: aún no se preguntó',
      { memberId: 'Zoe' },
      { kind: 'unasked' },
    ],
  ] as const;
  it.each(cases)('%s', (_name, choice, expected) => {
    expect(resolveViewer(people, choice)).toEqual(expected);
  });

  it('detecta una elección vieja solo cuando apunta a un miembro que falta', () => {
    expect(isStaleViewerChoice(people, { memberId: 'Zoe' })).toBe(true);
    expect(isStaleViewerChoice(people, { memberId: 'Ana' })).toBe(false);
    expect(isStaleViewerChoice(people, { none: true })).toBe(false);
    expect(isStaleViewerChoice(people, null)).toBe(false);
  });
});

describe('viewerFirst', () => {
  const items = [
    { fromId: 'Ana', toId: 'Beto' },
    { fromId: 'Carla', toId: 'Ana' },
    { fromId: 'Beto', toId: 'Carla' },
    { fromId: 'Carla', toId: 'Beto' },
  ];
  const involves = (id: string) => (t: { fromId: string; toId: string }) =>
    t.fromId === id || t.toId === id;

  it('pone primero lo del viewer (pague o reciba) y conserva el orden del resto', () => {
    expect(viewerFirst(items, 'Beto', involves('Beto'))).toEqual([
      items[0],
      items[2],
      items[3],
      items[1],
    ]);
    expect(viewerFirst(items, 'Ana', involves('Ana'))).toEqual([
      items[0],
      items[1],
      items[2],
      items[3],
    ]);
  });

  it('sin viewer no cambia el orden, y devuelve una copia', () => {
    const out = viewerFirst(items, null, involves('Ana'));
    expect(out).toEqual(items);
    expect(out).not.toBe(items);
  });

  it('si nada involucra al viewer, no cambia el orden', () => {
    expect(viewerFirst(items, 'Zoe', involves('Zoe'))).toEqual(items);
  });

  it('propiedad: conserva los elementos, deja primero los del viewer y mantiene el orden relativo', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { maxLength: 20 }),
        fc.option(fc.integer({ min: 0, max: 5 }), { nil: null }),
        (list, viewer) => {
          const all = list.map((n, i) => ({ n, i }));
          const out = viewerFirst(
            all,
            viewer === null ? null : String(viewer),
            (x) => x.n === viewer
          );
          // same elements, none lost or repeated
          expect([...out].sort((a, b) => a.i - b.i)).toEqual(all);
          const mine = out.filter((x) => x.n === viewer);
          const others = out.filter((x) => x.n !== viewer);
          if (viewer === null) expect(out).toEqual(all);
          else expect(out).toEqual([...mine, ...others]);
          // relative order inside each part
          for (const part of [mine, others]) {
            const indexes = part.map((x) => x.i);
            expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
          }
        }
      )
    );
  });
});

describe('describeViewerStatus', () => {
  // Ana pagó 12.000 entre tres: Beto y Carla deben 4.000 cada uno.
  const trip = makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      { amount: 12000, payer: 'Ana', among: ['Ana', 'Beto', 'Carla'] },
    ],
  });
  // Dani le debe a varios.
  const mixed = makeGroup({
    members: ['Ana', 'Beto', 'Carla', 'Dani'],
    expenses: [
      { amount: 9000, payer: 'Ana', among: ['Ana', 'Beto', 'Carla'] },
      { amount: 6000, payer: 'Beto', among: ['Carla', 'Dani'] },
      { amount: 4000, payer: 'Carla', among: ['Dani'] },
    ],
  });

  it('sin viewer: el titular de siempre, con el monto pendiente', () => {
    expect(describeViewerStatus(trip, null)).toEqual({
      kind: 'general',
      pending: 8000,
    });
  });

  it('un viewer que no está en el grupo se trata como sin viewer', () => {
    expect(describeViewerStatus(trip, 'Zoe')).toEqual({
      kind: 'general',
      pending: 8000,
    });
  });

  it('te deben: tu saldo a favor', () => {
    expect(describeViewerStatus(trip, 'Ana')).toEqual({
      kind: 'owed',
      amount: 8000,
    });
  });

  it('debes con una sola transferencia: el nombre de a quien le transfieres', () => {
    expect(describeViewerStatus(trip, 'Beto')).toEqual({
      kind: 'owes',
      amount: 4000,
      payTo: ['Ana'],
    });
  });

  it('debes con varias transferencias: todos los destinatarios y el monto total', () => {
    const status = describeViewerStatus(mixed, 'Dani');
    const sent = suggestTransfers(mixed).filter((t) => t.fromId === 'Dani');
    expect(sent.length).toBeGreaterThan(1);
    expect(status).toEqual({
      kind: 'owes',
      amount: sent.reduce((sum, t) => sum + t.amount, 0),
      payTo: sent.map((t) => t.toId),
    });
  });

  it('estás al día pero el grupo no', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [{ amount: 3000, payer: 'Ana', among: ['Ana', 'Beto'] }],
    });
    // Carla no participa ni paga: saldo 0.
    expect(describeViewerStatus(group, 'Carla')).toEqual({
      kind: 'even',
      groupPending: 1500,
    });
  });

  it('todo el grupo al día: se mantiene el titular del grupo, haya viewer o no', () => {
    const settled = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [{ amount: 2000, payer: 'Ana', among: ['Ana', 'Beto'] }],
      payments: [{ from: 'Beto', to: 'Ana', amount: 1000 }],
    });
    expect(describeViewerStatus(settled, 'Ana')).toEqual({
      kind: 'group-settled',
    });
    expect(describeViewerStatus(settled, null)).toEqual({
      kind: 'group-settled',
    });
  });

  it('un grupo sin gastos está al día', () => {
    const empty = makeGroup({ members: ['Ana', 'Beto'] });
    expect(describeViewerStatus(empty, 'Ana')).toEqual({
      kind: 'group-settled',
    });
  });

  it('propiedad: el monto del titular coincide con el saldo del viewer y con sus transferencias', () => {
    fc.assert(
      fc.property(groupArb({ minMembers: 2 }), fc.nat(), (group, n) => {
        const viewer = group.members[n % group.members.length];
        const status = describeViewerStatus(group, viewer.id);
        const balance = computeBalances(group).find(
          (b) => b.memberId === viewer.id
        )!.balance;
        const pending = getPendingAmount(group);
        if (pending === 0) {
          expect(status).toEqual({ kind: 'group-settled' });
        } else if (balance < 0) {
          const sent = suggestTransfers(group).filter(
            (t) => t.fromId === viewer.id
          );
          expect(status).toMatchObject({ kind: 'owes', amount: -balance });
          expect(sent.reduce((s, t) => s + t.amount, 0)).toBe(-balance);
          expect(status).toHaveProperty('payTo.length', sent.length);
        } else if (balance > 0) {
          expect(status).toEqual({ kind: 'owed', amount: balance });
        } else {
          expect(status).toEqual({ kind: 'even', groupPending: pending });
        }
      })
    );
  });
});
