import { describe, expect, it } from 'vitest';
import { createSnapshot, CURRENCY_CODES } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { CURRENT_VERSION } from './schema';
import { parseDocument } from './migrations';

/**
 * ADR 0009: the currency per group did not need a new document version
 * (`currency` was already stored), so v4 documents written before it still
 * open, as CLP, and groups in any currency round-trip through the document.
 */
describe('moneda en el documento guardado', () => {
  const doc = (groups: unknown[], snapshots: unknown[] = []) =>
    JSON.stringify({ version: CURRENT_VERSION, groups, snapshots });

  it('el documento sigue en la versión 4', () => {
    expect(CURRENT_VERSION).toBe(4);
  });

  it.each(CURRENCY_CODES)(
    'un grupo en %s se guarda y se lee igual',
    (currency) => {
      const group = makeGroup({
        members: ['Ana', 'Beto'],
        currency,
        expenses: [{ amount: 1250, payer: 'Ana', among: ['Ana', 'Beto'] }],
      });
      const parsed = parseDocument(doc([JSON.parse(JSON.stringify(group))]));
      expect(parsed).toMatchObject({ ok: true, rejected: [] });
      if (parsed.ok) expect(parsed.document.groups).toEqual([group]);
    }
  );

  it('un grupo guardado antes (CLP) sigue abriendo sin tocarlo', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [{ amount: 12_000, payer: 'Ana', among: ['Ana', 'Beto'] }],
    });
    const parsed = parseDocument(doc([group]));
    expect(parsed.ok && parsed.document.groups[0].currency).toBe('CLP');
  });

  it('un grupo con una moneda que no conocemos se aparta, no se pierde', () => {
    const group = {
      ...makeGroup({ members: ['Ana', 'Beto'] }),
      currency: 'JPY',
    };
    const parsed = parseDocument(doc([group]));
    expect(parsed.ok && parsed.document.groups).toEqual([]);
    expect(parsed.ok && parsed.rejected).toHaveLength(1);
  });

  it('una captura guardada con moneda la conserva', () => {
    const snapshot = createSnapshot(
      makeGroup({ members: ['Ana', 'Beto'], currency: 'USD' }),
      '2026-01-01T00:00:00.000Z'
    );
    const parsed = parseDocument(doc([], [snapshot]));
    expect(parsed.ok && parsed.document.snapshots).toEqual([snapshot]);
  });

  it('una captura guardada antes de las monedas (sin currency) se lee como CLP', () => {
    const snapshot = createSnapshot(
      makeGroup({ members: ['Ana', 'Beto'] }),
      '2026-01-01T00:00:00.000Z'
    );
    const { currency: _currency, ...old } = snapshot;
    void _currency;
    const parsed = parseDocument(doc([], [old]));
    expect(parsed.ok && parsed.rejected).toEqual([]);
    expect(parsed.ok && parsed.document.snapshots).toEqual([snapshot]);
  });
});
