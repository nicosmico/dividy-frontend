import { fail, ok } from './result';
import type { Group, Result } from './types';

/**
 * The currencies a group can use, in the order the UI lists them (ADR 0009).
 * A closed list: adding one is adding a row to `CURRENCIES`.
 */
export const CURRENCY_CODES = [
  'CLP',
  'USD',
  'EUR',
  'ARS',
  'BRL',
  'PEN',
  'MXN',
  'COP',
  'GBP',
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'CLP';

export interface CurrencyInfo {
  code: CurrencyCode;
  /** Digits after the decimal comma: 0 or 2. An amount is stored in units of 10^-decimals. */
  decimals: 0 | 2;
  /** Name in Spanish, capitalized: "Peso chileno". */
  name: string;
  /** Plural of the name, in lower case: "pesos chilenos". */
  plural: string;
  /** Grammatical article of the name ("el peso chileno", "la libra esterlina"). */
  article: 'el' | 'la';
  /** The smallest unit the app divides and stores, singular: "peso", "centavo". */
  unit: string;
  /** Plural of `unit`: "pesos", "centavos". */
  unitPlural: string;
}

/**
 * COP has 0 decimals in the app on purpose: cents of a Colombian peso are not
 * used in practice (ISO 4217 lists 2), and a whole-peso amount keeps the input
 * as simple as CLP's.
 */
export const CURRENCIES: Readonly<Record<CurrencyCode, CurrencyInfo>> = {
  CLP: {
    code: 'CLP',
    decimals: 0,
    name: 'Peso chileno',
    plural: 'pesos chilenos',
    article: 'el',
    unit: 'peso',
    unitPlural: 'pesos',
  },
  USD: {
    code: 'USD',
    decimals: 2,
    name: 'Dólar estadounidense',
    plural: 'dólares estadounidenses',
    article: 'el',
    unit: 'centavo',
    unitPlural: 'centavos',
  },
  EUR: {
    code: 'EUR',
    decimals: 2,
    name: 'Euro',
    plural: 'euros',
    article: 'el',
    unit: 'céntimo',
    unitPlural: 'céntimos',
  },
  ARS: {
    code: 'ARS',
    decimals: 2,
    name: 'Peso argentino',
    plural: 'pesos argentinos',
    article: 'el',
    unit: 'centavo',
    unitPlural: 'centavos',
  },
  BRL: {
    code: 'BRL',
    decimals: 2,
    name: 'Real brasileño',
    plural: 'reales brasileños',
    article: 'el',
    unit: 'centavo',
    unitPlural: 'centavos',
  },
  PEN: {
    code: 'PEN',
    decimals: 2,
    name: 'Sol peruano',
    plural: 'soles',
    article: 'el',
    unit: 'céntimo',
    unitPlural: 'céntimos',
  },
  MXN: {
    code: 'MXN',
    decimals: 2,
    name: 'Peso mexicano',
    plural: 'pesos mexicanos',
    article: 'el',
    unit: 'centavo',
    unitPlural: 'centavos',
  },
  COP: {
    code: 'COP',
    decimals: 0,
    name: 'Peso colombiano',
    plural: 'pesos colombianos',
    article: 'el',
    unit: 'peso',
    unitPlural: 'pesos',
  },
  GBP: {
    code: 'GBP',
    decimals: 2,
    name: 'Libra esterlina',
    plural: 'libras esterlinas',
    article: 'la',
    unit: 'penique',
    unitPlural: 'peniques',
  },
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return (
    typeof value === 'string' &&
    (CURRENCY_CODES as readonly string[]).includes(value)
  );
}

export function currencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES[code];
}

/** `"Peso chileno (CLP)"`: what the selector shows. */
export function currencyLabel(code: CurrencyCode): string {
  return `${CURRENCIES[code].name} (${code})`;
}

/** `"el peso chileno"`, `"la libra esterlina"`: the name inside a sentence. */
export function currencyNameInSentence(code: CurrencyCode): string {
  const { article, name } = CURRENCIES[code];
  return `${article} ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/** `"soles (PEN)"`, as in "Viaje a Lima · en soles (PEN)". */
export function currencyPluralLabel(code: CurrencyCode): string {
  return `${CURRENCIES[code].plural} (${code})`;
}

export const CURRENCY_LOCKED_MESSAGE =
  'Para cambiar la moneda, el grupo no puede tener gastos ni pagos.';

/** The currency can only change while the group has no expenses and no payments (ADR 0009). */
export function canChangeCurrency(
  group: Pick<Group, 'expenses' | 'payments'>
): boolean {
  return group.expenses.length === 0 && group.payments.length === 0;
}

/**
 * Changes the currency of a group. There is no conversion, so it is only
 * allowed while no amount exists; choosing the current currency is a no-op.
 */
export function changeCurrency(group: Group, code: string): Result<Group> {
  if (!isCurrencyCode(code)) {
    return fail('invalid_currency', 'Elige una de las monedas de la lista.');
  }
  if (code === group.currency) return ok(group);
  if (!canChangeCurrency(group)) {
    return fail('currency_locked', CURRENCY_LOCKED_MESSAGE);
  }
  return ok({ ...group, currency: code });
}
