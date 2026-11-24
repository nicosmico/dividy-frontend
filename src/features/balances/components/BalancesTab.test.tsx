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

  describe('orden y estado', () => {
    const headings = () =>
      screen
        .getAllByRole('heading')
        .map((h) => h.textContent?.replace(/\s+/g, ' ').trim());

    it('con deuda: estado y Compartir arriba, luego transferencias, pagos y el detalle', async () => {
      const group = groupWithDebts();
      group.payments.push({
        id: 'p1',
        fromId: 'Carla',
        toId: 'Ana',
        amount: 1000,
        date: '2026-01-02',
        createdAt: '2026-01-02T10:00:00.000Z',
      });
      renderWithProviders(undefined, { route: ROUTE, groups: [group] });
      await screen.findByRole('heading', { name: 'Detalle' });
      const all = headings();
      const order = all.slice(
        all.findIndex((h) => h?.startsWith('Pendiente:'))
      );
      expect(order.slice(0, 5)).toEqual([
        expect.stringMatching(/^Pendiente: \$\d/),
        'Para quedar al día',
        'Pagos registrados',
        'Detalle',
        'Gastó vs. su parte',
      ]);
      expect(order.at(-1)).toBe('Saldo por miembro');
      expect(
        screen.getByRole('heading', { name: 'Gastó vs. su parte' }).tagName
      ).toBe('H3');
    });

    it('Compartir resumen queda en el estado de arriba, antes de las transferencias, y no se repite abajo', async () => {
      renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithDebts()],
      });
      const share = await screen.findByRole('button', {
        name: 'Copiar resumen',
      });
      expect(screen.getAllByRole('button', { name: /resumen$/ })).toHaveLength(
        1
      );
      const status = share.closest('section')!;
      expect(status).toHaveTextContent('Pendiente:');
      const transfers = screen
        .getByRole('heading', { name: 'Para quedar al día' })
        .closest('section')!;
      expect(
        status.compareDocumentPosition(transfers) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('el estado pendiente suma las transferencias sugeridas', async () => {
      renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithDebts()],
      });
      // 3.333 + 1.833
      expect(
        await screen.findByRole('heading', {
          name: 'Pendiente: $5.166 por saldar',
        })
      ).toBeInTheDocument();
    });

    it('al día: estado "¡Están al día! 🎉" con Compartir, sin transferencias', async () => {
      const group = makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [
          {
            id: 'e1',
            description: 'Cena',
            amount: 10000,
            payer: 'Ana',
            among: ['Ana', 'Beto'],
          },
        ],
        payments: [{ id: 'p1', from: 'Beto', to: 'Ana', amount: 5000 }],
      });
      renderWithProviders(undefined, { route: ROUTE, groups: [group] });
      const heading = await screen.findByRole('heading', {
        name: '¡Están al día! 🎉',
      });
      expect(
        within(heading.closest('section')!).getByRole('button', {
          name: 'Copiar resumen',
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Para quedar al día' })
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/^Pendiente:/)).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Pagos registrados' })
      ).toBeInTheDocument();
    });
  });

  describe('"Ver cómo se calculó" a pantalla completa', () => {
    async function open() {
      const view = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithDebts()],
      });
      const trigger = await screen.findByRole('button', {
        name: 'Ver cómo se calculó',
      });
      await view.user.click(trigger);
      const dialog = await screen.findByRole('dialog', {
        name: 'Cómo se calculó',
      });
      await within(dialog).findByText('1 · Cada uno paga');
      return { ...view, trigger, dialog };
    }

    it('tiene encabezado con el grupo, narración en el cuerpo y controles en el pie', async () => {
      const { dialog } = await open();
      const header = dialog.querySelector('[data-slot="page-dialog-header"]')!;
      expect(header).toHaveTextContent('Cómo se calculó');
      expect(header).toHaveTextContent('Grupo');
      const body = dialog.querySelector('[data-slot="player-body"]')!;
      const footer = dialog.querySelector('[data-slot="player-footer"]')!;
      expect(body.querySelector('[aria-live="polite"]')).not.toBeNull();
      expect(
        within(footer as HTMLElement).getByRole('button', {
          name: 'Paso siguiente',
        })
      ).toBeInTheDocument();
      expect(footer.querySelector('[aria-live]')).toBeNull();
    });

    it('el botón Cerrar cierra y devuelve el foco a "Ver cómo se calculó"', async () => {
      const { user, dialog, trigger } = await open();
      const close = within(dialog).getByRole('button', { name: 'Cerrar' });
      expect(
        within(dialog).getAllByRole('button', { name: 'Cerrar' })
      ).toHaveLength(1);
      await user.click(close);
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      expect(trigger).toHaveFocus();
    });
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
    const section = (
      await screen.findByRole('heading', { name: 'Saldo por miembro' })
    ).closest('section')!;
    expect(within(section).getByText('Le deben $5.166')).toBeInTheDocument();
    expect(within(section).getByText('Debe $1.833')).toBeInTheDocument();
    expect(within(section).getByText('Debe $3.333')).toBeInTheDocument();
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
      'Marcar como pagado: Carla le transfiere $3.333 a Ana',
      'Marcar como pagado: Beto le transfiere $1.833 a Ana',
    ]);
    await user.click(pay[0]);
    const confirm = await screen.findByRole('alertdialog');
    expect(
      within(confirm).getByText('¿Carla le transfirió $3.333 a Ana?')
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
        name: 'Marcar como pagado: Beto le transfiere $1.833 a Ana',
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

  it('el desglose permite verificar el saldo: pagó, su parte y pagos', async () => {
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
      await screen.findByRole('button', {
        name: /^Ana\s*(Le deben|Debe|Al día)/,
      })
    );
    const row = screen
      .getByRole('button', { name: /^Ana\s*(Le deben|Debe|Al día)/ })
      .closest('li')!;
    expect(within(row).getByText('Gastó en el grupo')).toBeInTheDocument();
    expect(within(row).getByText('$10.000')).toBeInTheDocument();
    expect(within(row).getByText('Su parte de los gastos')).toBeInTheDocument();
    // 3.334 (supermercado) + 1.500 (taxi), subtracted
    expect(within(row).getByText('−$4.834')).toBeInTheDocument();
    expect(within(row).getByText('Pagos recibidos')).toBeInTheDocument();
    // in the sum and in the payment line
    expect(within(row).getAllByText('−$1.000')).toHaveLength(2);
    expect(within(row).queryByText('Pagos enviados')).toBeNull();
    // 10.000 − 4.834 − 1.000, in words
    const balance = within(row).getByText('Saldo').closest('div')!;
    expect(balance).toHaveTextContent('Le deben $4.166');
    expect(
      within(row).getByText(
        'Saldo = gastó en el grupo − su parte de los gastos − pagos recibidos + pagos enviados.'
      )
    ).toBeInTheDocument();
    expect(within(row).getByText('Supermercado')).toBeInTheDocument();
    expect(within(row).getByText('Gastó $10.000')).toBeInTheDocument();
    expect(within(row).getByText('Su parte $3.334')).toBeInTheDocument();
    expect(within(row).getByText('Taxi')).toBeInTheDocument();
    expect(within(row).getByText('Su parte $1.500')).toBeInTheDocument();
    expect(
      within(row).getByText('Pagos enviados y recibidos')
    ).toBeInTheDocument();
    expect(within(row).getByText(/Recibió de Carla/)).toBeInTheDocument();
  });

  it('el desglose muestra "Pagos enviados" con + y el saldo en palabras', async () => {
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
      await screen.findByRole('button', {
        name: /^Carla\s*(Le deben|Debe|Al día)/,
      })
    );
    const row = screen
      .getByRole('button', { name: /^Carla\s*(Le deben|Debe|Al día)/ })
      .closest('li')!;
    expect(within(row).getByText('Pagos enviados')).toBeInTheDocument();
    expect(within(row).getAllByText('+$1.000')).toHaveLength(2);
    expect(within(row).queryByText('Pagos recibidos')).toBeNull();
    expect(within(row).getByText(/Envió a Ana/)).toBeInTheDocument();
    expect(within(row).getByText('Saldo').closest('div')).toHaveTextContent(
      /^SaldoDebe \$/
    );
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
