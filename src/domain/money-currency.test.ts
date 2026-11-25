import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CURRENCY_CODES, type CurrencyCode } from './currency';
import {
  MAX_AMOUNT,
  amountRangeMessage,
  currencySymbol,
  formatAmount,
  formatAmountInput,
  parseAmountText,
} from './money';

/** Intl separates the symbol with a no-break space for some currencies. */
const plain = (text: string) => text.replace(/\s/g, '');

describe('formatAmount por moneda', () => {
  it.each([
    // CLP and COP: whole pesos, no decimals.
    [10_000, 'CLP', '$10.000'],
    [0, 'CLP', '$0'],
    [1_234_567, 'CLP', '$1.234.567'],
    [12_000, 'COP', 'COP12.000'],
    // 2 decimals: the amount is in cents.
    [1250, 'USD', 'US$12,50'],
    [5, 'USD', 'US$0,05'],
    [0, 'USD', 'US$0,00'],
    [123_456_789, 'USD', 'US$1.234.567,89'],
    [1250, 'EUR', 'EUR12,50'],
    [99, 'GBP', 'GBP0,99'],
    [1250, 'MXN', 'MXN12,50'],
    [1250, 'BRL', 'BRL12,50'],
    [1250, 'PEN', 'PEN12,50'],
    [1250, 'ARS', 'ARS12,50'],
  ] as const)('formatea %s %s como %s', (amount, currency, expected) => {
    expect(plain(formatAmount(amount, currency))).toBe(expected);
  });

  it('CLP queda exactamente como antes', () => {
    expect(formatAmount(12_000, 'CLP')).toBe('$12.000');
  });

  it('saldos negativos llevan signo y los decimales de la moneda', () => {
    expect(formatAmount(-1250, 'USD')).toContain('-');
    expect(plain(formatAmount(-1250, 'USD'))).toContain('12,50');
  });
});

describe('currencySymbol', () => {
  it.each([
    ['CLP', '$'],
    ['USD', 'US$'],
    ['GBP', 'GBP'],
  ] as const)('%s → %s', (currency, symbol) => {
    expect(currencySymbol(currency)).toBe(symbol);
  });

  it('es el prefijo que usa formatAmount', () => {
    for (const code of CURRENCY_CODES) {
      expect(formatAmount(1, code).startsWith(currencySymbol(code))).toBe(true);
    }
  });
});

describe('formatAmountInput', () => {
  it.each([
    [10_000, 'CLP', '10.000'],
    [5, 'CLP', '5'],
    [1250, 'USD', '12,50'],
    [5, 'USD', '0,05'],
    [123_456_789, 'EUR', '1.234.567,89'],
    [150_000, 'COP', '150.000'],
  ] as const)('%s %s → "%s"', (amount, currency, text) => {
    expect(formatAmountInput(amount, currency)).toBe(text);
  });
});

describe('parseAmountText', () => {
  const read = (text: string, currency: CurrencyCode) => {
    const result = parseAmountText(text, currency);
    return result.ok ? result.value : result.error.message;
  };

  it.each([
    ['10000', 'CLP', 10_000],
    ['10.000', 'CLP', 10_000],
    ['1.234.567', 'CLP', 1_234_567],
    ['0', 'CLP', 0],
    ['1.234,56', 'USD', 123_456],
    ['12,5', 'USD', 1250],
    ['12,50', 'USD', 1250],
    ['12', 'USD', 1200],
    ['12,', 'USD', 1200],
    ['12,', 'CLP', 12],
    [',5', 'USD', 50],
    ['0,05', 'EUR', 5],
    ['  1.000 ', 'COP', 1000],
    ['1 000', 'CLP', 1000],
  ] as const)('"%s" en %s = %s', (text, currency, expected) => {
    expect(read(text, currency)).toBe(expected);
  });

  it('una moneda sin decimales no los acepta y dice qué hacer', () => {
    expect(read('12,5', 'CLP')).toBe('El peso chileno no usa decimales.');
    expect(read('1,00', 'COP')).toBe('El peso colombiano no usa decimales.');
  });

  it('con 2 decimales, máximo 2', () => {
    expect(read('12,345', 'USD')).toBe(
      'El dólar estadounidense admite hasta 2 decimales.'
    );
    expect(read('1,999', 'GBP')).toBe(
      'La libra esterlina admite hasta 2 decimales.'
    );
  });

  it.each(['', '   ', 'abc', '-5', '1,2,3', '$10', '.', ','])(
    'rechaza "%s"',
    (text) => {
      const result = parseAmountText(text, 'USD');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('invalid_amount');
    }
  );

  it('un número demasiado grande no es un entero seguro', () => {
    expect(parseAmountText('9'.repeat(30), 'CLP').ok).toBe(false);
  });

  it('propiedad: formatAmountInput y parseAmountText son inversos', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_AMOUNT }),
        fc.constantFrom(...CURRENCY_CODES),
        (amount, currency) => {
          expect(
            parseAmountText(formatAmountInput(amount, currency), currency)
          ).toEqual({ ok: true, value: amount });
        }
      )
    );
  });
});

describe('amountRangeMessage', () => {
  it('dice el rango en la moneda del grupo', () => {
    expect(plain(amountRangeMessage('CLP'))).toBe(
      'Ingresaunmontoentre$1y$999.999.999.'
    );
    expect(plain(amountRangeMessage('USD'))).toBe(
      'Ingresaunmontoentre' + 'US$0,01' + 'y' + 'US$9.999.999,99.'
    );
  });
});
