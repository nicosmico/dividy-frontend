import { isValidAmount, MAX_AMOUNT } from './money';
import { fail, ok } from './result';
import type {
  Amount,
  Expense,
  Group,
  MemberId,
  Payment,
  Result,
} from './types';

export const MAX_GROUP_NAME_LENGTH = 40;
export const MAX_MEMBER_NAME_LENGTH = 40;
export const MAX_DESCRIPTION_LENGTH = 80;

/** Fields the user provides for an expense (the rest is generated). */
export type ExpenseFields = Omit<Expense, 'id' | 'createdAt'>;
/** Fields the user provides for a payment (the rest is generated). */
export type PaymentFields = Omit<Payment, 'id' | 'createdAt'>;

function validateText(
  value: string,
  max: number,
  code: 'invalid_group_name' | 'invalid_member_name' | 'invalid_description',
  label: string
): Result<string> {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length === 0) return fail(code, `${label} no puede estar vacío.`);
  if (trimmed.length > max) {
    return fail(code, `${label} no puede tener más de ${max} caracteres.`);
  }
  return ok(trimmed);
}

/** Returns the trimmed name. */
export function validateGroupName(name: string): Result<string> {
  return validateText(
    name,
    MAX_GROUP_NAME_LENGTH,
    'invalid_group_name',
    'El nombre del grupo'
  );
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns the trimmed name. Names must be unique in the group ignoring case and
 * surrounding spaces; `exceptId` skips that member (used when renaming).
 */
export function validateMemberName(
  group: Pick<Group, 'members'>,
  name: string,
  exceptId?: MemberId
): Result<string> {
  const valid = validateText(
    name,
    MAX_MEMBER_NAME_LENGTH,
    'invalid_member_name',
    'El nombre'
  );
  if (!valid.ok) return valid;
  const key = normalizeName(valid.value);
  const clash = group.members.some(
    (m) => m.id !== exceptId && normalizeName(m.name) === key
  );
  if (clash) {
    return fail(
      'duplicate_member_name',
      `Ya hay alguien llamado "${valid.value}" en el grupo.`
    );
  }
  return valid;
}

/** Returns the trimmed description. */
export function validateDescription(description: string): Result<string> {
  return validateText(
    description,
    MAX_DESCRIPTION_LENGTH,
    'invalid_description',
    'La descripción'
  );
}

export function validateAmount(amount: unknown): Result<Amount> {
  if (!isValidAmount(amount)) {
    return fail(
      'invalid_amount',
      `El monto debe ser un número entero de pesos entre 1 y ${MAX_AMOUNT.toLocaleString('es-CL')}.`
    );
  }
  return ok(amount);
}

/** Accepts a real calendar date formatted `YYYY-MM-DD`. */
export function validateDate(date: string): Result<string> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match) {
    const [year, month, day] = [+match[1], +match[2], +match[3]];
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    ) {
      return ok(date);
    }
  }
  return fail('invalid_date', 'La fecha no es válida.');
}

/** Validates an expense against the group and returns it normalized (trimmed). */
export function validateExpenseFields(
  group: Pick<Group, 'members'>,
  fields: ExpenseFields
): Result<ExpenseFields> {
  const description = validateDescription(fields.description);
  if (!description.ok) return description;
  const amount = validateAmount(fields.amount);
  if (!amount.ok) return amount;
  const date = validateDate(fields.date);
  if (!date.ok) return date;

  const memberIds = new Set(group.members.map((m) => m.id));
  if (!memberIds.has(fields.payerId)) {
    return fail('payer_not_found', 'Quien pagó no es parte del grupo.');
  }
  const { participantIds } = fields.split;
  if (participantIds.length === 0) {
    return fail(
      'no_participants',
      'Elige al menos una persona para dividir el gasto.'
    );
  }
  if (new Set(participantIds).size !== participantIds.length) {
    return fail(
      'duplicate_participant',
      'Hay personas repetidas en la división.'
    );
  }
  if (!participantIds.every((id) => memberIds.has(id))) {
    return fail(
      'participant_not_found',
      'Alguien de la división no es parte del grupo.'
    );
  }
  return ok({
    description: description.value,
    amount: amount.value,
    payerId: fields.payerId,
    split: { type: 'equal', participantIds: [...participantIds] },
    date: date.value,
  });
}

/** Validates a payment against the group and returns it normalized. */
export function validatePaymentFields(
  group: Pick<Group, 'members'>,
  fields: PaymentFields
): Result<PaymentFields> {
  const amount = validateAmount(fields.amount);
  if (!amount.ok) return amount;
  const date = validateDate(fields.date);
  if (!date.ok) return date;
  if (fields.fromId === fields.toId) {
    return fail(
      'same_member_payment',
      'Un pago no puede ser de una persona a sí misma.'
    );
  }
  const memberIds = new Set(group.members.map((m) => m.id));
  if (!memberIds.has(fields.fromId) || !memberIds.has(fields.toId)) {
    return fail(
      'member_not_found',
      'Las personas del pago deben ser parte del grupo.'
    );
  }
  return ok({
    fromId: fields.fromId,
    toId: fields.toId,
    amount: amount.value,
    date: date.value,
  });
}

/**
 * Lists every invariant a group breaks (empty array = valid). Useful to
 * validate data read from storage.
 */
export function getGroupIssues(group: Group): string[] {
  const issues: string[] = [];
  const gName = validateGroupName(group.name);
  if (!gName.ok || gName.value !== group.name) {
    issues.push('invalid group name');
  }

  const ids = new Set<MemberId>();
  const names = new Set<string>();
  for (const member of group.members) {
    if (ids.has(member.id)) issues.push(`duplicate member id ${member.id}`);
    ids.add(member.id);
    const name = validateMemberName({ members: [] }, member.name);
    if (!name.ok) issues.push(`invalid member name ${member.id}`);
    const key = normalizeName(member.name);
    if (names.has(key)) issues.push(`duplicate member name ${member.name}`);
    names.add(key);
  }

  const seen = new Set<string>();
  for (const e of group.expenses) {
    if (seen.has(e.id)) issues.push(`duplicate expense id ${e.id}`);
    seen.add(e.id);
    const r = validateExpenseFields(group, e);
    if (!r.ok) issues.push(`expense ${e.id}: ${r.error.code}`);
  }
  const seenPayments = new Set<string>();
  for (const p of group.payments) {
    if (seenPayments.has(p.id)) issues.push(`duplicate payment id ${p.id}`);
    seenPayments.add(p.id);
    const r = validatePaymentFields(group, p);
    if (!r.ok) issues.push(`payment ${p.id}: ${r.error.code}`);
  }
  return issues;
}
