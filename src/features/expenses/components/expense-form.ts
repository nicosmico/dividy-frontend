import {
  formatAmount,
  formatPercent,
  FULL_PERCENT,
  presetSplit,
  validateAmount,
  validateDate,
  validateDescription,
  validateExpenseFields,
  type DomainErrorCode,
  type ExpenseFields,
  type Group,
  type Member,
  type MemberId,
  type Split,
  type SplitType,
} from '@/domain';

export interface ExpenseFormValues {
  description: string;
  /** Digits only, e.g. `"10000"` (the input shows `10.000`). */
  amount: string;
  payerId: MemberId;
  participantIds: MemberId[];
  /** `YYYY-MM-DD` */
  date: string;
  /** How the expense is divided; `equal` is the default. */
  splitType: SplitType;
  /**
   * What each participant's field says in a custom split, as the user sees it
   * (`"10.000"`, `"12,5"`, `"2"`). One entry per participant; empty for `equal`.
   */
  splitValues: Record<MemberId, string>;
}

export type ExpenseFormField = keyof ExpenseFormValues;
export type ExpenseFormErrors = Partial<Record<ExpenseFormField, string>>;

/** The three kinds of split that carry a number per participant. */
export type CustomSplitType = Exclude<SplitType, 'equal'>;

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

/** Characters allowed while typing in a participant's field (the rest is dropped). */
export function sanitizeSplitInput(type: SplitType, text: string): string {
  if (type === 'percent') return text.replace(/[^\d.,]/g, '').slice(0, 7);
  if (type === 'shares') return text.replace(/\D/g, '').slice(0, 6);
  return text.replace(/[^\d.]/g, '').slice(0, 13);
}

function parsePercent(text: string): number {
  const compact = text.replace(/[\s%]/g, '');
  if (compact === '') return 0;
  // With a comma, dots are thousands separators (the Chilean way); without
  // one, a single dot is a decimal point ("12.5", as typed on other keyboards).
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return NaN;
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/**
 * What a participant's field means: pesos (`exact`), basis points
 * (`percent`, so `"12,5"` is `1250`) or parts. Empty is `0`; text that is not
 * a valid number for the type is `NaN`.
 */
export function parseSplitValue(type: SplitType, text: string): number {
  if (type === 'percent') return parsePercent(text);
  if (text.includes(',')) return NaN;
  const digits = text.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

/** The text of a field for a value (what the user sees after leaving it). */
export function formatSplitValue(type: SplitType, value: number): string {
  if (type === 'percent') {
    return (value / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 });
  }
  if (type === 'exact') return formatDigits(String(value));
  return String(value);
}

/** Tidies a field when the user leaves it: `"10000"` → `"10.000"`, `"12.50"` → `"12,5"`. */
export function normalizeSplitText(type: SplitType, text: string): string {
  const value = parseSplitValue(type, text);
  return text.trim() === '' || Number.isNaN(value)
    ? text
    : formatSplitValue(type, value);
}

/** The text the fields of a split start with. */
export function splitToValues(split: Split): Record<MemberId, string> {
  const entries: [MemberId, number][] =
    split.type === 'exact'
      ? Object.entries(split.amounts)
      : split.type === 'percent'
        ? Object.entries(split.basisPoints)
        : split.type === 'shares'
          ? Object.entries(split.parts)
          : [];
  return Object.fromEntries(
    entries.map(([id, value]) => [id, formatSplitValue(split.type, value)])
  );
}

/**
 * The fields a mode starts with, already adding up: `exact` is today's equal
 * split in pesos (empty while there is no amount yet), `percent` an equal
 * split of 100 % and `shares` one part each.
 */
export function presetValues(
  type: SplitType,
  amount: number,
  participantIds: readonly MemberId[],
  members: readonly Member[]
): Record<MemberId, string> {
  if (type === 'equal') return {};
  if (type === 'exact' && !(amount >= 1)) {
    return Object.fromEntries(participantIds.map((id) => [id, '']));
  }
  return splitToValues(presetSplit(type, amount, participantIds, members));
}

/** What a newly checked participant starts with in a custom split. */
export function startingValue(type: SplitType): string {
  return type === 'shares' ? '1' : '0';
}

/** How far the values are from adding up (for the live status line). */
export interface SplitStatus {
  tone: 'ok' | 'warn' | 'info';
  /** The text before the verdict, e.g. "Asignado $90.000 de $100.000". */
  lead: string;
  /** The verdict, e.g. "faltan $10.000" or "Cuadra". */
  tail: string;
}

/**
 * The live status line under the participants of a custom split. `values`
 * are the numbers of the fields (`NaN` counts as 0). `amount` is `NaN` while
 * the expense has no valid amount yet.
 */
export function describeSplitStatus(
  type: CustomSplitType,
  amount: number,
  values: readonly number[]
): SplitStatus {
  const clean = values.map((v) => (Number.isFinite(v) ? v : 0));
  const total = clean.reduce((sum, v) => sum + v, 0);
  if (type === 'shares') {
    return clean.some((v) => v < 1)
      ? { tone: 'warn', lead: '', tail: 'Cada parte debe ser al menos 1.' }
      : {
          tone: 'info',
          lead: `${total} ${total === 1 ? 'parte' : 'partes'} en total`,
          tail: '',
        };
  }
  if (type === 'percent') {
    const diff = FULL_PERCENT - total;
    if (diff === 0) return { tone: 'ok', lead: '', tail: '100 %' };
    return {
      tone: 'warn',
      lead: `Suma ${formatPercent(total)}`,
      tail:
        diff > 0
          ? `faltan ${formatPercent(diff)}`
          : `te pasaste por ${formatPercent(-diff)}`,
    };
  }
  if (!(amount >= 1)) {
    return {
      tone: 'info',
      lead: `Asignado ${formatAmount(total)}`,
      tail: 'ingresa el monto para ver cuánto falta',
    };
  }
  const diff = amount - total;
  const lead = `Asignado ${formatAmount(total)} de ${formatAmount(amount)}`;
  if (diff === 0) return { tone: 'ok', lead, tail: 'Cuadra' };
  return {
    tone: 'warn',
    lead,
    tail:
      diff > 0
        ? `faltan ${formatAmount(diff)}`
        : `te pasaste por ${formatAmount(-diff)}`,
  };
}

const INVALID_TEXT: Record<CustomSplitType, (name: string) => string> = {
  exact: (name) => `Revisa el monto de ${name}: usa solo pesos enteros.`,
  percent: (name) =>
    `Revisa el porcentaje de ${name}: usa hasta 2 decimales, como 12,5.`,
  shares: (name) => `Revisa las partes de ${name}: usa números enteros.`,
};

/**
 * The split the form describes, with participants in group order (so the
 * data does not depend on the order of the clicks), or the message of the
 * first field that cannot be read. It is not checked against the amount yet.
 */
export function readSplit(
  members: readonly Member[],
  values: Pick<
    ExpenseFormValues,
    'participantIds' | 'splitType' | 'splitValues'
  >
): { split: Split } | { error: string } {
  const chosen = new Set(values.participantIds);
  const participantIds = members
    .filter((m) => chosen.has(m.id))
    .map((m) => m.id);
  const { splitType: type } = values;
  if (type === 'equal') return { split: { type, participantIds } };

  const parsed: Record<MemberId, number> = {};
  for (const member of members) {
    if (!chosen.has(member.id)) continue;
    const value = parseSplitValue(type, values.splitValues[member.id] ?? '');
    if (Number.isNaN(value)) return { error: INVALID_TEXT[type](member.name) };
    parsed[member.id] = value;
  }
  switch (type) {
    case 'exact':
      return { split: { type, participantIds, amounts: parsed } };
    case 'percent':
      return { split: { type, participantIds, basisPoints: parsed } };
    case 'shares':
      return { split: { type, participantIds, parts: parsed } };
  }
}

const FIELD_OF_CODE: Partial<Record<DomainErrorCode, ExpenseFormField>> = {
  payer_not_found: 'payerId',
  no_participants: 'participantIds',
  participant_not_found: 'participantIds',
  duplicate_participant: 'participantIds',
  invalid_split: 'participantIds',
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

  const read = readSplit(group.members, values);
  if ('error' in read) errors.participantIds = read.error;
  // Without a valid amount a custom split cannot be checked against it: only
  // who takes part is (the amount already has its own message).
  const chosen = new Set(values.participantIds);
  const split: Split =
    'split' in read && amount.ok
      ? read.split
      : {
          type: 'equal',
          participantIds: group.members
            .map((m) => m.id)
            .filter((id) => chosen.has(id)),
        };
  const whole = validateExpenseFields(group, {
    description: description.ok ? description.value : 'Gasto',
    amount: amount.ok ? amount.value : 1,
    date: date.ok ? date.value : '2000-01-01',
    payerId: values.payerId,
    split,
  });
  if (!whole.ok && !errors.participantIds) {
    errors[FIELD_OF_CODE[whole.error.code] ?? 'description'] =
      whole.error.message;
  }

  if (Object.keys(errors).length > 0 || !whole.ok) return { errors };
  return { fields: whole.value };
}
