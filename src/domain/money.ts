import {
  currencyInfo,
  currencyNameInSentence,
  type CurrencyCode,
} from './currency';
import { fail, ok } from './result';
import type { Amount, Result } from './types';

/** Amounts are in the smallest unit of the group's currency (ADR 0009). */
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 999_999_999;

export function isValidAmount(value: unknown): value is Amount {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= MIN_AMOUNT &&
    value <= MAX_AMOUNT
  );
}

const formatters = new Map<CurrencyCode, Intl.NumberFormat>();

function formatterOf(currency: CurrencyCode): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    const { decimals } = currencyInfo(currency);
    formatter = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * The one way to show an amount: `$10.000` (CLP), `US$12,50` (USD)... with
 * whatever symbol `Intl` gives for es-CL. Accepts 0 and negatives (balances).
 */
export function formatAmount(amount: Amount, currency: CurrencyCode): string {
  const { decimals } = currencyInfo(currency);
  return formatterOf(currency).format(amount / 10 ** decimals);
}

/** The symbol `Intl` writes in front of an amount: `$`, `US$`, `EUR`... (for the input prefix). */
export function currencySymbol(currency: CurrencyCode): string {
  const part = formatterOf(currency)
    .formatToParts(0)
    .find((p) => p.type === 'currency');
  return part?.value ?? currency;
}

/** The size of 1 unit of the group's currency in smallest units: 1 for CLP, 100 for USD. */
export function wholeUnit(currency: CurrencyCode): Amount {
  return 10 ** currencyInfo(currency).decimals;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * An amount as typed in the Chilean way, without symbol: `10000` → `"10.000"`
 * (CLP), `1250` → `"12,50"` (USD). What an input shows when it is filled in.
 */
export function formatAmountInput(
  amount: Amount,
  currency: CurrencyCode
): string {
  const { decimals } = currencyInfo(currency);
  const abs = Math.abs(amount);
  const whole = Math.trunc(abs / 10 ** decimals);
  const text = groupThousands(String(whole));
  if (decimals === 0) return amount < 0 ? `-${text}` : text;
  const fraction = String(abs % 10 ** decimals).padStart(decimals, '0');
  return `${amount < 0 ? '-' : ''}${text},${fraction}`;
}

/** `Ingresa un monto entre $1 y $999.999.999.`: what to do when an amount is out of range. */
export function amountRangeMessage(currency: CurrencyCode): string {
  return `Ingresa un monto entre ${formatAmount(MIN_AMOUNT, currency)} y ${formatAmount(MAX_AMOUNT, currency)}.`;
}

function decimalsMessage(currency: CurrencyCode): string {
  const { decimals } = currencyInfo(currency);
  const name = currencyNameInSentence(currency);
  const sentence = `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  return decimals === 0
    ? `${sentence} no usa decimales.`
    : `${sentence} admite hasta ${decimals} decimales.`;
}

/**
 * Reads an amount typed the Chilean way (`"1.234,56"`: dots group thousands,
 * the comma starts the decimals) and returns it in the smallest unit. A
 * currency without decimals takes none, and one with 2 takes at most 2; the
 * message of each case says what to do. It only reads: whether the amount is
 * in range is up to `validateAmount`.
 */
export function parseAmountText(
  text: string,
  currency: CurrencyCode
): Result<Amount> {
  const { decimals } = currencyInfo(currency);
  const compact = text.replace(/\s/g, '');
  if (compact === '')
    return fail('invalid_amount', amountRangeMessage(currency));
  if (!/^[\d.]*(,\d*)?$/.test(compact) || !/\d/.test(compact)) {
    return fail(
      'invalid_amount',
      decimals === 0
        ? 'Revisa el monto: usa solo números, como 12.500.'
        : 'Revisa el monto: usa solo números y una coma para los decimales, como 12.500,50.'
    );
  }
  const [whole, fraction] = compact.split(',') as [string, string | undefined];
  if (fraction !== undefined && fraction.length > decimals) {
    return fail('invalid_amount', decimalsMessage(currency));
  }
  const digits =
    whole.replace(/\./g, '') + (fraction ?? '').padEnd(decimals, '0');
  const amount = Number(digits === '' ? '0' : digits);
  return Number.isSafeInteger(amount)
    ? ok(amount)
    : fail('invalid_amount', amountRangeMessage(currency));
}
