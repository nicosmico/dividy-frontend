import {
  validateAmount,
  validateDate,
  validateDescription,
  validateExpenseFields,
  type DomainErrorCode,
  type ExpenseFields,
  type Group,
  type MemberId,
} from '@/domain';

export interface ExpenseFormValues {
  description: string;
  /** Digits only, e.g. `"10000"` (the input shows `10.000`). */
  amount: string;
  payerId: MemberId;
  participantIds: MemberId[];
  /** `YYYY-MM-DD` */
  date: string;
}

export type ExpenseFormField = keyof ExpenseFormValues;
export type ExpenseFormErrors = Partial<Record<ExpenseFormField, string>>;

/** Whole pesos from the digits typed in the amount input (`NaN` when empty). */
export function parseAmount(digits: string): number {
  return digits === '' ? NaN : Number(digits);
}

/** `10000` → `"10.000"`; keeps only digits and drops leading zeros. */
export function formatDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function onlyDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
}

const FIELD_OF_CODE: Partial<Record<DomainErrorCode, ExpenseFormField>> = {
  payer_not_found: 'payerId',
  no_participants: 'participantIds',
  participant_not_found: 'participantIds',
  duplicate_participant: 'participantIds',
};

/**
 * Validates the form with the domain's rules. Returns the normalized fields
 * or the message of every wrong field.
 */
export function validateExpenseForm(
  group: Pick<Group, 'members'>,
  values: ExpenseFormValues
): { fields: ExpenseFields } | { errors: ExpenseFormErrors } {
  const errors: ExpenseFormErrors = {};
  const description = validateDescription(values.description);
  if (!description.ok) errors.description = description.error.message;
  const amount = validateAmount(parseAmount(values.amount));
  if (!amount.ok) errors.amount = amount.error.message;
  const date = validateDate(values.date);
  if (!date.ok) errors.date = date.error.message;

  // Participants are saved in member order, so the data does not depend on
  // the order of the clicks.
  const chosen = new Set(values.participantIds);
  const whole = validateExpenseFields(group, {
    description: description.ok ? description.value : 'Gasto',
    amount: amount.ok ? amount.value : 1,
    date: date.ok ? date.value : '2000-01-01',
    payerId: values.payerId,
    split: {
      type: 'equal',
      participantIds: group.members
        .map((m) => m.id)
        .filter((id) => chosen.has(id)),
    },
  });
  if (!whole.ok) {
    errors[FIELD_OF_CODE[whole.error.code] ?? 'description'] =
      whole.error.message;
  }

  if (Object.keys(errors).length > 0 || !whole.ok) return { errors };
  return { fields: whole.value };
}
