import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Group } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

const ROUTE = '/groups/g1/expenses';

/** Intl writes some symbols with a no-break space. */
const flat = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

const group = (currency: Group['currency']) =>
  makeGroup({ members: ['Ana', 'Beto', 'Caro'], currency });

type View = ReturnType<typeof renderWithProviders>;
type User = View['user'];

async function openNewForm(user: User) {
  await user.click(
    await screen.findByRole('button', { name: /Agregar gasto/ })
  );
  return screen.findByRole('dialog', { name: 'Nuevo gasto' });
}

async function formIn(
  user: User,
  mode: 'Iguales' | 'Montos' | '%' | 'Partes',
  amount: string
) {
  const dialog = await openNewForm(user);
  await user.type(within(dialog).getByLabelText('Descripción'), 'Cena');
  await user.type(within(dialog).getByLabelText('Monto'), amount);
  await user.click(within(dialog).getByRole('radio', { name: mode }));
  return dialog;
}

const status = (dialog: HTMLElement) =>
  flat(
    dialog.querySelector<HTMLElement>('[aria-live="polite"]')?.textContent ?? ''
  );

describe('formulario de gasto en USD', () => {
  it('el prefijo del monto es el símbolo de la moneda, no un "$" fijo', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await openNewForm(user);
    const amount = within(dialog).getByLabelText('Monto');
    const prefix = amount.parentElement!.querySelector('span[aria-hidden]');
    expect(prefix).toHaveTextContent('US$');
    expect(amount).toHaveAttribute('inputmode', 'decimal');
    expect(amount).toHaveAttribute('placeholder', '0,00');
  });

  it('en CLP el prefijo sigue siendo "$" y el teclado numérico', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('CLP')],
    });
    const dialog = await openNewForm(user);
    const amount = within(dialog).getByLabelText('Monto');
    expect(
      amount.parentElement!.querySelector('span[aria-hidden]')
    ).toHaveTextContent('$');
    expect(amount).toHaveAttribute('inputmode', 'numeric');
  });

  it('acepta centavos, da formato chileno y completa los decimales al salir', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await openNewForm(user);
    const amount = within(dialog).getByLabelText('Monto');
    await user.type(amount, '1234,5');
    expect(amount).toHaveValue('1.234,5');
    await user.tab();
    expect(amount).toHaveValue('1.234,50');
  });

  it('guarda el gasto en centavos y la lista lo muestra con la moneda', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await openNewForm(user);
    await user.type(within(dialog).getByLabelText('Descripción'), 'Cena');
    await user.type(within(dialog).getByLabelText('Monto'), '10,01');
    // 10,01 entre 3: 3,34 / 3,34 / 3,33
    expect(flat(dialog.textContent)).toContain('US$3,34');
    expect(flat(dialog.textContent)).toContain('US$3,33');
    expect(flat(dialog.textContent)).toContain('Por redondeo');
    expect(flat(dialog.textContent)).toContain('les toca US$0,01 más');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.expenses[0]?.amount).toBe(1001)
    );
    expect((await screen.findAllByText('US$10,01')).length).toBe(2);
  });

  it('decimales de más en USD: dice cuántos admite', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await openNewForm(user);
    await user.type(within(dialog).getByLabelText('Descripción'), 'Cena');
    await user.type(within(dialog).getByLabelText('Monto'), '10,555');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(
      await within(dialog).findByText(
        'El dólar estadounidense admite hasta 2 decimales.'
      )
    ).toBeInTheDocument();
    expect((await repository.get('g1'))?.expenses).toEqual([]);
  });

  it('decimales en CLP: error que dice qué hacer', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('CLP')],
    });
    const dialog = await openNewForm(user);
    await user.type(within(dialog).getByLabelText('Descripción'), 'Cena');
    await user.type(within(dialog).getByLabelText('Monto'), '1000,5');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(
      await within(dialog).findByText('El peso chileno no usa decimales.')
    ).toBeInTheDocument();
    expect((await repository.get('g1'))?.expenses).toEqual([]);
  });

  it('editar un gasto en USD muestra el monto con centavos', async () => {
    const usd = makeGroup({
      members: ['Ana', 'Beto'],
      currency: 'USD',
      expenses: [
        {
          id: 'e1',
          description: 'Cena',
          amount: 123_456,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
    });
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [usd],
    });
    await user.click(await screen.findByText('Cena'));
    const dialog = await screen.findByRole('dialog', { name: 'Editar gasto' });
    expect(within(dialog).getByLabelText('Monto')).toHaveValue('1.234,56');
  });
});

describe('modos de división en USD', () => {
  it('Montos: precarga con centavos, el prefijo es US$ y cuadra', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await formIn(user, 'Montos', '10,01');
    expect(within(dialog).getByLabelText('Monto de Ana')).toHaveValue('3,34');
    expect(within(dialog).getByLabelText('Monto de Beto')).toHaveValue('3,34');
    expect(within(dialog).getByLabelText('Monto de Caro')).toHaveValue('3,33');
    expect(status(dialog)).toBe('Asignado US$10,01 de US$10,01 · Cuadra');
    const field = within(dialog).getByLabelText('Monto de Ana');
    expect(
      field.parentElement!.querySelector('span[aria-hidden]')
    ).toHaveTextContent('US$');

    // Cambia los montos con centavos: 5,01 + 3,00 + 2,00 = 10,01
    for (const [name, value] of [
      ['Ana', '5,01'],
      ['Beto', '3'],
      ['Caro', '2'],
    ]) {
      const input = within(dialog).getByLabelText(`Monto de ${name}`);
      await user.clear(input);
      await user.type(input, value);
    }
    expect(status(dialog)).toBe('Asignado US$10,01 de US$10,01 · Cuadra');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.expenses[0]?.split).toMatchObject({
        type: 'exact',
        amounts: { Ana: 501, Beto: 300, Caro: 200 },
      })
    );
  });

  it('Montos: dice cuánto falta y cuánto se pasó, en centavos', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await formIn(user, 'Montos', '10,01');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    await user.clear(ana);
    await user.type(ana, '3,33');
    expect(status(dialog)).toBe(
      'Asignado US$10,00 de US$10,01 · faltan US$0,01'
    );
    await user.clear(ana);
    await user.type(ana, '3,50');
    expect(status(dialog)).toBe(
      'Asignado US$10,17 de US$10,01 · te pasaste por US$0,16'
    );
  });

  it('Montos: un monto con decimales de más en el campo de una persona', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await formIn(user, 'Montos', '10,01');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    await user.clear(ana);
    await user.type(ana, '3,345');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(
      await within(dialog).findByText(
        /Revisa el monto de Ana: .* hasta 2 decimales/
      )
    ).toBeInTheDocument();
  });

  it('%: muestra lo que le toca a cada uno en US$ con centavos', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await formIn(user, '%', '10,01');
    expect(status(dialog)).toBe('100 %');
    // 33,34 % / 33,33 % / 33,33 % of 10,01 → 3,34 / 3,34 / 3,33
    const text = flat(dialog.textContent);
    expect(text).toContain('US$3,34');
    expect(text).toContain('US$3,33');
  });

  it('Partes: 2, 1 y 1 de 10,00 son 5,00 / 2,50 / 2,50', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('USD')],
    });
    const dialog = await formIn(user, 'Partes', '10');
    const ana = within(dialog).getByLabelText('Partes de Ana');
    await user.clear(ana);
    await user.type(ana, '2');
    const text = flat(dialog.textContent);
    expect(text).toContain('2 partes · US$5,00');
    expect(text).toContain('1 parte · US$2,50');
  });

  it('el gasto por montos en CLP sigue pidiendo pesos enteros', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group('CLP')],
    });
    const dialog = await formIn(user, 'Montos', '10000');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    expect(
      ana.parentElement!.querySelector('span[aria-hidden]')
    ).toHaveTextContent('$');
    await user.clear(ana);
    // The comma cannot be typed in a currency without decimals.
    await user.type(ana, '1,5');
    expect(ana).toHaveValue('15');
  });
});

describe('Saldos en USD', () => {
  const trip = (): Group => ({
    ...makeGroup({
      members: ['Ana', 'Beto', 'Caro'],
      currency: 'USD',
      expenses: [
        {
          id: 'e1',
          description: 'Cena',
          amount: 1001,
          payer: 'Ana',
          among: ['Ana', 'Beto', 'Caro'],
        },
      ],
    }),
  });

  it('los saldos, transferencias y el detalle salen con centavos', async () => {
    renderWithProviders(undefined, {
      route: '/groups/g1/balances',
      groups: [trip()],
    });
    // 10,01 / 3 = 3,34 / 3,34 / 3,33: Ana pagó 10,01 y su parte es 3,34.
    await screen.findByRole('heading', { name: 'Para quedar al día' });
    const text = flat(document.body.textContent);
    expect(text).toContain('Pendiente: US$6,67 por saldar');
    expect(text).toContain('Le deben US$6,67');
    expect(text).toContain('Debe US$3,34');
    expect(text).toContain('Debe US$3,33');
  });

  it('el titular de "Tú en el grupo" habla en la moneda', async () => {
    renderWithProviders(undefined, {
      route: '/groups/g1/balances',
      groups: [trip()],
      viewers: { 'group:g1': { memberId: 'Beto' } },
    });
    await screen.findByText(/Debes/);
    const card = document.getElementById('status-heading')!.closest('section')!;
    expect(flat(within(card).getByRole('heading').textContent)).toBe(
      'Debes US$3,34'
    );
    expect(within(card).getByText('Transfiérele a Ana')).toBeInTheDocument();
  });

  it('la transferencia sugerida es exacta al centavo y se puede marcar pagada', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: '/groups/g1/balances',
      groups: [trip()],
    });
    await screen.findByRole('heading', { name: 'Para quedar al día' });
    const buttons = await screen.findAllByRole('button', {
      name: /Marcar como pagado/,
    });
    await user.click(buttons[0]);
    const dialog = await screen.findByRole('alertdialog');
    expect(flat(dialog.textContent)).toContain('US$3,34');
    await user.click(
      within(dialog).getByRole('button', { name: /Sí|Confirmar|Marcar/ })
    );
    await waitFor(async () =>
      expect((await repository.get('g1'))?.payments[0]?.amount).toBe(334)
    );
  });
});
