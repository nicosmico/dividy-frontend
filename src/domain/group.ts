import { nextAvatarColor, validateAvatar } from './avatar';
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from './currency';
import { fail, ok } from './result';
import { redistributeSplit } from './split';
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

/**
 * What the caller provides for a new member. The avatar color is assigned by
 * the domain; the seed is the member id unless `avatarSeed` says otherwise
 * (e.g. the user regenerated the face before the group was created).
 */
export interface NewMemberInput {
  id: MemberId;
  name: string;
  avatarSeed?: string;
}

export interface CreateGroupInput {
  id: GroupId;
  name: string;
  members: NewMemberInput[];
  /** Defaults to CLP. Fixed once the group has expenses or payments (ADR 0009). */
  currency?: CurrencyCode;
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

/**
 * `none` only works for a member without activity; `redistribute` is the
 * single way to remove one that has it (ADR 0010).
 */
export type RemoveMemberStrategy = { type: 'none' } | { type: 'redistribute' };

export interface MemberRemovalImpact {
  /** Expenses the member paid. */
  paidExpenses: Expense[];
  /** Expenses the member participates in (may overlap with `paidExpenses`). */
  participatingExpenses: Expense[];
  /** Payments the member sent or received. */
  payments: Payment[];
  /**
   * Expenses removing the member deletes: the ones they paid and the ones
   * where they were the only participant (nobody left to take their share).
   */
  deletedExpenses: Expense[];
  /** Expenses that stay, where their share is divided among the other participants. */
  redistributedExpenses: Expense[];
  /**
   * The redistributed expenses divided by parts: they become amounts, since a
   * part cannot be divided (ADR 0010).
   */
  expensesConvertedToAmounts: Expense[];
  /** `true` when the member has any activity, so a strategy other than `none` is needed. */
  requiresStrategy: boolean;
}

export function createGroup(input: CreateGroupInput): Result<Group> {
  const name = validateGroupName(input.name);
  if (!name.ok) return name;
  const currency = input.currency ?? DEFAULT_CURRENCY;
  if (!isCurrencyCode(currency)) {
    return fail('invalid_currency', 'Elige una de las monedas de la lista.');
  }

  const members: Member[] = [];
  const ids = new Set<MemberId>();
  for (const member of input.members) {
    if (ids.has(member.id)) {
      return fail(
        'duplicate_member_id',
        'No se pudo crear el grupo porque hay miembros repetidos. Inténtalo de nuevo.'
      );
    }
    ids.add(member.id);
    const valid = validateMemberName({ members }, member.name);
    if (!valid.ok) return valid;
    const avatar = validateAvatar({
      color: nextAvatarColor(members),
      seed: member.avatarSeed ?? member.id,
    });
    if (!avatar.ok) return avatar;
    members.push({ id: member.id, name: valid.value, avatar: avatar.value });
  }

  return ok({
    id: input.id,
    name: name.value,
    currency,
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

export function addMember(group: Group, member: NewMemberInput): Result<Group> {
  if (group.members.some((m) => m.id === member.id)) {
    return fail(
      'duplicate_member_id',
      'No se pudo agregar al miembro porque ya existe. Inténtalo de nuevo.'
    );
  }
  const name = validateMemberName(group, member.name);
  if (!name.ok) return name;
  const avatar = validateAvatar({
    color: nextAvatarColor(group.members),
    seed: member.avatarSeed ?? member.id,
  });
  if (!avatar.ok) return avatar;
  return ok({
    ...group,
    members: [
      ...group.members,
      { id: member.id, name: name.value, avatar: avatar.value },
    ],
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
  return fail(
    'member_not_found',
    'Ese miembro ya no está en el grupo. Vuelve a la lista de miembros.'
  );
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
  const deletedExpenses = group.expenses.filter(
    (e) =>
      e.payerId === memberId || participantsOf(e).every((id) => id === memberId)
  );
  const deletedIds = new Set(deletedExpenses.map((e) => e.id));
  const redistributedExpenses = participatingExpenses.filter(
    (e) => !deletedIds.has(e.id)
  );
  const expensesConvertedToAmounts = redistributedExpenses.filter(
    (e) => e.split.type === 'shares'
  );
  return ok({
    paidExpenses,
    participatingExpenses,
    payments,
    deletedExpenses,
    redistributedExpenses,
    expensesConvertedToAmounts,
    requiresStrategy:
      paidExpenses.length > 0 ||
      participatingExpenses.length > 0 ||
      payments.length > 0,
  });
}

/**
 * Removes a member (ADR 0010). `none` only works when they have no activity.
 * `redistribute` deletes the expenses they paid and their payments, and in the
 * expenses they only took part in divides their share equally among the other
 * participants (`redistributeSplit`); an expense where nobody else took part is
 * deleted. Never leaves an expense without participants.
 */
export function removeMember(
  group: Group,
  memberId: MemberId,
  strategy: RemoveMemberStrategy
): Result<Group> {
  const impact = getMemberRemovalImpact(group, memberId);
  if (!impact.ok) return impact;
  const members = group.members.filter((m) => m.id !== memberId);

  if (strategy.type === 'none') {
    if (impact.value.requiresStrategy) {
      return fail(
        'member_has_activity',
        'Esta persona tiene gastos o pagos. Elimínala repartiendo su parte entre los demás.'
      );
    }
    return ok({ ...group, members });
  }

  const expenses: Expense[] = [];
  for (const e of group.expenses) {
    if (e.payerId === memberId) continue;
    const split = redistributeSplit(e, memberId, group.members);
    if (split) expenses.push(split === e.split ? e : { ...e, split });
  }
  const payments = group.payments.filter(
    (p) => p.fromId !== memberId && p.toId !== memberId
  );
  return ok({ ...group, members, expenses, payments });
}

export function addExpense(
  group: Group,
  input: NewExpenseInput
): Result<Group> {
  if (group.expenses.some((e) => e.id === input.id)) {
    return fail(
      'duplicate_id',
      'No se pudo guardar el gasto porque ya existe uno igual. Inténtalo de nuevo.'
    );
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
    return fail(
      'expense_not_found',
      'Ese gasto ya no existe. Vuelve a la lista de gastos.'
    );
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
    return fail(
      'expense_not_found',
      'Ese gasto ya no existe. Vuelve a la lista de gastos.'
    );
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
    return fail(
      'duplicate_id',
      'No se pudo registrar el pago porque ya existe uno igual. Inténtalo de nuevo.'
    );
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
    return fail('payment_not_found', 'Ese pago ya no existe. Vuelve a Saldos.');
  }
  return ok({
    ...group,
    payments: group.payments.filter((p) => p.id !== paymentId),
  });
}

/** Sum of every expense amount in the group (payments are not expenses). */
export function getTotalSpent(group: Pick<Group, 'expenses'>): number {
  return group.expenses.reduce((sum, expense) => sum + expense.amount, 0);
}
