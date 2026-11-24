import { AVATAR_COLOR_COUNT } from '../avatar';
import type { Expense, Group, Member, Payment } from '../types';

export const NOW = '2026-01-01T12:00:00.000Z';
export const TODAY = '2026-01-01';

/** Members whose id equals their name, e.g. `members('A', 'B')`. */
export function members(...names: string[]): Member[] {
  return names.map((name, index) => ({
    id: name,
    name,
    avatar: { color: index % AVATAR_COLOR_COUNT, seed: name },
  }));
}

interface ExpenseSpec {
  id?: string;
  description?: string;
  amount: number;
  payer: string;
  among: string[];
  date?: string;
  createdAt?: string;
}

interface PaymentSpec {
  id?: string;
  from: string;
  to: string;
  amount: number;
  date?: string;
  createdAt?: string;
}

export function makeExpense(spec: ExpenseSpec, index = 0): Expense {
  return {
    id: spec.id ?? `e${index + 1}`,
    description: spec.description ?? `Gasto ${index + 1}`,
    amount: spec.amount,
    payerId: spec.payer,
    split: { type: 'equal', participantIds: spec.among },
    date: spec.date ?? TODAY,
    createdAt: spec.createdAt ?? NOW,
  };
}

export function makePayment(spec: PaymentSpec, index = 0): Payment {
  return {
    id: spec.id ?? `p${index + 1}`,
    fromId: spec.from,
    toId: spec.to,
    amount: spec.amount,
    date: spec.date ?? TODAY,
    createdAt: spec.createdAt ?? NOW,
  };
}

export function makeGroup(options: {
  members: string[];
  expenses?: ExpenseSpec[];
  payments?: PaymentSpec[];
  name?: string;
}): Group {
  return {
    id: 'g1',
    name: options.name ?? 'Grupo',
    currency: 'CLP',
    members: members(...options.members),
    expenses: (options.expenses ?? []).map(makeExpense),
    payments: (options.payments ?? []).map(makePayment),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/** The four-expense group from the plan's findings (it used to produce "$0" transfers). */
export function billsGroup(): Group {
  return makeGroup({
    members: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    expenses: [
      { amount: 1000, payer: 'A', among: ['A', 'B', 'C'] },
      { amount: 700, payer: 'B', among: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
      { amount: 333, payer: 'C', among: ['B', 'C', 'D'] },
      { amount: 10, payer: 'D', among: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
    ],
  });
}
