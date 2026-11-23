import { describe, expect, it } from 'vitest';
import {
  getGroupIssues,
  validateAmount,
  validateDate,
  validateDescription,
  validateExpenseFields,
  validateGroupName,
  validateMemberName,
  validatePaymentFields,
  type ExpenseFields,
} from './validation';
import { makeGroup } from './test-utils/fixtures';

const group = makeGroup({ members: ['Ana', 'Beto'] });
const code = (r: { ok: boolean; error?: { code: string } }) =>
  r.ok ? 'ok' : r.error!.code;

describe('validateGroupName', () => {
  it.each([
    ['Asado', 'ok'],
    ['  Asado  ', 'ok'],
    ['', 'invalid_group_name'],
    ['   ', 'invalid_group_name'],
    ['a'.repeat(40), 'ok'],
    ['a'.repeat(41), 'invalid_group_name'],
  ])('"%s" -> %s', (name, expected) => {
    expect(code(validateGroupName(name))).toBe(expected);
  });

  it('devuelve el nombre sin espacios extremos y mensajes en español', () => {
    expect(validateGroupName('  Asado ')).toEqual({ ok: true, value: 'Asado' });
    const r = validateGroupName('');
    expect(!r.ok && r.error.message).toMatch(/no puede estar vacío/);
  });
});

describe('validateMemberName', () => {
  it.each([
    ['Cami', undefined, 'ok'],
    ['ana', undefined, 'duplicate_member_name'],
    ['  ANA  ', undefined, 'duplicate_member_name'],
    ['ana', 'Ana', 'ok'],
    ['Beto', 'Ana', 'duplicate_member_name'],
    ['', undefined, 'invalid_member_name'],
    ['x'.repeat(41), undefined, 'invalid_member_name'],
  ])('"%s" (excepto %s) -> %s', (name, except, expected) => {
    expect(code(validateMemberName(group, name, except))).toBe(expected);
  });
});

describe('validateDescription', () => {
  it.each([
    ['Pizza', 'ok'],
    ['', 'invalid_description'],
    ['  ', 'invalid_description'],
    ['x'.repeat(80), 'ok'],
    ['x'.repeat(81), 'invalid_description'],
  ])('"%s" -> %s', (d, expected) => {
    expect(code(validateDescription(d))).toBe(expected);
  });
});

describe('validateAmount', () => {
  it.each([
    [1, 'ok'],
    [999_999_999, 'ok'],
    [0, 'invalid_amount'],
    [-1, 'invalid_amount'],
    [1.5, 'invalid_amount'],
    [1_000_000_000, 'invalid_amount'],
    [Number.NaN, 'invalid_amount'],
    ['10', 'invalid_amount'],
  ])('%s -> %s', (amount, expected) => {
    expect(code(validateAmount(amount))).toBe(expected);
  });
});

describe('validateDate', () => {
  it.each([
    ['2026-01-31', 'ok'],
    ['2024-02-29', 'ok'],
    ['2025-02-29', 'invalid_date'],
    ['2026-13-01', 'invalid_date'],
    ['2026-04-31', 'invalid_date'],
    ['2026-1-1', 'invalid_date'],
    ['01/01/2026', 'invalid_date'],
    ['', 'invalid_date'],
  ])('%s -> %s', (date, expected) => {
    expect(code(validateDate(date))).toBe(expected);
  });
});

describe('validateExpenseFields', () => {
  const base: ExpenseFields = {
    description: '  Pizza ',
    amount: 1000,
    payerId: 'Ana',
    split: { type: 'equal', participantIds: ['Ana', 'Beto'] },
    date: '2026-01-01',
  };
  const withSplit = (participantIds: string[]): ExpenseFields => ({
    ...base,
    split: { type: 'equal', participantIds },
  });

  it('normaliza la descripción', () => {
    const r = validateExpenseFields(group, base);
    expect(r.ok && r.value.description).toBe('Pizza');
  });

  it.each([
    ['descripción vacía', { ...base, description: '' }, 'invalid_description'],
    ['monto 0', { ...base, amount: 0 }, 'invalid_amount'],
    ['fecha inválida', { ...base, date: '2026-02-30' }, 'invalid_date'],
    ['pagador inexistente', { ...base, payerId: 'Z' }, 'payer_not_found'],
    ['sin participantes', withSplit([]), 'no_participants'],
    [
      'participantes repetidos',
      withSplit(['Ana', 'Ana']),
      'duplicate_participant',
    ],
    [
      'participante inexistente',
      withSplit(['Ana', 'Z']),
      'participant_not_found',
    ],
  ])('rechaza %s', (_name, fields, expected) => {
    expect(code(validateExpenseFields(group, fields))).toBe(expected);
  });

  it('permite que el pagador no participe', () => {
    expect(code(validateExpenseFields(group, withSplit(['Beto'])))).toBe('ok');
  });
});

describe('validatePaymentFields', () => {
  const base = { fromId: 'Ana', toId: 'Beto', amount: 100, date: '2026-01-01' };
  it.each([
    ['válido', base, 'ok'],
    ['mismo miembro', { ...base, toId: 'Ana' }, 'same_member_payment'],
    ['emisor inexistente', { ...base, fromId: 'Z' }, 'member_not_found'],
    ['receptor inexistente', { ...base, toId: 'Z' }, 'member_not_found'],
    ['monto inválido', { ...base, amount: 0 }, 'invalid_amount'],
    ['fecha inválida', { ...base, date: 'hoy' }, 'invalid_date'],
  ])('%s -> %s', (_n, fields, expected) => {
    expect(code(validatePaymentFields(group, fields))).toBe(expected);
  });
});

describe('getGroupIssues', () => {
  it('un grupo válido no tiene problemas', () => {
    expect(getGroupIssues(group)).toEqual([]);
  });

  it('detecta nombres, ids y referencias rotas', () => {
    const bad = makeGroup({
      name: ' ',
      members: ['A', 'B'],
      expenses: [
        { id: 'e1', amount: 100, payer: 'Z', among: ['A'] },
        { id: 'e1', amount: 100, payer: 'A', among: [] },
      ],
      payments: [
        { id: 'p1', from: 'A', to: 'A', amount: 5 },
        { id: 'p1', from: 'A', to: 'B', amount: 5 },
      ],
    });
    bad.members.push({ id: 'A', name: 'a' }, { id: 'C', name: '' });
    const issues = getGroupIssues(bad);
    expect(issues).toEqual(
      expect.arrayContaining([
        'invalid group name',
        'duplicate member id A',
        'duplicate member name a',
        'invalid member name C',
        'duplicate expense id e1',
        'expense e1: payer_not_found',
        'expense e1: no_participants',
        'duplicate payment id p1',
        'payment p1: same_member_payment',
      ])
    );
  });
});
