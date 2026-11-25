import { screen, within, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSnapshot, type Group } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';
import { encodeSnapshot } from './snapshot-codec';

const QUIET = { 'group:lima': { none: true as const } };
const TAKEN = '2026-11-24T15:00:00.000Z';

const lima = (): Group => ({
  ...makeGroup({
    name: 'Viaje a Lima',
    currency: 'PEN',
    members: ['Ana', 'Beto'],
    expenses: [
      {
        id: 'e1',
        description: 'Cena',
        amount: 12_550,
        payer: 'Ana',
        among: ['Ana', 'Beto'],
      },
    ],
  }),
  id: 'lima',
});

const flat = (text: string) => text.replace(/[^\S\n]/g, ' ');

afterEach(() => vi.restoreAllMocks());

describe('resumen compartido con moneda', () => {
  it('el título dice la moneda una vez y los montos van en esa moneda', async () => {
    const { user } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: '/groups/lima/balances',
      groups: [lima()],
    });
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    await user.click(
      await screen.findByRole('button', { name: 'Copiar resumen' })
    );
    // The copy or share is async (the link may still be compressing).
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = flat(writeText.mock.calls[0][0]);
    expect(text.split('\n')[0]).toBe('*Viaje a Lima* · en soles (PEN)');
    expect(text).toContain('• Cena: PEN 125,50, pagó Ana, entre Ana y Beto');
    expect(text).toContain('• Beto le transfiere PEN 62,75 a Ana');
    expect(text.match(/soles/g)).toHaveLength(1);
  });
});

describe('abrir un link de otra moneda', () => {
  it('la captura se ve con la moneda del grupo, sin pasar por CLP', async () => {
    const token = await encodeSnapshot(createSnapshot(lima(), TAKEN));
    renderWithProviders(undefined, {
      viewers: { 'snapshot:lima': { none: true } },
      route: `/shared/expenses#${token}`,
    });
    await screen.findByRole('heading', { name: 'Viaje a Lima' });
    const total = (await screen.findAllByText(/PEN/)).map((el) =>
      flat(el.textContent ?? '')
    );
    expect(total.some((t) => t.includes('PEN 125,50'))).toBe(true);
    expect(within(document.body).queryByText(/\$12\.550/)).toBeNull();
  });
});
