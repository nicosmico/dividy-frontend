import { fail, ok } from './result';
import type {
  Expense,
  ExpenseId,
  Group,
  GroupId,
  Member,
  MemberId,
  Payment,
  PaymentId,
  Result,
} from './types';
import {
  validateExpenseFields,
  validateGroupName,
  validateMemberName,
  validatePaymentFields,
  type ExpenseFields,
  type PaymentFields,
} from './validation';

export interface CreateGroupInput {
  id: GroupId;
  name: string;
  members: Member[];
  /** ISO timestamp used for `createdAt` and `updatedAt`. */
  now: string;
}

export type NewExpenseInput = ExpenseFields & {
  id: ExpenseId;
  createdAt: string;
};
export type NewPaymentInput = PaymentFields & {
  id: PaymentId;
  createdAt: string;
};

export type RemoveMemberStrategy =
  | { type: 'none' }
  | { type: 'reassign'; toMemberId: MemberId }
  | { type: 'cascade' };

export interface MemberRemovalImpact {
  /** Expenses the member paid. */
  paidExpenses: Expense[];
  /** Expenses the member participates in (may overlap with `paidExpenses`). */
  participatingExpenses: Expense[];
  /** Payments the member sent or received. */
  payments: Payment[];
  /** Expenses that a cascade delete would remove (paid by them, or left without participants). */
  expensesDeletedByCascade: Expense[];
  /** `true` when the member has any activity, so a strategy other than `none` is needed. */
  requiresStrategy: boolean;
}

export function createGroup(input: CreateGroupInput): Result<Group> {
  const name = validateGroupName(input.name);
  if (!name.ok) return name;

  const members: Member[] = [];
  const ids = new Set<MemberId>();
  for (const member of input.members) {
    if (ids.has(member.id)) {
      return fail(
        'duplicate_member_id',
        'Hay miembros con el mismo identificador.'
      );
    }
    ids.add(member.id);
    const valid = validateMemberName({ members }, member.name);
    if (!valid.ok) return valid;
    members.push({ id: member.id, name: valid.value });
  }

  return ok({
    id: input.id,
    name: name.value,
    currency: 'CLP',
    members,
    expenses: [],
    payments: [],
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function renameGroup(group: Group, name: string): Result<Group> {
  const valid = validateGroupName(name);
  if (!valid.ok) return valid;
  return ok({ ...group, name: valid.value });
}

/** Returns the group with a new `updatedAt`. Other operations never touch timestamps. */
export function touch(group: Group, now: string): Group {
  return { ...group, updatedAt: now };
}

export function addMember(group: Group, member: Member): Result<Group> {
  if (group.members.some((m) => m.id === member.id)) {
    return fail(
      'duplicate_member_id',
      'Ya existe un miembro con ese identificador.'
    );
  }
  const name = validateMemberName(group, member.name);
  if (!name.ok) return name;
  return ok({
    ...group,
    members: [...group.members, { id: member.id, name: name.value }],
  });
}

export function renameMember(
  group: Group,
  memberId: MemberId,
  name: string
): Result<Group> {
  if (!group.members.some((m) => m.id === memberId)) return memberNotFound();
  const valid = validateMemberName(group, name, memberId);
  if (!valid.ok) return valid;
  return ok({
    ...group,
    members: group.members.map((m) =>
      m.id === memberId ? { ...m, name: valid.value } : m
    ),
  });
}

function memberNotFound<T>(): Result<T> {
  return fail('member_not_found', 'Ese miembro no existe en el grupo.');
}

function participantsOf(expense: Expense): MemberId[] {
  return expense.split.participantIds;
}

export function getMemberRemovalImpact(
  group: Group,
  memberId: MemberId
): Result<MemberRemovalImpact> {
  if (!group.members.some((m) => m.id === memberId)) return memberNotFound();
  const paidExpenses = group.expenses.filter((e) => e.payerId === memberId);
  const participatingExpenses = group.expenses.filter((e) =>
    participantsOf(e).includes(memberId)
  );
  const payments = group.payments.filter(
    (p) => p.fromId === memberId || p.toId === memberId
  );
  const expensesDeletedByCascade = group.expenses.filter(
    (e) =>
      e.payerId === memberId || participantsOf(e).every((id) => id === memberId)
  );
  return ok({
    paidExpenses,
    participatingExpenses,
    payments,
    expensesDeletedByCascade,
    requiresStrategy:
      paidExpenses.length > 0 ||
      participatingExpenses.length > 0 ||
      payments.length > 0,
  });
}

/**
 * Removes a member (ADR 0003). `none` only works when the member has no
 * activity; `reassign` hands everything to another member; `cascade` deletes
 * their expenses and payments and drops them from other expenses (deleting
 * the ones left without participants). Never leaves an expense without participants.
 */
export function removeMember(
  group: Group,
  memberId: MemberId,
  strategy: RemoveMemberStrategy
): Result<Group> {
  const impact = getMemberRemovalImpact(group, memberId);
  if (!impact.ok) return impact;
  const members = group.members.filter((m) => m.id !== memberId);

  switch (strategy.type) {
    case 'none':
      if (impact.value.requiresStrategy) {
        return fail(
          'member_has_activity',
          'Esta persona tiene gastos o pagos. Reasigna o elimina sus movimientos.'
        );
      }
      return ok({ ...group, members });

    case 'reassign': {
      const target = strategy.toMemberId;
      if (target === memberId || !members.some((m) => m.id === target)) {
        return fail(
          'invalid_reassign_target',
          'Elige a otra persona del grupo para reasignar.'
        );
      }
      const swap = (id: MemberId) => (id === memberId ? target : id);
      const expenses = group.expenses.map((e): Expense => {
        if (e.payerId !== memberId && !participantsOf(e).includes(memberId)) {
          return e;
        }
        const participantIds = [...new Set(participantsOf(e).map(swap))];
        return {
          ...e,
          payerId: swap(e.payerId),
          split: { ...e.split, participantIds },
        };
      });
      const payments = group.payments
        .map((p): Payment => ({
          ...p,
          fromId: swap(p.fromId),
          toId: swap(p.toId),
        }))
        .filter((p) => p.fromId !== p.toId);
      return ok({ ...group, members, expenses, payments });
    }

    case 'cascade': {
      const expenses: Expense[] = [];
      for (const e of group.expenses) {
        if (e.payerId === memberId) continue;
        const participantIds = participantsOf(e).filter(
          (id) => id !== memberId
        );
        if (participantIds.length === 0) continue;
        expenses.push(
          participantIds.length === participantsOf(e).length
            ? e
            : { ...e, split: { ...e.split, participantIds } }
        );
      }
      const payments = group.payments.filter(
        (p) => p.fromId !== memberId && p.toId !== memberId
      );
      return ok({ ...group, members, expenses, payments });
    }
  }
}

export function addExpense(
  group: Group,
  input: NewExpenseInput
): Result<Group> {
  if (group.expenses.some((e) => e.id === input.id)) {
    return fail('duplicate_id', 'Ya existe un gasto con ese identificador.');
  }
  const fields = validateExpenseFields(group, input);
  if (!fields.ok) return fields;
  const expense: Expense = {
    ...fields.value,
    id: input.id,
    createdAt: input.createdAt,
  };
  return ok({ ...group, expenses: [...group.expenses, expense] });
}

export function updateExpense(
  group: Group,
  expenseId: ExpenseId,
  fields: ExpenseFields
): Result<Group> {
  const existing = group.expenses.find((e) => e.id === expenseId);
  if (!existing) {
    return fail('expense_not_found', 'Ese gasto no existe.');
  }
  const valid = validateExpenseFields(group, fields);
  if (!valid.ok) return valid;
  return ok({
    ...group,
    expenses: group.expenses.map((e) =>
      e.id === expenseId
        ? { ...valid.value, id: e.id, createdAt: e.createdAt }
        : e
    ),
  });
}

export function removeExpense(
  group: Group,
  expenseId: ExpenseId
): Result<Group> {
  if (!group.expenses.some((e) => e.id === expenseId)) {
    return fail('expense_not_found', 'Ese gasto no existe.');
  }
  return ok({
    ...group,
    expenses: group.expenses.filter((e) => e.id !== expenseId),
  });
}

export function addPayment(
  group: Group,
  input: NewPaymentInput
): Result<Group> {
  if (group.payments.some((p) => p.id === input.id)) {
    return fail('duplicate_id', 'Ya existe un pago con ese identificador.');
  }
  const fields = validatePaymentFields(group, input);
  if (!fields.ok) return fields;
  const payment: Payment = {
    ...fields.value,
    id: input.id,
    createdAt: input.createdAt,
  };
  return ok({ ...group, payments: [...group.payments, payment] });
}

export function removePayment(
  group: Group,
  paymentId: PaymentId
): Result<Group> {
  if (!group.payments.some((p) => p.id === paymentId)) {
    return fail('payment_not_found', 'Ese pago no existe.');
  }
  return ok({
    ...group,
    payments: group.payments.filter((p) => p.id !== paymentId),
  });
}
