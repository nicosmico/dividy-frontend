import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { todayLocal } from '@/lib/dates';
import { renderWithProviders } from '@/test/render-with-providers';

const ROUTE = '/groups/g1/balances';

/** Ana +5.166, Beto −1.833, Carla −3.333. Transfers: Carla → Ana 3.333, Beto → Ana 1.833. */
function groupWithDebts() {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        id: 'e1',
        description: 'Supermercado',
        amount: 10000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
      {
        id: 'e2',
        description: 'Taxi',
        amount: 3000,
        payer: 'Beto',
        among: ['Ana', 'Beto'],
      },
    ],
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Pestaña Saldos', () => {
  it('sin gastos muestra el estado vacío con enlace a Gastos', async () => {
    renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    expect(await screen.findByText('Aún no hay saldos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Gastos' })).toHaveAttribute(
      'href',
      '/groups/g1/expenses'
    );
  });

  it('muestra las transferencias sugeridas correctas', async () => {
    renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithDebts()],
    });
    const section = (
      await screen.findByRole('heading', { name: 'Para quedar al día' })
    ).closest('section')!;
    const items = within(section).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Carla → Ana');
    expect(items[0]).toHaveTextContent('$3.333');
    expect(items[1]).toHaveTextContent('Beto → Ana');
    expect(items[1]).toHaveTextContent('$1.833');
    expect(screen.queryByText('¡Están al día! 🎉')).not.toBeInTheDocument();
  });

  it('muestra el saldo de cada miembro con texto, no solo color', async () => {
    renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithDebts()],
    });
    expect(await screen.findByText('Le deben $5.166')).toBeInTheDocument();
    expect(screen.getByText('Debe $1.833')).toBeInTheDocument();
    expect(screen.getByText('Debe $3.333')).toBeInTheDocument();
  });

  it('marca una transferencia como pagada tras confirmar y, si era la última, queda al día', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithDebts()],
    });
    const pay = await screen.findAllByRole('button', {
      name: /^Marcar como pagado: /,
    });
    // Each button names who pays whom, so a screen reader can tell them apart.
    expect(pay.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Marcar como pagado: Carla le paga $3.333 a Ana',
      'Marcar como pagado: Beto le paga $1.833 a Ana',
    ]);
    await user.click(pay[0]);
    const confirm = await screen.findByRole('alertdialog');
    expect(
      within(confirm).getByText('¿Carla le pagó $3.333 a Ana?')
    ).toBeInTheDocument();
    // Nothing is registered until the user confirms.
    expect((await repository.get('g1'))?.payments).toHaveLength(0);
    await user.click(
      within(confirm).getByRole('button', { name: 'Sí, registrar pago' })
    );
    expect(await screen.findByText('Pago registrado')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );

    const payments = (await repository.get('g1'))?.payments ?? [];
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      fromId: 'Carla',
      toId: 'Ana',
      amount: 3333,
      date: todayLocal(),
    });
    expect(screen.queryByText('¡Están al día! 🎉')).not.toBeInTheDocument();

    // Only Beto → Ana is left.
    await user.click(
      await screen.findByRole('button', {
        name: 'Marcar como pagado: Beto le paga $1.833 a Ana',
      })
    );
    await user.click(
      await screen.findByRole('button', { name: 'Sí, registrar pago' })
    );
    expect(await screen.findByText('¡Están al día! 🎉')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Marcar como pagado/ })
    ).not.toBeInTheDocument();
    expect((await repository.get('g1'))?.payments).toHaveLength(2);
  });

  it('cancelar la confirmación no registra nada', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithDebts()],
    });
    await user.click(
      (await screen.findAllByRole('button', { name: /^Marcar como pagado/ }))[0]
    );
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
    expect((await repository.get('g1'))?.payments).toHaveLength(0);
  });

  it('el desglose permite verificar el saldo: pagó, le corresponde y pagos', async () => {
    const group = groupWithDebts();
    group.payments.push({
      id: 'p1',
      fromId: 'Carla',
      toId: 'Ana',
      amount: 1000,
      date: '2026-01-02',
      createdAt: '2026-01-02T10:00:00.000Z',
    });
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Ver detalle de Ana' })
    );
    const row = screen
      .getByRole('button', { name: 'Ver detalle de Ana' })
      .closest('li')!;
    expect(within(row).getByText('Pagó en gastos')).toBeInTheDocument();
    expect(within(row).getByText('$10.000')).toBeInTheDocument();
    expect(within(row).getByText('Le corresponde')).toBeInTheDocument();
    // 3.334 (supermercado) + 1.500 (taxi)
    expect(within(row).getByText('$4.834')).toBeInTheDocument();
    expect(within(row).getByText('Pagos que recibió')).toBeInTheDocument();
    // in the sum and in the payment line
    expect(within(row).getAllByText('−$1.000')).toHaveLength(2);
    // 10.000 − 4.834 − 1.000
    expect(within(row).getByText('$4.166')).toBeInTheDocument();
    expect(within(row).getByText('Supermercado')).toBeInTheDocument();
    expect(within(row).getByText('Pagó $10.000')).toBeInTheDocument();
    expect(within(row).getByText('Le tocó $3.334')).toBeInTheDocument();
    expect(within(row).getByText('Taxi')).toBeInTheDocument();
    expect(within(row).getByText('Le tocó $1.500')).toBeInTheDocument();
    expect(within(row).getByText(/Recibió de Carla/)).toBeInTheDocument();
  });

  it('lista los pagos, permite eliminarlos sin confirmar y deshacer', async () => {
    const group = groupWithDebts();
    group.payments.push({
      id: 'p1',
      fromId: 'Carla',
      toId: 'Ana',
      amount: 3333,
      date: '2026-01-02',
      createdAt: '2026-01-02T10:00:00.000Z',
    });
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group],
    });
    const section = (
      await screen.findByRole('heading', { name: 'Pagos registrados' })
    ).closest('section')!;
    expect(within(section).getByText('Carla → Ana')).toBeInTheDocument();
    expect(within(section).getByText('2 ene 2026')).toBeInTheDocument();

    await user.click(
      within(section).getByRole('button', {
        name: 'Eliminar pago de Carla a Ana',
      })
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(async () =>
      expect((await repository.get('g1'))?.payments).toHaveLength(0)
    );
    expect(await screen.findByText('Pago eliminado')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Pagos registrados' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(
      await screen.findByRole('heading', { name: 'Pagos registrados' })
    ).toBeInTheDocument();
    expect((await repository.get('g1'))?.payments).toHaveLength(1);
  });

  it('copia el resumen al portapapeles', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithDebts()],
    });
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    await user.click(
      await screen.findByRole('button', { name: 'Copiar resumen' })
    );
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Supermercado');
    expect(await screen.findByText('Resumen copiado')).toBeInTheDocument();
  });

  it('si el portapapeles falla, muestra el texto para copiarlo a mano', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithDebts()],
    });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied')
    );
    await user.click(
      await screen.findByRole('button', { name: 'Copiar resumen' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Copia el resumen',
    });
    const box = within(dialog).getByRole('textbox', {
      name: 'Resumen del grupo',
    });
    expect((box as HTMLTextAreaElement).value).toContain('Supermercado');
  });

  describe('compartir resumen', () => {
    afterEach(() => {
      Reflect.deleteProperty(navigator, 'share');
    });

    function stubShare(impl: () => Promise<void>) {
      const share = vi.fn(impl);
      Object.defineProperty(navigator, 'share', {
        value: share,
        configurable: true,
        writable: true,
      });
      return share;
    }

    it('con Web Share API el botón dice "Compartir resumen" y comparte el texto', async () => {
      const share = stubShare(() => Promise.resolve());
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithDebts()],
      });
      expect(
        screen.queryByRole('button', { name: 'Copiar resumen' })
      ).not.toBeInTheDocument();
      await user.click(
        await screen.findByRole('button', { name: 'Compartir resumen' })
      );
      expect(share).toHaveBeenCalledTimes(1);
      expect(share.mock.calls[0]).toEqual([
        expect.objectContaining({
          text: expect.stringContaining('Supermercado'),
        }),
      ]);
    });

    it('si el usuario cancela, no muestra errores ni diálogos', async () => {
      const share = stubShare(() =>
        Promise.reject(new DOMException('cancelled', 'AbortError'))
      );
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithDebts()],
      });
      await user.click(
        await screen.findByRole('button', { name: 'Compartir resumen' })
      );
      await waitFor(() => expect(share).toHaveBeenCalled());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Resumen copiado')).not.toBeInTheDocument();
    });

    it('si compartir falla por otra causa, copia el resumen', async () => {
      stubShare(() => Promise.reject(new Error('boom')));
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithDebts()],
      });
      const writeText = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue(undefined);
      await user.click(
        await screen.findByRole('button', { name: 'Compartir resumen' })
      );
      expect(await screen.findByText('Resumen copiado')).toBeInTheDocument();
      expect(writeText).toHaveBeenCalledTimes(1);
    });
  });
});
