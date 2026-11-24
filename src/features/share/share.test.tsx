import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSnapshot,
  formatAmount,
  getPendingAmount,
  snapshotToGroup,
  type Group,
  type Snapshot,
} from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { formatDate, formatDateTime } from '@/lib/dates';
import { currentPath, renderWithProviders } from '@/test/render-with-providers';
import { encodeSnapshot } from './snapshot-codec';

/** Links do not say who you are: start with "nobody to ask" so the sheet stays closed. */
const QUIET = { 'snapshot:trip-1': { none: true as const } };

const OLD = '2026-11-20T15:00:00.000Z';
const TAKEN = '2026-11-24T15:00:00.000Z';
const NEWER = '2026-11-25T15:00:00.000Z';

function tripGroup(): Group {
  return {
    ...makeGroup({
      name: 'Viaje a Pucón',
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [
        {
          id: 'e1',
          description: 'Supermercado',
          amount: 10_000,
          payer: 'Ana',
          among: ['Ana', 'Beto', 'Carla'],
          date: '2026-03-10',
          createdAt: '2026-03-10T12:00:00.000Z',
        },
        {
          id: 'e2',
          description: 'Taxi',
          amount: 3_000,
          payer: 'Beto',
          among: ['Ana', 'Beto'],
          date: '2026-03-09',
          createdAt: '2026-03-09T12:00:00.000Z',
        },
      ],
      payments: [
        {
          id: 'p1',
          from: 'Beto',
          to: 'Ana',
          amount: 500,
          createdAt: '2026-03-11T12:00:00.000Z',
        },
      ],
    }),
    id: 'trip-1',
  };
}

const snapshotAt = (takenAt: string, group = tripGroup()): Snapshot =>
  createSnapshot(group, takenAt);

async function linkRoute(snapshot: Snapshot, tab = 'expenses') {
  return `/shared/${tab}#${await encodeSnapshot(snapshot)}`;
}

describe('abrir un link de solo lectura', () => {
  it('abre directo la captura en la primera visita, sin la bienvenida', async () => {
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: `/shared#${await encodeSnapshot(snapshotAt(TAKEN))}`,
    });
    expect(
      await screen.findByRole('heading', { name: 'Viaje a Pucón' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Divide gastos sin enredos' })
    ).not.toBeInTheDocument();
    await waitFor(() => expect(currentPath()).toBe('/shared/expenses'));
    expect(await screen.findByText('Supermercado')).toBeInTheDocument();
  });

  it('muestra el aviso fijo con la fecha y la hora de la captura, como región (no alert)', async () => {
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(TAKEN)),
    });
    const banner = await screen.findByRole('region', {
      name: 'Captura de solo lectura',
    });
    expect(banner).toHaveTextContent(
      `Captura del ${formatDateTime(TAKEN)}. Es solo para ver: los cambios que se hagan en el grupo original no aparecen aquí. Para ver una versión más nueva, pide que te compartan el link de nuevo.`
    );
    expect(within(banner).getByText(formatDateTime(TAKEN))).toHaveAttribute(
      'datetime',
      TAKEN
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Once scrolled past, a one-line bar repeats it (hidden from screen readers).
    const compact = screen.getByTestId('snapshot-compact-banner');
    expect(compact).toHaveAttribute('aria-hidden', 'true');
    expect(compact).toHaveTextContent(
      `Captura del ${formatDateTime(TAKEN)} · solo lectura`
    );
  });

  it('solo tiene las pestañas Gastos y Saldos', async () => {
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(TAKEN)),
    });
    const nav = await screen.findByRole('navigation', {
      name: 'Secciones del grupo',
    });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Gastos', 'Saldos']);
  });

  it('Gastos: el total y la lista, sin Agregar gasto ni filas que se puedan editar ni menú del grupo', async () => {
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(TAKEN)),
    });
    expect(await screen.findByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Total del grupo')).toBeInTheDocument();
    expect(screen.getByText('$13.000')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Agregar gasto/ })
    ).not.toBeInTheDocument();
    // Rows are plain text: nothing opens the edit dialog.
    expect(
      screen.queryByRole('button', { name: /Supermercado/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Opciones del grupo' })
    ).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute(
      'data-floating-action'
    );
  });

  it('una captura sin gastos lo dice, sin botón para agregar', async () => {
    const empty = createSnapshot(
      makeGroup({ name: 'Casa', members: ['Ana', 'Beto'] }),
      TAKEN
    );
    renderWithProviders(undefined, { route: await linkRoute(empty) });
    expect(await screen.findByText('Aún no hay gastos')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Agregar gasto/ })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/necesitas al menos/)).not.toBeInTheDocument();
  });

  describe('Saldos', () => {
    it('muestra los mismos saldos y transferencias, sin Marcar como pagado ni eliminar pagos', async () => {
      const { user } = renderWithProviders(undefined, {
        viewers: QUIET,
        route: await linkRoute(snapshotAt(TAKEN)),
      });
      await user.click(await screen.findByRole('link', { name: 'Saldos' }));
      expect(
        await screen.findByRole('heading', { name: 'Para quedar al día' })
      ).toBeInTheDocument();
      // Same numbers as the original group.
      expect(screen.getByText(/Pendiente:/)).toHaveTextContent(
        formatAmount(getPendingAmount(tripGroup()))
      );
      expect(screen.getAllByText('Beto → Ana').length).toBeGreaterThan(0);
      expect(
        screen.getByRole('heading', { name: 'Pagos registrados' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Marcar como pagado/ })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Eliminar pago/ })
      ).not.toBeInTheDocument();
      // The tab keeps working after navigating: the hash was not lost.
      expect(currentPath()).toBe('/shared/balances');
    });

    it('permite Ver cómo se calculó y Ver como tabla', async () => {
      const { user } = renderWithProviders(undefined, {
        viewers: QUIET,
        route: await linkRoute(snapshotAt(TAKEN), 'balances'),
      });
      await user.click(
        await screen.findByRole('button', { name: /Ver cómo se calculó/ })
      );
      expect(
        await screen.findByRole('dialog', { name: 'Cómo se calculó' })
      ).toBeInTheDocument();
    });

    it('las caritas siguen según el saldo', async () => {
      renderWithProviders(undefined, {
        viewers: QUIET,
        route: await linkRoute(snapshotAt(TAKEN), 'balances'),
      });
      expect((await screen.findAllByAltText(/Ana/)).length).toBeGreaterThan(0);
    });
  });

  describe('Compartir resumen', () => {
    afterEach(() => {
      Reflect.deleteProperty(navigator, 'share');
    });

    it('dice "Cuentas al <fecha>" y comparte el mismo link de la captura', async () => {
      const snapshot = snapshotAt(TAKEN);
      const token = await encodeSnapshot(snapshot);
      const { user } = renderWithProviders(undefined, {
        viewers: QUIET,
        route: `/shared/balances#${token}`,
      });
      const writeText = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue(undefined);
      await user.click(
        await screen.findByRole('button', { name: 'Copiar resumen' })
      );
      const text = writeText.mock.calls[0][0];
      expect(text).toContain(
        `*Viaje a Pucón*\nCuentas al ${formatDateTime(TAKEN)}`
      );
      expect(
        text.endsWith(
          `\n\nVer el detalle: ${window.location.origin}/shared#${token}`
        )
      ).toBe(true);
    });

    it('con la Web Share API comparte ese texto', async () => {
      const share = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'share', {
        value: share,
        configurable: true,
        writable: true,
      });
      const { user } = renderWithProviders(undefined, {
        viewers: QUIET,
        route: await linkRoute(snapshotAt(TAKEN), 'balances'),
      });
      await user.click(
        await screen.findByRole('button', { name: 'Compartir resumen' })
      );
      await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Ver el detalle: '),
        })
      );
    });

    it('lleva el aviso de privacidad bajo el botón', async () => {
      renderWithProviders(undefined, {
        viewers: QUIET,
        route: await linkRoute(snapshotAt(TAKEN), 'balances'),
      });
      const notice = await screen.findByText(
        'Incluye un link de solo lectura. Quien lo tenga verá los nombres, gastos y pagos del grupo.'
      );
      expect(notice).toHaveClass('text-muted-foreground');
    });
  });
});

describe('link inválido', () => {
  it.each([
    ['dañado', '#v1.esto-no-es-una-captura'],
    ['de otra versión', '#v9.abc'],
    ['vacío', '#'],
    ['sin hash', ''],
  ])('%s: pantalla amable con salida a Mis grupos', async (_name, hash) => {
    const { user } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: `/shared${hash}`,
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Este link no se pudo abrir',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Puede estar incompleto o ser de una versión distinta de Dividy. Pide que te lo compartan de nuevo.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Captura de solo lectura' })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ir a Mis grupos' }));
    await waitFor(() => expect(currentPath()).toBe('/'));
  });

  it('un link truncado no muestra un grupo a medias', async () => {
    const token = await encodeSnapshot(snapshotAt(TAKEN));
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: `/shared#${token.slice(0, Math.floor(token.length / 2))}`,
    });
    expect(
      await screen.findByRole('heading', { name: 'Este link no se pudo abrir' })
    ).toBeInTheDocument();
  });
});

describe('guardar la captura', () => {
  it('"Guardar en mi celular" la guarda y avisa', async () => {
    const snapshot = snapshotAt(TAKEN);
    const { user, snapshotRepository } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshot),
    });
    await user.click(
      await screen.findByRole('button', { name: 'Guardar en mi celular' })
    );
    expect(
      await screen.findByText('Captura guardada en Mis grupos')
    ).toBeInTheDocument();
    expect(await snapshotRepository.get('trip-1')).toEqual(snapshot);
    expect(
      await screen.findByText('Ya está guardada en Mis grupos')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Guardar en mi celular' })
    ).toBeNull();
  });

  it('no mezcla la captura con los grupos propios', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(TAKEN)),
    });
    await user.click(
      await screen.findByRole('button', { name: 'Guardar en mi celular' })
    );
    await screen.findByText('Captura guardada en Mis grupos');
    expect(await repository.list()).toEqual([]);
  });

  it('un link más nuevo ofrece actualizar y reemplaza la captura guardada', async () => {
    const { user, snapshotRepository } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(NEWER)),
      snapshots: [snapshotAt(TAKEN)],
    });
    expect(
      screen.queryByRole('button', { name: 'Guardar en mi celular' })
    ).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: 'Actualizar captura guardada' })
    );
    expect(await screen.findByText('Captura actualizada')).toBeInTheDocument();
    expect((await snapshotRepository.list()).map((s) => s.takenAt)).toEqual([
      NEWER,
    ]);
  });

  it('un link más viejo avisa y no reemplaza nada', async () => {
    const { snapshotRepository } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(OLD)),
      snapshots: [snapshotAt(TAKEN)],
    });
    const notice = (await screen.findByText(/Ya tienes guardada/)).closest(
      '[role="status"]'
    ) as HTMLElement;
    expect(notice).toHaveTextContent(
      `Ya tienes guardada una captura más nueva (del ${formatDateTime(TAKEN)}).`
    );
    expect(
      within(notice).getByRole('link', { name: 'Ver la más nueva' })
    ).toHaveAttribute('href', '/shared/trip-1/expenses');
    expect(
      screen.queryByRole('button', { name: /Guardar|Actualizar/ })
    ).not.toBeInTheDocument();
    expect((await snapshotRepository.get('trip-1'))?.takenAt).toBe(TAKEN);
  });

  it('"Ver la más nueva" abre la captura guardada', async () => {
    const { user } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(OLD)),
      snapshots: [snapshotAt(TAKEN)],
    });
    await user.click(
      await screen.findByRole('link', { name: 'Ver la más nueva' })
    );
    await waitFor(() => expect(currentPath()).toBe('/shared/trip-1/expenses'));
    expect(
      await screen.findByRole('button', { name: 'Eliminar captura' })
    ).toBeInTheDocument();
  });

  it('la misma captura ya está guardada', async () => {
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(TAKEN)),
      snapshots: [snapshotAt(TAKEN)],
    });
    expect(
      await screen.findByText('Ya está guardada en Mis grupos')
    ).toBeInTheDocument();
  });

  it('si no se puede guardar, avisa y deja el botón para reintentar', async () => {
    const { user, snapshotRepository } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: await linkRoute(snapshotAt(TAKEN)),
    });
    vi.spyOn(snapshotRepository, 'save').mockRejectedValue(new Error('full'));
    await user.click(
      await screen.findByRole('button', { name: 'Guardar en mi celular' })
    );
    expect(
      await screen.findByText(/No pudimos guardar la captura/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar en mi celular' })
    ).toBeEnabled();
  });
});

describe('captura guardada', () => {
  const saved = () => snapshotAt(TAKEN);

  it('abre en /shared/:id con el mismo aviso y "Eliminar captura" en vez de "Guardar"', async () => {
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: '/shared/trip-1',
      snapshots: [saved()],
    });
    expect(
      await screen.findByRole('region', { name: 'Captura de solo lectura' })
    ).toHaveTextContent(`Captura del ${formatDateTime(TAKEN)}`);
    await waitFor(() => expect(currentPath()).toBe('/shared/trip-1/expenses'));
    expect(
      screen.getByRole('button', { name: 'Eliminar captura' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Guardar/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Agregar gasto/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
  });

  it('Saldos de una captura guardada no tiene controles de edición', async () => {
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: '/shared/trip-1/balances',
      snapshots: [saved()],
    });
    expect(
      await screen.findByRole('heading', { name: 'Para quedar al día' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Marcar como pagado|Eliminar pago/ })
    ).not.toBeInTheDocument();
  });

  it('el resumen de una captura guardada comparte la misma captura', async () => {
    const snapshot = saved();
    const { user } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: '/shared/trip-1/balances',
      snapshots: [snapshot],
    });
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    await user.click(
      await screen.findByRole('button', { name: 'Copiar resumen' })
    );
    const text = writeText.mock.calls[0][0];
    expect(text).toContain(`Cuentas al ${formatDateTime(TAKEN)}`);
    const token = text.split('/shared#')[1];
    expect(token).toBe(await encodeSnapshot(snapshot));
  });

  it('eliminar la captura vuelve a Mis grupos con un aviso para deshacer', async () => {
    const { user, snapshotRepository } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: '/shared/trip-1/expenses',
      snapshots: [saved()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar captura' })
    );
    expect(await screen.findByText('Captura eliminada')).toBeInTheDocument();
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(await snapshotRepository.get('trip-1')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Captura restaurada')).toBeInTheDocument();
    expect(await snapshotRepository.get('trip-1')).toEqual(saved());
  });

  it('una captura que no está guardada muestra una pantalla amable', async () => {
    renderWithProviders(undefined, { route: '/shared/nada/expenses' });
    expect(
      await screen.findByRole('heading', { name: 'Captura no encontrada' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ir a Mis grupos' })
    ).toBeInTheDocument();
  });
});

describe('Mis grupos: Compartidos conmigo', () => {
  it('no aparece si no hay capturas guardadas', async () => {
    renderWithProviders(undefined, { groups: [tripGroup()] });
    expect(
      await screen.findByRole('heading', { name: 'Mis grupos' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Compartidos conmigo · solo lectura')
    ).not.toBeInTheDocument();
  });

  it('aparece debajo de los grupos propios, con ojo y la fecha de cada captura', async () => {
    const own: Group = { ...tripGroup(), id: 'own-1', name: 'Mi casa' };
    renderWithProviders(undefined, {
      viewers: QUIET,
      groups: [own],
      snapshots: [snapshotAt(TAKEN)],
    });
    const heading = await screen.findByRole('heading', {
      name: 'Compartidos conmigo · solo lectura',
    });
    const ownCard = screen.getByRole('link', { name: /Mi casa/ });
    expect(
      ownCard.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    const section = heading.closest('section')!;
    const card = within(section).getByRole('link', { name: /Viaje a Pucón/ });
    expect(card).toHaveTextContent(`Captura del ${formatDate(TAKEN)}`);
    expect(card).toHaveAttribute('href', '/shared/trip-1/expenses');
    expect(card.querySelector('svg.lucide-eye')).not.toBeNull();
    // Never mixed with the groups of your own.
    expect(within(section).queryByText('Mi casa')).not.toBeInTheDocument();
  });

  it('con solo capturas (sin grupos propios) muestra Mis grupos, no la bienvenida', async () => {
    renderWithProviders(undefined, { snapshots: [snapshotAt(TAKEN)] });
    expect(
      await screen.findByRole('heading', { name: 'Mis grupos' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Divide gastos sin enredos' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Aún no tienes grupos propios/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Crear grupo/ })
    ).toBeInTheDocument();
  });

  it('sin grupos ni capturas sigue mostrando la bienvenida', async () => {
    renderWithProviders();
    expect(
      await screen.findByRole('heading', { name: 'Divide gastos sin enredos' })
    ).toBeInTheDocument();
  });

  it('abre la captura al tocar la tarjeta', async () => {
    const { user } = renderWithProviders(undefined, {
      viewers: QUIET,
      snapshots: [snapshotAt(TAKEN)],
    });
    await user.click(
      await screen.findByRole('link', { name: /Viaje a Pucón/ })
    );
    await waitFor(() => expect(currentPath()).toBe('/shared/trip-1/expenses'));
  });

  it('se elimina con un aviso para deshacer', async () => {
    const own: Group = { ...tripGroup(), id: 'own-1', name: 'Mi casa' };
    const { user, snapshotRepository } = renderWithProviders(undefined, {
      viewers: QUIET,
      groups: [own],
      snapshots: [snapshotAt(TAKEN)],
    });
    await user.click(
      await screen.findByRole('button', {
        name: 'Eliminar captura de Viaje a Pucón',
      })
    );
    expect(await screen.findByText('Captura eliminada')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText('Compartidos conmigo · solo lectura')
      ).not.toBeInTheDocument()
    );
    expect(await snapshotRepository.list()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(
      await screen.findByText('Compartidos conmigo · solo lectura')
    ).toBeInTheDocument();
    expect(await snapshotRepository.list()).toHaveLength(1);
  });

  it('si ya guardaste otra captura de ese grupo, deshacer no la pisa', async () => {
    const { user, snapshotRepository } = renderWithProviders(undefined, {
      viewers: QUIET,
      snapshots: [snapshotAt(TAKEN)],
    });
    await user.click(
      await screen.findByRole('button', {
        name: 'Eliminar captura de Viaje a Pucón',
      })
    );
    await screen.findByText('Captura eliminada');
    await snapshotRepository.save(snapshotAt(NEWER));
    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(
      await screen.findByText(/ya guardaste otra captura de este grupo/)
    ).toBeInTheDocument();
    expect((await snapshotRepository.get('trip-1'))?.takenAt).toBe(NEWER);
  });

  it('un grupo propio nunca es editable desde una captura: usan rutas distintas', async () => {
    const snapshot = snapshotAt(TAKEN);
    expect(snapshotToGroup(snapshot).id).toBe('trip-1');
    renderWithProviders(undefined, {
      viewers: QUIET,
      route: '/groups/trip-1/expenses',
      snapshots: [snapshot],
    });
    expect(
      await screen.findByRole('heading', { name: 'Grupo no encontrado' })
    ).toBeInTheDocument();
  });
});

describe('compartir un grupo propio', () => {
  it('el resumen termina con el link y debajo del botón va el aviso de privacidad', async () => {
    const group = tripGroup();
    const { user } = renderWithProviders(undefined, {
      viewers: QUIET,
      route: '/groups/trip-1/balances',
      groups: [group],
    });
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    expect(
      await screen.findByText(/Incluye un link de solo lectura\./)
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: 'Copiar resumen' })
    );
    const text = writeText.mock.calls[0][0];
    expect(text).not.toContain('Cuentas al');
    const [, link] = text.split('\n\nVer el detalle: ');
    expect(link.startsWith(`${window.location.origin}/shared#v1.`)).toBe(true);
    const url = new URL(link);
    expect(url.search).toBe('');
    // The link opens a capture with the same numbers as the group.
    const { decodeSnapshot } = await import('./snapshot-codec');
    const decoded = await decodeSnapshot(url.hash);
    expect(decoded).toEqual({
      ok: true,
      value: createSnapshot(group, '2026-05-01T10:00:00.000Z'),
    });
  });
});
