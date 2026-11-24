import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createSnapshot, type Group } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { encodeSnapshot } from '@/features/share/snapshot-codec';
import { renderWithProviders } from '@/test/render-with-providers';

const BALANCES = '/groups/g1/balances';
const MEMBERS = '/groups/g1/members';
const OWN = { kind: 'group', id: 'g1' } as const;

/** Ana paid 12.000 for three: Beto and Carla each owe her 4.000. */
function trip(): Group {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        id: 'e1',
        description: 'Asado',
        amount: 12000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
    ],
  });
}

/** Ana paid for Ana and Beto; Carla is even while the group is not. */
function carlaEven(): Group {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        id: 'e1',
        description: 'Taxi',
        amount: 3000,
        payer: 'Ana',
        among: ['Ana', 'Beto'],
      },
    ],
  });
}

/** Dani owes two people. */
function daniOwesTwo(): Group {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla', 'Dani'],
    expenses: [
      {
        id: 'e1',
        description: 'Uno',
        amount: 9000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
      {
        id: 'e2',
        description: 'Dos',
        amount: 6000,
        payer: 'Beto',
        among: ['Carla', 'Dani'],
      },
      {
        id: 'e3',
        description: 'Tres',
        amount: 4000,
        payer: 'Carla',
        among: ['Dani'],
      },
    ],
  });
}

/** The element whose whole text is `text` (names with "(tú)" are split across spans). */
const withTag = (text: string) => (_: string, el: Element | null) =>
  el?.textContent?.replace(/\s+/g, ' ').trim() === text &&
  ![...el.children].some((c) => c.textContent?.trim() === text);

/** First member name at the start of each text. */
const firstNames = (texts: (string | null)[]) =>
  texts.map((t) => /^(Ana|Beto|Carla)/.exec(t ?? '')?.[1]);

const sheet = () => screen.findByRole('dialog', { name: '¿Quién eres?' });

describe('¿Quién eres? en un grupo propio', () => {
  it('abre la hoja al entrar a un grupo sin elección, con las caritas en el orden del grupo', async () => {
    renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      askViewer: true,
    });
    const dialog = await sheet();
    expect(
      within(dialog).getByText('Así te mostramos primero lo tuyo.')
    ).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole('button', { name: /^Soy / })
        .map((b) => b.getAttribute('aria-label'))
    ).toEqual(['Soy Ana', 'Soy Beto', 'Soy Carla']);
    expect(
      within(dialog).getByRole('button', { name: 'No soy parte de este grupo' })
    ).toBeInTheDocument();
  });

  it('tocar una carita guarda la elección, cierra la hoja y ordena la vista para ti', async () => {
    const { user, viewerRepository } = renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      askViewer: true,
    });
    await user.click(await screen.findByRole('button', { name: 'Soy Carla' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await viewerRepository.get(OWN)).toEqual({ memberId: 'Carla' });
    expect(await screen.findByText(/Debes/)).toBeInTheDocument();
  });

  it('"No soy parte de este grupo" guarda none y deja el titular de siempre', async () => {
    const { user, viewerRepository } = renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      askViewer: true,
    });
    await user.click(
      await screen.findByRole('button', { name: 'No soy parte de este grupo' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await viewerRepository.get(OWN)).toEqual({ none: true });
    expect(await screen.findByText(/Pendiente:/)).toHaveTextContent('$8.000');
  });

  it('no vuelve a preguntar si ya hay elección (miembro o none)', async () => {
    for (const choice of [{ memberId: 'Beto' }, { none: true as const }]) {
      const view = renderWithProviders(undefined, {
        route: BALANCES,
        groups: [trip()],
        viewers: { 'group:g1': choice },
      });
      await screen.findByRole('heading', { name: 'Grupo' });
      await screen.findByText(/Pendiente:|Debes/);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('cerrar con Escape no guarda nada y vuelve a preguntar la próxima vez', async () => {
    const first = renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      askViewer: true,
    });
    await sheet();
    await first.user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await first.viewerRepository.get(OWN)).toBeNull();
    // Moving between tabs of the same visit does not ask again.
    await first.user.click(screen.getByRole('link', { name: 'Gastos' }));
    await screen.findByText('Asado');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    first.unmount();

    // A new visit asks again.
    renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      viewerRepository: first.viewerRepository,
    });
    await sheet();
  });

  it('no aparece en la bienvenida (sin grupos) ni en un grupo que no existe', async () => {
    const view = renderWithProviders(undefined, { askViewer: true });
    await screen.findByRole('heading', { name: 'Divide gastos sin enredos' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.unmount();
    renderWithProviders(undefined, { route: '/groups/nada/expenses' });
    await screen.findByText(/no existe|No encontramos/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un miembro elegido que ya no existe cuenta como no preguntado y se limpia', async () => {
    const { viewerRepository } = renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      viewers: { 'group:g1': { memberId: 'Zoe' } },
    });
    await sheet();
    await waitFor(async () =>
      expect(await viewerRepository.get(OWN)).toBeNull()
    );
  });

  it('eliminar con reasignar al miembro que eres no traspasa la marca: se vuelve a preguntar', async () => {
    const group = makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [
        {
          id: 'e1',
          description: 'Asado',
          amount: 9000,
          payer: 'Beto',
          among: ['Ana', 'Beto'],
        },
      ],
    });
    const { user, viewerRepository } = renderWithProviders(undefined, {
      route: MEMBERS,
      groups: [group],
      viewers: { 'group:g1': { memberId: 'Beto' } },
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar a Beto' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Eliminar a Beto',
    });
    await user.click(
      within(dialog).getByRole('radio', { name: 'Reasignar a…' })
    );
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Ana' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Eliminar a Beto' })
    );
    await waitFor(() =>
      expect(screen.queryByText('Beto')).not.toBeInTheDocument()
    );
    // Ana (who received the expenses) did not inherit the mark.
    await waitFor(async () =>
      expect(await viewerRepository.get(OWN)).toBeNull()
    );
    expect(screen.queryByText(withTag('Ana (tú)'))).not.toBeInTheDocument();
  });

  it('borrar el grupo borra también la elección', async () => {
    const { user, viewerRepository } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [trip()],
      viewers: { 'group:g1': { memberId: 'Ana' } },
    });
    await user.click(
      await screen.findByRole('button', { name: 'Opciones del grupo' })
    );
    await user.click(await screen.findByRole('menuitem', { name: /Eliminar/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar grupo' })
    );
    await waitFor(async () =>
      expect(await viewerRepository.get(OWN)).toBeNull()
    );
  });
});

describe('titular de Saldos', () => {
  async function headline(group: Group, viewer: string | null) {
    renderWithProviders(undefined, {
      route: BALANCES,
      groups: [group],
      viewers: { 'group:g1': viewer ? { memberId: viewer } : { none: true } },
    });
    if (viewer)
      await screen.findByText(/Debes|Te deben|Estás al día|Están al día/);
    else await screen.findByText(/Pendiente:/);
    return document.getElementById('status-heading')!.closest('section')!;
  }

  it('debes, con una sola transferencia: "Transfiérele a Ana"', async () => {
    const card = await headline(trip(), 'Beto');
    expect(within(card).getByRole('heading')).toHaveTextContent('Debes $4.000');
    expect(within(card).getByText('Transfiérele a Ana')).toBeInTheDocument();
  });

  it('debes, con varias transferencias: "Transfiere a 2 personas"', async () => {
    const card = await headline(daniOwesTwo(), 'Dani');
    expect(within(card).getByRole('heading')).toHaveTextContent('Debes $7.000');
    expect(
      within(card).getByText('Transfiere a 2 personas')
    ).toBeInTheDocument();
  });

  it('te deben', async () => {
    const card = await headline(trip(), 'Ana');
    expect(within(card).getByRole('heading')).toHaveTextContent(
      'Te deben $8.000'
    );
  });

  it('estás al día pero el grupo no', async () => {
    const card = await headline(carlaEven(), 'Carla');
    expect(within(card).getByRole('heading')).toHaveTextContent(
      'Estás al día 🎉'
    );
    expect(
      within(card).getByText(withTag('Al grupo le falta $1.500 por saldar'))
    ).toBeInTheDocument();
  });

  it('todo el grupo al día: se mantiene "¡Están al día!"', async () => {
    const settled = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        {
          id: 'e1',
          description: 'Café',
          amount: 2000,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
      payments: [{ id: 'p1', from: 'Beto', to: 'Ana', amount: 1000 }],
    });
    renderWithProviders(undefined, {
      route: BALANCES,
      groups: [settled],
      viewers: { 'group:g1': { memberId: 'Ana' } },
    });
    expect(
      await screen.findByRole('heading', { name: '¡Están al día! 🎉' })
    ).toBeInTheDocument();
  });

  it('sin viewer o con none: el titular de siempre', async () => {
    const card = await headline(trip(), null);
    expect(within(card).getByRole('heading')).toHaveTextContent(
      'Pendiente: $8.000 por saldar'
    );
  });

  it('el botón Compartir resumen sigue ahí', async () => {
    const card = await headline(trip(), 'Beto');
    expect(
      within(card).getByRole('button', {
        name: /Compartir resumen|Copiar resumen/,
      })
    ).toBeInTheDocument();
  });
});

describe('tú primero, con "(tú)"', () => {
  const names = (items: HTMLElement[]) =>
    items.map((li) => li.textContent ?? '');

  async function open(viewer: string | null) {
    renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      viewers: { 'group:g1': viewer ? { memberId: viewer } : { none: true } },
    });
    await screen.findByRole('heading', { name: 'Para quedar al día' });
    if (viewer) await screen.findAllByText('(tú)', { exact: false });
  }

  it('Para quedar al día: tus transferencias primero', async () => {
    await open('Carla');
    const section = screen
      .getByRole('heading', { name: 'Para quedar al día' })
      .closest('section')!;
    const rows = within(section).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Carla (tú) → Ana');
    expect(rows[1]).toHaveTextContent('Beto → Ana');
  });

  it('Para quedar al día: también las que recibes', async () => {
    await open('Ana');
    const section = screen
      .getByRole('heading', { name: 'Para quedar al día' })
      .closest('section')!;
    const rows = within(section).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Beto → Ana (tú)');
    expect(rows[1]).toHaveTextContent('Carla → Ana (tú)');
  });

  it('el gráfico "Gastó vs. su parte" pone tu fila primera', async () => {
    await open('Carla');
    const rows = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="paid-share-row"]'),
    ];
    expect(rows[0]).toHaveTextContent(/^Carla \(tú\)/);
    expect(firstNames(names(rows))).toEqual(['Carla', 'Ana', 'Beto']);
  });

  it('el "(tú)" no va en negrita', async () => {
    await open('Carla');
    const tag = screen.getAllByText('(tú)', { exact: false })[0];
    expect(tag).toHaveClass('font-normal', 'text-muted-foreground');
  });

  it('Saldo por miembro: tu fila primera', async () => {
    await open('Beto');
    const list = screen
      .getByRole('heading', { name: 'Saldo por miembro' })
      .closest('section')!;
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Beto (tú)');
    expect(firstNames(rows.map((r) => r.textContent))).toEqual([
      'Beto',
      'Ana',
      'Carla',
    ]);
  });

  it('"Ver como tabla": tu tabla primera con "(tú)"', async () => {
    const { user } = renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      viewers: { 'group:g1': { memberId: 'Carla' } },
    });
    await user.click(await screen.findByText('Ver como tabla'));
    const captions = screen
      .getAllByRole('table')
      .map((t) => t.querySelector('caption')!.textContent);
    expect(captions[0]).toMatch(/^Carla \(tú\)/);
    expect(captions).toHaveLength(3);
  });

  it('sin viewer nada se reordena ni lleva "(tú)"', async () => {
    await open(null);
    expect(
      screen.queryByText('(tú)', { exact: false })
    ).not.toBeInTheDocument();
    const rows = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="paid-share-row"]'),
    ];
    expect(firstNames(rows.map((r) => r.textContent))).toEqual([
      'Ana',
      'Beto',
      'Carla',
    ]);
  });

  it('"Ver cómo se calculó" mantiene el orden del grupo', async () => {
    const { user } = renderWithProviders(undefined, {
      route: BALANCES,
      groups: [trip()],
      viewers: { 'group:g1': { memberId: 'Carla' } },
    });
    await user.click(
      await screen.findByRole('button', { name: /Ver cómo se calculó/ })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Cómo se calculó',
    });
    await within(dialog).findAllByText('Ana');
    const rows = [
      ...dialog.querySelectorAll<HTMLElement>('[data-slot="paid-share-row"]'),
    ];
    expect(firstNames(rows.map((r) => r.textContent))).toEqual([
      'Ana',
      'Beto',
      'Carla',
    ]);
    expect(dialog).not.toHaveTextContent('(tú)');
  });
});

describe('Miembros: "(tú)" e interruptor "Soy yo"', () => {
  async function openEditor(viewer: string | null, who: string) {
    const view = renderWithProviders(undefined, {
      route: MEMBERS,
      groups: [trip()],
      viewers: { 'group:g1': viewer ? { memberId: viewer } : { none: true } },
    });
    await view.user.click(
      await screen.findByRole('button', { name: `Editar a ${who}` })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Editar miembro',
    });
    return {
      ...view,
      dialog,
      toggle: within(dialog).getByRole('switch', { name: 'Soy yo' }),
    };
  }

  it('tu fila dice "Ana (tú)" y la lista no se reordena', async () => {
    renderWithProviders(undefined, {
      route: MEMBERS,
      groups: [trip()],
      viewers: { 'group:g1': { memberId: 'Carla' } },
    });
    await screen.findByText(withTag('Carla (tú)'));
    const rows = screen.getAllByRole('listitem');
    expect(firstNames(rows.map((r) => r.textContent))).toEqual([
      'Ana',
      'Beto',
      'Carla',
    ]);
  });

  it('el interruptor refleja si eres tú', async () => {
    const mine = await openEditor('Beto', 'Beto');
    expect(mine.toggle).toBeChecked();
    mine.unmount();
    const other = await openEditor('Beto', 'Ana');
    expect(other.toggle).not.toBeChecked();
  });

  it('activarlo en otro miembro mueve la marca, al guardar', async () => {
    const { user, dialog, toggle, viewerRepository } = await openEditor(
      'Beto',
      'Ana'
    );
    await user.click(toggle);
    expect(await viewerRepository.get(OWN)).toEqual({ memberId: 'Beto' });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await viewerRepository.get(OWN)).toEqual({ memberId: 'Ana' });
    expect(await screen.findByText(withTag('Ana (tú)'))).toBeInTheDocument();
    expect(screen.queryByText(withTag('Beto (tú)'))).not.toBeInTheDocument();
  });

  it('desactivarlo en el tuyo guarda none', async () => {
    const { user, dialog, toggle, viewerRepository } = await openEditor(
      'Beto',
      'Beto'
    );
    await user.click(toggle);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await viewerRepository.get(OWN)).toEqual({ none: true });
    expect(screen.queryByText(withTag('Beto (tú)'))).not.toBeInTheDocument();
  });

  it('cancelar no cambia nada', async () => {
    const { user, dialog, toggle, viewerRepository } = await openEditor(
      'Beto',
      'Ana'
    );
    await user.click(toggle);
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await viewerRepository.get(OWN)).toEqual({ memberId: 'Beto' });
    expect(await screen.findByText(withTag('Beto (tú)'))).toBeInTheDocument();
  });

  it('no guarda la marca si el nombre es inválido', async () => {
    const { user, dialog, toggle, viewerRepository } = await openEditor(
      'Beto',
      'Ana'
    );
    await user.click(toggle);
    const name = within(dialog).getByLabelText('Nombre');
    await user.clear(name);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(await viewerRepository.get(OWN)).toEqual({ memberId: 'Beto' });
  });
});

describe('capturas', () => {
  const TAKEN = '2026-11-24T15:00:00.000Z';
  const route = async (tab = 'expenses') =>
    `/shared/${tab}#${await encodeSnapshot(createSnapshot(trip(), TAKEN))}`;
  const SNAP = { kind: 'snapshot', id: 'g1' } as const;

  it('al abrir un link sin elección pregunta, con "Solo estoy mirando"', async () => {
    renderWithProviders(undefined, { route: await route() });
    const dialog = await sheet();
    expect(
      within(dialog).getByRole('button', { name: 'Solo estoy mirando' })
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', {
        name: 'No soy parte de este grupo',
      })
    ).not.toBeInTheDocument();
  });

  it('elegir deja "Viendo como Beto · Cambiar", que reabre la hoja', async () => {
    const { user, viewerRepository } = renderWithProviders(undefined, {
      route: await route('balances'),
    });
    await user.click(await screen.findByRole('button', { name: 'Soy Beto' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await viewerRepository.get(SNAP)).toEqual({ memberId: 'm1' });
    expect(await screen.findByText(/Viendo como/)).toHaveTextContent(
      'Viendo como Beto'
    );
    expect(await screen.findByText(/Debes/)).toHaveTextContent('Debes $4.000');

    await user.click(screen.getByRole('button', { name: 'Cambiar' }));
    await user.click(await screen.findByRole('button', { name: 'Soy Carla' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await screen.findByText(/Viendo como/)).toHaveTextContent(
      'Viendo como Carla'
    );
  });

  it('"Solo estoy mirando" guarda none y deja "Elegir quién eres"', async () => {
    const { user, viewerRepository } = renderWithProviders(undefined, {
      route: await route('balances'),
    });
    await user.click(
      await screen.findByRole('button', { name: 'Solo estoy mirando' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await viewerRepository.get(SNAP)).toEqual({ none: true });
    expect(await screen.findByText('Solo estás mirando')).toBeInTheDocument();
    expect(await screen.findByText(/Pendiente:/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Elegir quién eres' }));
    await sheet();
  });

  it('no pregunta en un link inválido', async () => {
    renderWithProviders(undefined, { route: '/shared/expenses#v1.roto' });
    await screen.findByText(/link/i);
    expect(
      screen.queryByRole('dialog', { name: '¿Quién eres?' })
    ).not.toBeInTheDocument();
  });

  it('la captura guardada recuerda la elección hecha desde el link', async () => {
    const snapshot = createSnapshot(trip(), TAKEN);
    renderWithProviders(undefined, {
      route: '/shared/g1/balances',
      snapshots: [snapshot],
      viewers: { 'snapshot:g1': { memberId: 'm2' } },
    });
    expect(await screen.findByText(/Viendo como/)).toHaveTextContent(
      'Viendo como Carla'
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un grupo propio y su captura (mismo id) tienen elecciones separadas', async () => {
    renderWithProviders(undefined, {
      route: '/groups/g1/balances',
      groups: [trip()],
      viewers: {
        'group:g1': { memberId: 'Ana' },
        'snapshot:g1': { memberId: 'm1' },
      },
    });
    expect(await screen.findByText(/Te deben/)).toBeInTheDocument();
  });

  it('el resumen compartido no cambia con el viewer', async () => {
    const results: string[] = [];
    for (const viewers of [{ none: true as const }, { memberId: 'Beto' }]) {
      const writes: string[] = [];
      Reflect.deleteProperty(navigator, 'share');
      vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(
        async (t: string) => void writes.push(t)
      );
      const { user, unmount } = renderWithProviders(undefined, {
        route: BALANCES,
        groups: [trip()],
        viewers: { 'group:g1': viewers },
      });
      await user.click(await screen.findByRole('button', { name: /resumen/i }));
      await waitFor(() => expect(writes.length).toBeGreaterThan(0));
      results.push(writes[0]);
      unmount();
    }
    expect(results[0]).toBe(results[1]);
    expect(results[0]).not.toMatch(/\(tú\)|Debes|Te deben/);
  });
});
