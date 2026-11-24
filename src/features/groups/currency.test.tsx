import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CURRENCY_LOCKED_MESSAGE, type Group } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

/** Intl writes some symbols with a no-break space. */
const flat = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

const usdGroup = (over: Partial<Group> = {}): Group => ({
  ...makeGroup({ members: ['Ana', 'Beto', 'Caro'], currency: 'USD' }),
  ...over,
});

type User = ReturnType<typeof renderWithProviders>['user'];

async function chooseCurrency(user: User, scope: HTMLElement, label: string) {
  await user.click(within(scope).getByRole('combobox', { name: 'Moneda' }));
  await user.click(await screen.findByRole('option', { name: label }));
}

describe('Crear grupo con moneda', () => {
  async function setup() {
    const view = renderWithProviders(undefined, { route: '/groups/new' });
    await screen.findByRole('heading', { name: 'Crear grupo' });
    return view;
  }

  it('la moneda empieza en Peso chileno (CLP) y el grupo se crea en CLP', async () => {
    const { user, repository } = await setup();
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent(
      'Peso chileno (CLP)'
    );
    await user.type(screen.getByLabelText('Nombre del grupo'), 'Asado');
    await user.type(screen.getByLabelText('Miembros'), 'Ana{Enter}');
    await user.type(screen.getByLabelText('Miembros'), 'Beto{Enter}');
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));
    await waitFor(async () =>
      expect((await repository.list())[0]?.currency).toBe('CLP')
    );
  });

  it('ofrece las 9 monedas en orden y crea el grupo con la elegida', async () => {
    const { user, repository } = await setup();
    await user.click(screen.getByRole('combobox', { name: 'Moneda' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Peso chileno (CLP)',
      'Dólar estadounidense (USD)',
      'Euro (EUR)',
      'Peso argentino (ARS)',
      'Real brasileño (BRL)',
      'Sol peruano (PEN)',
      'Peso mexicano (MXN)',
      'Peso colombiano (COP)',
      'Libra esterlina (GBP)',
    ]);
    await user.click(
      screen.getByRole('option', { name: 'Dólar estadounidense (USD)' })
    );
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent(
      'Dólar estadounidense (USD)'
    );

    await user.type(screen.getByLabelText('Nombre del grupo'), 'Viaje');
    await user.type(screen.getByLabelText('Miembros'), 'Ana{Enter}');
    await user.type(screen.getByLabelText('Miembros'), 'Beto{Enter}');
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));
    await waitFor(async () =>
      expect((await repository.list())[0]?.currency).toBe('USD')
    );
  });
});

describe('Editar la moneda del grupo', () => {
  async function openEdit(user: User) {
    await user.click(
      await screen.findByRole('button', { name: 'Opciones del grupo' })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /Editar grupo/ })
    );
    return screen.findByRole('dialog', { name: 'Editar grupo' });
  }

  it('sin gastos ni pagos se puede cambiar', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [makeGroup({ members: ['Ana', 'Beto'], name: 'Viaje' })],
    });
    const dialog = await openEdit(user);
    const select = within(dialog).getByRole('combobox', { name: 'Moneda' });
    expect(select).toBeEnabled();
    expect(within(dialog).queryByText(CURRENCY_LOCKED_MESSAGE)).toBeNull();
    await chooseCurrency(user, dialog, 'Euro (EUR)');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.currency).toBe('EUR')
    );
  });

  it.each([
    [
      'un gasto',
      makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [{ amount: 1000, payer: 'Ana', among: ['Ana', 'Beto'] }],
      }),
    ],
    [
      'un pago',
      makeGroup({
        members: ['Ana', 'Beto'],
        payments: [{ from: 'Ana', to: 'Beto', amount: 500 }],
      }),
    ],
  ])('con %s está deshabilitado y explica por qué', async (_name, group) => {
    const { user, repository } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group],
    });
    const dialog = await openEdit(user);
    const select = within(dialog).getByRole('combobox', { name: 'Moneda' });
    expect(select).toBeDisabled();
    expect(select).toHaveTextContent('Peso chileno (CLP)');
    expect(
      within(dialog).getByText(
        'Para cambiar la moneda, el grupo no puede tener gastos ni pagos.'
      )
    ).toBeInTheDocument();
    // Renaming still works and leaves the currency alone.
    const name = within(dialog).getByLabelText('Nombre del grupo');
    await userClear(user, name);
    await user.type(name, 'Otro nombre');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.name).toBe('Otro nombre')
    );
    expect((await repository.get('g1'))?.currency).toBe('CLP');
  });
});

async function userClear(user: User, element: HTMLElement) {
  await user.clear(element);
}

describe('tarjeta de Mis grupos', () => {
  afterEach(() => vi.restoreAllMocks());

  it('con otra moneda muestra el código discreto junto al total', async () => {
    renderWithProviders(undefined, {
      groups: [
        {
          ...usdGroup({ name: 'Miami' }),
          expenses: makeGroup({
            members: ['Ana', 'Beto', 'Caro'],
            expenses: [
              { amount: 1250, payer: 'Ana', among: ['Ana', 'Beto', 'Caro'] },
            ],
          }).expenses,
        },
      ],
    });
    const card = (
      await screen.findByRole('heading', { name: 'Miami' })
    ).closest('a')!;
    expect(flat(card.textContent)).toContain('US$12,50');
    expect(within(card).getByText('USD')).toBeInTheDocument();
    expect(flat(card.textContent)).toContain('Pendiente: US$8,33 por saldar');
  });

  it('con CLP la tarjeta no cambia: sin código', async () => {
    renderWithProviders(undefined, {
      groups: [
        makeGroup({
          name: 'Casa',
          members: ['Ana', 'Beto'],
          expenses: [{ amount: 12_000, payer: 'Ana', among: ['Ana', 'Beto'] }],
        }),
      ],
    });
    const card = (await screen.findByRole('heading', { name: 'Casa' })).closest(
      'a'
    )!;
    expect(card.textContent).toContain('$12.000');
    expect(within(card).queryByText('CLP')).toBeNull();
  });
});
