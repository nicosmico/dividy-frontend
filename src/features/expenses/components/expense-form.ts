import {
  currencyInfo,
  formatAmount,
  formatAmountInput,
  formatPercent,
  FULL_PERCENT,
  parseAmountText,
  presetSplit,
  validateAmount,
  validateDate,
  validateDescription,
  validateExpenseFields,
  type CurrencyCode,
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
  /**
   * The amount as the input shows it, in the Chilean way: `"10.000"` (CLP),
   * `"12,50"` (USD). Read it with `parseAmount`.
   */
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

/**
 * The amount typed in the input, in the smallest unit of the currency (`NaN`
 * when empty or not a number; `validateExpenseForm` says why).
 */
export function parseAmount(text: string, currency: CurrencyCode): number {
  const parsed = parseAmountText(text, currency);
  return parsed.ok ? parsed.value : NaN;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * What the amount input shows while typing: thousands dots in the whole part
 * (`10000` → `"10.000"`), letters dropped, and at most one decimal comma. The
 * comma is kept even for a currency without decimals, so the form can tell the
 * user why it is not valid. On a currency with decimals, a dot typed at the
 * end is taken as the decimal key of other keyboards.
 */
export function formatAmountTyping(
  raw: string,
  currency: CurrencyCode
): string {
  let text = raw.replace(/[^\d.,]/g, '');
  if (
    currencyInfo(currency).decimals > 0 &&
    text.endsWith('.') &&
    !text.includes(',')
  ) {
    text = `${text.slice(0, -1)},`;
  }
  const comma = text.indexOf(',');
  const whole = (comma < 0 ? text : text.slice(0, comma))
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .slice(0, 10);
  if (comma < 0) return groupThousands(whole);
  const fraction = text
    .slice(comma + 1)
    .replace(/\D/g, '')
    .slice(0, 9);
  return `${groupThousands(whole || '0')},${fraction}`;
}

/** Tidies the amount when the user leaves the field: `"12,5"` → `"12,50"`; what cannot be read stays as typed. */
export function normalizeAmountText(
  text: string,
  currency: CurrencyCode
): string {
  const parsed = parseAmountText(text, currency);
  return parsed.ok && parsed.value > 0
    ? formatAmountInput(parsed.value, currency)
    : text;
}

/** Characters allowed while typing in a participant's field (the rest is dropped). */
export function sanitizeSplitInput(
  type: SplitType,
  text: string,
  currency: CurrencyCode
): string {
  if (type === 'percent') return text.replace(/[^\d.,]/g, '').slice(0, 7);
  if (type === 'shares') return text.replace(/\D/g, '').slice(0, 6);
  // A currency without decimals has no comma to type.
  const allowed = currencyInfo(currency).decimals > 0 ? /[^\d.,]/g : /[^\d.]/g;
  return text.replace(allowed, '').slice(0, 14);
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
 * What a participant's field means: an amount in the smallest unit of the
 * currency (`exact`), basis points (`percent`, so `"12,5"` is `1250`) or
 * parts. Empty is `0`; text that is not a valid number for the type is `NaN`.
 */
export function parseSplitValue(
  type: SplitType,
  text: string,
  currency: CurrencyCode
): number {
  if (type === 'percent') return parsePercent(text);
  if (type === 'exact') {
    if (text.trim() === '') return 0;
    return parseAmount(text, currency);
  }
  if (text.includes(',')) return NaN;
  const digits = text.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

/** The text of a field for a value (what the user sees after leaving it). */
export function formatSplitValue(
  type: SplitType,
  value: number,
  currency: CurrencyCode
): string {
  if (type === 'percent') {
    return (value / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 });
  }
  if (type === 'exact') return formatAmountInput(value, currency);
  return String(value);
}

/** Tidies a field when the user leaves it: `"10000"` → `"10.000"`, `"12.50"` → `"12,5"`. */
export function normalizeSplitText(
  type: SplitType,
  text: string,
  currency: CurrencyCode
): string {
  const value = parseSplitValue(type, text, currency);
  return text.trim() === '' || Number.isNaN(value)
    ? text
    : formatSplitValue(type, value, currency);
}

/** The text the fields of a split start with. */
export function splitToValues(
  split: Split,
  currency: CurrencyCode
): Record<MemberId, string> {
  const entries: [MemberId, number][] =
    split.type === 'exact'
      ? Object.entries(split.amounts)
      : split.type === 'percent'
        ? Object.entries(split.basisPoints)
        : split.type === 'shares'
          ? Object.entries(split.parts)
          : [];
  return Object.fromEntries(
    entries.map(([id, value]) => [
      id,
      formatSplitValue(split.type, value, currency),
    ])
  );
}

/**
 * The fields a mode starts with, already adding up: `exact` is today's equal
 * split in the currency (empty while there is no amount yet), `percent` an
 * equal split of 100 % and `shares` one part each.
 */
export function presetValues(
  type: SplitType,
  amount: number,
  participantIds: readonly MemberId[],
  members: readonly Member[],
  currency: CurrencyCode
): Record<MemberId, string> {
  if (type === 'equal') return {};
  if (type === 'exact' && !(amount >= 1)) {
    return Object.fromEntries(participantIds.map((id) => [id, '']));
  }
  return splitToValues(
    presetSplit(type, amount, participantIds, members),
    currency
  );
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
  values: readonly number[],
  currency: CurrencyCode
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
      lead: `Asignado ${formatAmount(total, currency)}`,
      tail: 'ingresa el monto para ver cuánto falta',
    };
  }
  const diff = amount - total;
  const lead = `Asignado ${formatAmount(total, currency)} de ${formatAmount(amount, currency)}`;
  if (diff === 0) return { tone: 'ok', lead, tail: 'Cuadra' };
  return {
    tone: 'warn',
    lead,
    tail:
      diff > 0
        ? `faltan ${formatAmount(diff, currency)}`
        : `te pasaste por ${formatAmount(-diff, currency)}`,
  };
}

const INVALID_TEXT: Record<
  CustomSplitType,
  (name: string, currency: CurrencyCode) => string
> = {
  exact: (name, currency) =>
    currencyInfo(currency).decimals === 0
      ? `Revisa el monto de ${name}: usa solo ${currencyInfo(currency).unitPlural} enteros.`
      : `Revisa el monto de ${name}: usa solo números, con hasta ${currencyInfo(currency).decimals} decimales, como 12,50.`,
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
  >,
  currency: CurrencyCode
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
    const value = parseSplitValue(
      type,
      values.splitValues[member.id] ?? '',
      currency
    );
    if (Number.isNaN(value)) {
      return { error: INVALID_TEXT[type](member.name, currency) };
    }
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
  group: Pick<Group, 'members' | 'currency'>,
  values: ExpenseFormValues
): { fields: ExpenseFields } | { errors: ExpenseFormErrors } {
  const errors: ExpenseFormErrors = {};
  const description = validateDescription(values.description);
  if (!description.ok) errors.description = description.error.message;
  const typedAmount = parseAmountText(values.amount, group.currency);
  const amount = typedAmount.ok
    ? validateAmount(typedAmount.value, group.currency)
    : typedAmount;
  if (!amount.ok) errors.amount = amount.error.message;
  const date = validateDate(values.date);
  if (!date.ok) errors.date = date.error.message;

  const read = readSplit(group.members, values, group.currency);
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
