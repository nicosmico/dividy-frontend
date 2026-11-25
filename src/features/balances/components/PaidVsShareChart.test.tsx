import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { ExplanationPlayer } from '@/features/explanation/ExplanationPlayer';
import { renderWithProviders } from '@/test/render-with-providers';

const ROUTE = '/groups/g1/balances';

function tripGroup() {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        description: 'Cabaña',
        amount: 30000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
      {
        description: 'Bebidas',
        amount: 6000,
        payer: 'Beto',
        among: ['Beto', 'Carla'],
      },
    ],
  });
}

async function chart() {
  const heading = await screen.findByRole('heading', {
    name: 'Gastó vs. su parte',
  });
  return heading.closest('section')!;
}

describe('Gráfico "Gastó vs. su parte"', () => {
  it('no aparece sin gastos', async () => {
    renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    await screen.findByText('Aún no hay saldos');
    expect(screen.queryByText('Gastó vs. su parte')).toBeNull();
  });

  it('va en el detalle, después de las transferencias, con una fila por miembro con saldo y totales', async () => {
    renderWithProviders(undefined, { route: ROUTE, groups: [tripGroup()] });
    const section = await chart();
    const transfers = screen.getByRole('heading', {
      name: 'Para quedar al día',
    });
    expect(
      transfers.compareDocumentPosition(section) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const rows = within(within(section).getAllByRole('list')[0]).getAllByRole(
      'listitem'
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Ana');
    expect(rows[0]).toHaveTextContent('Le deben $20.000');
    expect(rows[0]).toHaveTextContent('$30.000');
    expect(rows[1]).toHaveTextContent('Beto');
    expect(rows[1]).toHaveTextContent('Debe $7.000');
    expect(rows[2]).toHaveTextContent('Debe $13.000');
    expect(
      rows.map((r) => r.querySelector('[data-mood]')?.getAttribute('data-mood'))
    ).toEqual(['sad', 'sad', 'sad']);
  });

  it('cada tramo tiene nombre accesible con gasto y monto', async () => {
    renderWithProviders(undefined, { route: ROUTE, groups: [tripGroup()] });
    const section = await chart();
    expect(
      within(section).getAllByRole('button', {
        name: 'Cabaña: $30.000 · entre 3: $10.000 c/u',
      })
    ).toHaveLength(1);
    expect(
      within(section).getAllByRole('button', { name: 'Cabaña: $10.000' })
    ).toHaveLength(3);
    expect(
      within(section).getAllByRole('button', { name: 'Bebidas: $3.000' })
    ).toHaveLength(2);
    expect(
      within(section).getAllByRole('button', {
        name: 'Bebidas: $6.000 · entre 2: $3.000 c/u',
      })
    ).toHaveLength(1);
  });

  it('los tramos de "Gastó" llevan un corte por participante y los de "Su parte" ninguno', async () => {
    renderWithProviders(undefined, { route: ROUTE, groups: [tripGroup()] });
    const section = await chart();
    const rows = within(within(section).getAllByRole('list')[0]).getAllByRole(
      'listitem'
    );
    const bars = (row: HTMLElement) =>
      row.querySelectorAll('[data-slot="bar"]');
    // Ana: Cabaña ($30.000) among 3 -> 2 cuts at 1/3 and 2/3.
    const [paid, share] = [...bars(rows[0])];
    const cuts = [...paid.querySelectorAll<HTMLElement>('[data-slot="cut"]')];
    expect(cuts).toHaveLength(2);
    expect(cuts.map((c) => parseFloat(c.style.left))).toEqual([
      expect.closeTo(100 / 3, 3),
      expect.closeTo(200 / 3, 3),
    ]);
    expect(paid.querySelector('[data-slot="cuts"]')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(share.querySelectorAll('[data-slot="cut"]')).toHaveLength(0);
    // "Gastó" is only outlined (the whole that was split); "Su parte" is filled.
    expect(paid.querySelector('[data-style]')).toHaveAttribute(
      'data-style',
      'outline'
    );
    expect(share.querySelector('[data-style]')).toHaveAttribute(
      'data-style',
      'solid'
    );
    // Beto: Bebidas ($6.000) among 2 -> 1 cut at 50%.
    expect(bars(rows[1])[0].querySelectorAll('[data-slot="cut"]')).toHaveLength(
      1
    );
    expect(bars(rows[1])[1].querySelectorAll('[data-slot="cut"]')).toHaveLength(
      0
    );
  });

  it('sin espacio (partes de menos de ~6 px) no dibuja los cortes', async () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 100 } as DOMRect);
    try {
      renderWithProviders(undefined, { route: ROUTE, groups: [tripGroup()] });
      const section = await chart();
      // 100 px minus the room for the amount leaves 16 px: 3 parts of ~5 px.
      expect(section.querySelectorAll('[data-slot="cuts"]').length).toBe(0);
    } finally {
      rect.mockRestore();
    }
  });

  it('la leyenda lista ícono, nombre y monto total de cada gasto', async () => {
    renderWithProviders(undefined, { route: ROUTE, groups: [tripGroup()] });
    const section = await chart();
    const items = within(
      within(section).getByRole('list', { name: 'Leyenda de gastos' })
    ).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'Cabaña$30.000',
      'Bebidas$6.000',
    ]);
    expect(items[0].querySelector('[data-slot="entity-icon"]')).not.toBeNull();
  });

  it('con más de 12 gastos agrupa el resto en "Otros"', async () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: Array.from({ length: 14 }, (_, i) => ({
        description: `Gasto ${i + 1}`,
        amount: (20 - i) * 1000,
        payer: 'Ana',
        among: ['Ana', 'Beto'],
      })),
    });
    renderWithProviders(undefined, { route: ROUTE, groups: [group] });
    const section = await chart();
    const items = within(
      within(section).getByRole('list', { name: 'Leyenda de gastos' })
    ).getAllByRole('listitem');
    expect(items).toHaveLength(13);
    expect(items[12]).toHaveTextContent('Otros (2 gastos)$15.000');
  });

  it('al enfocar un tramo muestra el ícono, el nombre y el monto, y Escape lo cierra', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [tripGroup()],
    });
    const section = await chart();
    const segment = within(section).getByRole('button', {
      name: 'Cabaña: $30.000 · entre 3: $10.000 c/u',
    });
    segment.focus();
    const tip = await screen.findByRole('dialog', {
      name: 'Cabaña: $30.000 · entre 3: $10.000 c/u',
    });
    expect(within(tip).getByText('Cabaña')).toBeInTheDocument();
    expect(
      within(tip).getByText('$30.000 · entre 3: $10.000 c/u')
    ).toBeInTheDocument();
    expect(tip.querySelector('[data-slot="entity-icon"]')).not.toBeNull();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('el tramo de un gasto por partes dice cómo se dividió', async () => {
    renderWithProviders(undefined, {
      route: ROUTE,
      groups: [
        makeGroup({
          members: ['Ana', 'Beto', 'Carla'],
          expenses: [
            {
              description: 'Cabaña',
              amount: 150_000,
              payer: 'Ana',
              among: ['Ana', 'Beto', 'Carla'],
              split: {
                type: 'shares',
                participantIds: ['Ana', 'Beto', 'Carla'],
                parts: { Ana: 2, Beto: 1, Carla: 1 },
              },
            },
          ],
        }),
      ],
    });
    const section = await chart();
    const name = 'Cabaña: $150.000 · por partes: Ana 2, Beto 1, Carla 1';
    within(section).getByRole('button', { name }).focus();
    const tip = await screen.findByRole('dialog', { name });
    expect(
      within(tip).getByText('$150.000 · por partes: Ana 2, Beto 1, Carla 1')
    ).toBeInTheDocument();
    // The long text wraps instead of widening the tooltip.
    expect(tip.className).toContain('max-w-');
  });

  it('tocar un tramo abre su tooltip y las flechas pasan al siguiente tramo', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [tripGroup()],
    });
    const section = await chart();
    const first = within(section).getAllByRole('button', {
      name: /^Cabaña: \$10\.000$/,
    })[1];
    await user.click(first);
    expect(
      await screen.findByRole('dialog', { name: 'Cabaña: $10.000' })
    ).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(
      await screen.findByRole('dialog', { name: 'Bebidas: $3.000' })
    ).toBeInTheDocument();
  });

  it('hay una tabla equivalente con los mismos números', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [tripGroup()],
    });
    const section = await chart();
    await user.click(within(section).getByText('Ver como tabla'));
    const table = within(section).getAllByRole('table')[1];
    expect(within(table).getByText('Bebidas')).toBeInTheDocument();
    expect(table).toHaveTextContent('Total');
    expect(table).toHaveTextContent('$6.000');
    expect(table).toHaveTextContent('$13.000');
  });
});

describe('"Ver cómo se calculó"', () => {
  it('abre la animación con los datos del grupo y permite navegar', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [tripGroup()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Ver cómo se calculó' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Cómo se calculó',
    });
    expect(
      await within(dialog).findByText('1 · Cada uno paga')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Ana pagó Cabaña \(\$30\.000\)/)
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Paso siguiente' })
    );
    expect(
      within(dialog).getByText('2 · Se calcula su parte')
    ).toBeInTheDocument();
    // Two expenses: step 2 has two sub-steps, then steps 3 and 4.
    for (let i = 0; i < 3; i++) {
      await user.click(
        within(dialog).getByRole('button', { name: 'Paso siguiente' })
      );
    }
    expect(
      within(dialog).getByText(
        /Para quedar al día: Carla le transfiere \$13\.000 a Ana/
      )
    ).toBeInTheDocument();
  });
});

describe('El gráfico y la animación dibujan la misma fila', () => {
  /** What a row looks like: its pieces, their text and their paint. */
  const fingerprint = (row: Element) =>
    [
      ...row.querySelectorAll(
        '[data-slot="paid-share-row"], [data-slot="bar"], [data-slot="segment"], [data-slot="amount"], img[data-mood]'
      ),
    ].map((el) => [
      el.getAttribute('data-slot') ?? 'face',
      el.getAttribute('data-mood'),
      el.textContent,
      el.querySelector<HTMLElement>('span[style*="background"]')?.style
        .backgroundColor ?? '',
      (el as HTMLElement).style?.flex ?? '',
    ]);

  it('al final de la animación cada fila es la del gráfico', async () => {
    const group = tripGroup();
    const { unmount } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [group],
    });
    const section = await chart();
    const chartRows = [
      ...within(section)
        .getAllByRole('list')[0]
        .querySelectorAll(':scope > li'),
    ];
    const fromChart = chartRows.map(fingerprint);
    expect(chartRows[0]).toHaveAttribute('data-slot', 'paid-share-row');
    unmount();

    const { container } = render(
      <ExplanationPlayer group={group} label='Animación' />
    );
    // 2 expenses: step 1, two sub-steps, step 3 and step 4 (real data).
    for (let i = 0; i < 4; i++) {
      screen.getByRole('button', { name: 'Paso siguiente' }).click();
      await waitFor(() => expect(container).toBeTruthy());
    }
    await waitFor(() =>
      expect(screen.getByText('4 · Se salda')).toBeInTheDocument()
    );
    const fromPlayer = [
      ...container.querySelectorAll('[data-slot="paid-share-row"]'),
    ].map(fingerprint);
    expect(fromPlayer).toEqual(fromChart);
  });
});
