import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createSnapshot, type Group, type ViewerChoice } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { encodeSnapshot } from '@/features/share/snapshot-codec';
import {
  currentSearch,
  renderWithProviders,
} from '@/test/render-with-providers';

const ROUTE = '/groups/g1/expenses';
const BETO: Record<string, ViewerChoice> = { 'group:g1': { memberId: 'Beto' } };

/**
 * Ana, Beto and Carla with `total` expenses (at least 4, ids e1...):
 *   Cabaña: Ana pays 60.000 for the three (Beto's part 20.000)
 *   Taxi aeropuerto: Beto pays 10.000 for Ana and Beto (5.000)
 *   Bencina: Carla pays 20.001 for Beto and Carla (Beto 10.001)
 *   Café: Ana pays 3.000 for Ana alone
 * and the rest "Pan N" paid by Carla for Carla alone.
 */
function tripOf(total: number): Group {
  const fixed = [
    {
      id: 'e1',
      description: 'Cabaña',
      amount: 60000,
      payer: 'Ana',
      among: ['Ana', 'Beto', 'Carla'],
    },
    {
      id: 'e2',
      description: 'Taxi aeropuerto',
      amount: 10000,
      payer: 'Beto',
      among: ['Ana', 'Beto'],
    },
    {
      id: 'e3',
      description: 'Bencina',
      amount: 20001,
      payer: 'Carla',
      among: ['Beto', 'Carla'],
    },
    {
      id: 'e4',
      description: 'Café',
      amount: 3000,
      payer: 'Ana',
      among: ['Ana'],
    },
  ];
  const filler = Array.from({ length: total - 4 }, (_, i) => ({
    id: `p${i + 1}`,
    description: `Pan ${i + 1}`,
    amount: 1000,
    payer: 'Carla',
    among: ['Carla'],
  }));
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [...fixed, ...filler].map((e) => ({
      ...e,
      date: '2026-03-10',
    })),
  });
}

const chips = () => within(screen.getByRole('group', { name: 'Filtros' }));
const chip = (name: string) => chips().getByRole('button', { name });

async function ready(options: Parameters<typeof renderWithProviders>[1]) {
  const result = renderWithProviders(undefined, options);
  await screen.findByRole('group', { name: 'Filtros' });
  return result;
}

describe('filtros de la lista de Gastos', () => {
  describe('chips', () => {
    it('con viewer y gastos: Donde participo, Pagué yo y Persona', async () => {
      await ready({ route: ROUTE, groups: [tripOf(4)], viewers: BETO });
      const names = chips()
        .getAllByRole('button')
        .map((b) => b.textContent);
      expect(names).toEqual(['Donde participo', 'Pagué yo', 'Persona']);
    });

    it('sin saber quién eres solo está Persona', async () => {
      await ready({ route: ROUTE, groups: [tripOf(4)] });
      expect(chips().getAllByRole('button')).toHaveLength(1);
      expect(chip('Persona')).toBeInTheDocument();
    });

    it('no aparecen en un grupo sin gastos', async () => {
      renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
        viewers: BETO,
      });
      await screen.findByText('Aún no hay gastos');
      expect(
        screen.queryByRole('group', { name: 'Filtros' })
      ).not.toBeInTheDocument();
    });

    it('son excluyentes: tocar otro reemplaza, tocar el activo lo quita', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      expect(chip('Donde participo')).toHaveAttribute('aria-pressed', 'false');

      await user.click(chip('Donde participo'));
      expect(chip('Donde participo')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('Pagué yo')).toHaveAttribute('aria-pressed', 'false');
      expect(currentSearch()).toBe('?f=mine');

      await user.click(chip('Pagué yo'));
      expect(chip('Donde participo')).toHaveAttribute('aria-pressed', 'false');
      expect(chip('Pagué yo')).toHaveAttribute('aria-pressed', 'true');
      expect(currentSearch()).toBe('?f=paid');

      await user.click(chip('Pagué yo'));
      expect(chip('Pagué yo')).toHaveAttribute('aria-pressed', 'false');
      expect(currentSearch()).toBe('');
    });

    it('filtra la lista y deja la fila de lo que queda', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Pagué yo'));
      expect(screen.getByRole('button', { name: /Taxi/ })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Cabaña/ })
      ).not.toBeInTheDocument();
    });
  });

  describe('total que sigue al filtro', () => {
    it('sin filtro es el total del grupo', async () => {
      await ready({ route: ROUTE, groups: [tripOf(4)], viewers: BETO });
      expect(screen.getByText('$93.001')).toBeInTheDocument();
      expect(screen.getByText('4 gastos')).toBeInTheDocument();
    });

    it('Donde participas: suma los gastos que quedan y la parte del viewer', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Donde participo'));
      expect(screen.getByText('Donde participas')).toBeInTheDocument();
      expect(screen.getByText('$90.001')).toBeInTheDocument();
      expect(
        screen.getByText('3 de 4 gastos · tu parte $35.001')
      ).toBeInTheDocument();
      expect(screen.queryByText('Total del grupo')).not.toBeInTheDocument();
    });

    it('Lo que pagaste', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Pagué yo'));
      expect(screen.getByText('Lo que pagaste')).toBeInTheDocument();
      expect(
        screen.getByText('1 de 4 gastos · tu parte $5.000')
      ).toBeInTheDocument();
    });

    it('sin viewer no hay "tu parte"', async () => {
      await ready({
        route: `${ROUTE}?f=member:Carla`,
        groups: [tripOf(4)],
      });
      expect(await screen.findByText('Gastos de Carla')).toBeInTheDocument();
      expect(
        screen.getByText('2 de 4 gastos · parte de Carla $30.000')
      ).toBeInTheDocument();
    });

    it('Gastos de Carla suma también la parte de Carla', async () => {
      await ready({
        route: `${ROUTE}?f=member:Carla`,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      expect(await screen.findByText('Gastos de Carla')).toBeInTheDocument();
      // Carla: 20.000 de la cabaña y 10.000 de la bencina.
      expect(
        screen.getByText(
          '2 de 4 gastos · tu parte $30.001 · parte de Carla $30.000'
        )
      ).toBeInTheDocument();
    });

    it('Lo que pagó Carla', async () => {
      await ready({
        route: `${ROUTE}?f=paidby:Carla`,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      expect(await screen.findByText('Lo que pagó Carla')).toBeInTheDocument();
      // The total and the row of the Bencina.
      expect(screen.getAllByText('$20.001')).toHaveLength(2);
      expect(
        screen.getByText('1 de 4 gastos · tu parte $10.001')
      ).toBeInTheDocument();
    });

    it('la búsqueda manda en la etiqueta y el chip se nombra abajo', async () => {
      await ready({
        route: `${ROUTE}?f=mine&q=taxi`,
        groups: [tripOf(12)],
        viewers: BETO,
      });
      expect(
        await screen.findByText('Coinciden con "taxi"')
      ).toBeInTheDocument();
      expect(
        screen.getByText('1 de 12 gastos · Donde participas · tu parte $5.000')
      ).toBeInTheDocument();
    });

    it('anuncia el resultado en una región aria-live', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      const live = document.querySelector('[aria-live="polite"]');
      expect(live).toHaveTextContent('');
      await user.click(chip('Donde participo'));
      expect(live).toHaveTextContent('Mostrando 3 de 4 gastos');
    });
  });

  describe('hoja de Persona', () => {
    it('lista las caritas (la tuya con "(tú)"), el segmentado y el botón deshabilitado', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Persona'));
      const sheet = await screen.findByRole('dialog', {
        name: 'Gastos de una persona',
      });
      expect(
        within(sheet).getByText('Elige a alguien para ver solo sus gastos.')
      ).toBeInTheDocument();
      const faces = within(sheet).getByRole('list', { name: 'Integrantes' });
      expect(
        within(faces)
          .getAllByRole('button')
          .map((b) => b.textContent)
      ).toEqual(['Ana', 'Beto (tú)', 'Carla']);
      expect(
        within(sheet).getByRole('radio', { name: 'Donde participa' })
      ).toBeChecked();
      expect(
        within(sheet).getByRole('radio', { name: 'Lo que pagó' })
      ).not.toBeChecked();
      expect(
        within(sheet).getByRole('button', { name: 'Ver gastos' })
      ).toBeDisabled();
    });

    it('cuenta los gastos en vivo, con plural, al elegir persona y modo', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Persona'));
      const sheet = await screen.findByRole('dialog', {
        name: 'Gastos de una persona',
      });
      await user.click(within(sheet).getByRole('button', { name: 'Carla' }));
      expect(
        within(sheet).getByRole('button', { name: 'Ver 2 gastos de Carla' })
      ).toBeEnabled();
      await user.click(
        within(sheet).getByRole('radio', { name: 'Lo que pagó' })
      );
      expect(
        within(sheet).getByRole('button', { name: 'Ver 1 gasto de Carla' })
      ).toBeEnabled();
    });

    it('aplica "Donde participa" y el chip dice el nombre', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Persona'));
      const sheet = await screen.findByRole('dialog', {
        name: 'Gastos de una persona',
      });
      await user.click(within(sheet).getByRole('button', { name: 'Carla' }));
      await user.click(
        within(sheet).getByRole('button', { name: 'Ver 2 gastos de Carla' })
      );
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Gastos de una persona' })
        ).not.toBeInTheDocument()
      );
      expect(currentSearch()).toBe('?f=member%3ACarla');
      expect(chip('Carla')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Gastos de Carla')).toBeInTheDocument();
    });

    it('aplica "Lo que pagó": el chip dice "Carla pagó"', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Persona'));
      const sheet = await screen.findByRole('dialog', {
        name: 'Gastos de una persona',
      });
      await user.click(within(sheet).getByRole('button', { name: 'Carla' }));
      await user.click(
        within(sheet).getByRole('radio', { name: 'Lo que pagó' })
      );
      await user.click(
        within(sheet).getByRole('button', { name: 'Ver 1 gasto de Carla' })
      );
      expect(await screen.findByText('Lo que pagó Carla')).toBeInTheDocument();
      expect(chip('Carla pagó')).toHaveAttribute('aria-pressed', 'true');
    });

    it('al reabrirla parte de lo que está activo y permite quitarlo', async () => {
      const { user } = await ready({
        route: `${ROUTE}?f=paidby:Ana`,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      await user.click(chip('Ana pagó'));
      const sheet = await screen.findByRole('dialog', {
        name: 'Gastos de una persona',
      });
      expect(
        within(sheet).getByRole('button', { name: 'Ana' })
      ).toHaveAttribute('aria-pressed', 'true');
      expect(
        within(sheet).getByRole('radio', { name: 'Lo que pagó' })
      ).toBeChecked();
      await user.click(
        within(sheet).getByRole('button', { name: 'Quitar filtro' })
      );
      await waitFor(() => expect(currentSearch()).toBe(''));
      expect(chip('Persona')).toHaveAttribute('aria-pressed', 'false');
    });

    it('la cuenta incluye la búsqueda escrita', async () => {
      const { user } = await ready({
        route: `${ROUTE}?q=pan`,
        groups: [tripOf(12)],
        viewers: BETO,
      });
      await user.click(chip('Persona'));
      const sheet = await screen.findByRole('dialog', {
        name: 'Gastos de una persona',
      });
      await user.click(within(sheet).getByRole('button', { name: 'Carla' }));
      expect(
        within(sheet).getByRole('button', { name: 'Ver 8 gastos de Carla' })
      ).toBeInTheDocument();
    });
  });

  describe('buscador', () => {
    it('solo aparece con 11 gastos o más', async () => {
      const ten = await ready({ route: ROUTE, groups: [tripOf(10)] });
      expect(
        screen.queryByRole('textbox', { name: 'Buscar gasto' })
      ).not.toBeInTheDocument();
      ten.unmount();

      await ready({ route: ROUTE, groups: [tripOf(11)] });
      expect(
        screen.getByRole('textbox', { name: 'Buscar gasto' })
      ).toBeInTheDocument();
    });

    it('busca por palabras, sin mayúsculas ni tildes, y la escribe en ?q=', async () => {
      const { user } = await ready({ route: ROUTE, groups: [tripOf(12)] });
      await user.type(
        screen.getByRole('textbox', { name: 'Buscar gasto' }),
        'CABANA'
      );
      expect(
        screen.getByRole('button', { name: /Cabaña/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Taxi/ })
      ).not.toBeInTheDocument();
      expect(currentSearch()).toBe('?q=CABANA');
      expect(screen.getByText('Coinciden con "CABANA"')).toBeInTheDocument();
      expect(screen.getByText('1 de 12 gastos')).toBeInTheDocument();
    });

    it('todas las palabras deben aparecer', async () => {
      const { user } = await ready({ route: ROUTE, groups: [tripOf(12)] });
      const box = screen.getByRole('textbox', { name: 'Buscar gasto' });
      await user.type(box, 'taxi aero');
      expect(screen.getByRole('button', { name: /Taxi/ })).toBeInTheDocument();
      await user.type(box, ' cabana');
      expect(
        screen.queryByRole('button', { name: /Taxi/ })
      ).not.toBeInTheDocument();
    });

    it('se combina con el chip activo', async () => {
      const { user } = await ready({
        route: ROUTE,
        groups: [tripOf(12)],
        viewers: BETO,
      });
      await user.click(chip('Donde participo'));
      await user.type(
        screen.getByRole('textbox', { name: 'Buscar gasto' }),
        'a'
      );
      // Taxi aeropuerto, Cabaña and Bencina all have an "a" and Beto takes part.
      expect(screen.getAllByRole('button', { name: /\$/ })).toHaveLength(3);
      await user.type(
        screen.getByRole('textbox', { name: 'Buscar gasto' }),
        'e'
      );
      expect(currentSearch()).toBe('?f=mine&q=ae');
      expect(screen.getAllByRole('button', { name: /\$/ })).toHaveLength(1);
    });

    it('"Limpiar búsqueda" borra el texto y deja el foco en el campo', async () => {
      const { user } = await ready({
        route: `${ROUTE}?q=taxi`,
        groups: [tripOf(12)],
      });
      const box = screen.getByRole('textbox', { name: 'Buscar gasto' });
      expect(box).toHaveValue('taxi');
      await user.click(
        screen.getByRole('button', { name: 'Limpiar búsqueda' })
      );
      expect(box).toHaveValue('');
      expect(box).toHaveFocus();
      expect(currentSearch()).toBe('');
      expect(
        screen.queryByRole('button', { name: 'Limpiar búsqueda' })
      ).not.toBeInTheDocument();
    });

    it('al bajar a 10 gastos se esconde y se limpia lo escrito', async () => {
      const { user } = await ready({
        route: `${ROUTE}?q=pan`,
        groups: [tripOf(11)],
      });
      expect(screen.getByText('Coinciden con "pan"')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Pan 7/ }));
      await user.click(
        await screen.findByRole('button', { name: 'Eliminar gasto' })
      );
      await waitFor(() =>
        expect(
          screen.queryByRole('textbox', { name: 'Buscar gasto' })
        ).not.toBeInTheDocument()
      );
      expect(currentSearch()).toBe('');
      // Nothing stays filtered: the 10 expenses are all there.
      expect(screen.getByText('Total del grupo')).toBeInTheDocument();
      expect(screen.getByText('10 gastos')).toBeInTheDocument();
    });

    it('con menos de 11 gastos ignora un ?q= que venga en el link', async () => {
      await ready({ route: `${ROUTE}?q=taxi`, groups: [tripOf(5)] });
      expect(screen.getByText('5 gastos')).toBeInTheDocument();
      await waitFor(() => expect(currentSearch()).toBe(''));
    });
  });

  describe('Tu parte en cada fila', () => {
    it('muestra tu parte o "No participas" si sabes quién eres', async () => {
      await ready({ route: ROUTE, groups: [tripOf(4)], viewers: BETO });
      const row = (name: RegExp) => screen.getByRole('button', { name });
      expect(row(/Cabaña/)).toHaveTextContent('Tu parte $20.000');
      expect(row(/Taxi/)).toHaveTextContent('Tu parte $5.000');
      expect(row(/Bencina/)).toHaveTextContent('Tu parte $10.001');
      expect(row(/Café/)).toHaveTextContent('No participas');
    });

    it('sin saber quién eres la fila queda como antes', async () => {
      await ready({ route: ROUTE, groups: [tripOf(4)] });
      expect(screen.queryByText(/Tu parte/)).not.toBeInTheDocument();
      expect(screen.queryByText('No participas')).not.toBeInTheDocument();
    });
  });

  describe('sin resultados', () => {
    it('con búsqueda nombra lo buscado y "Limpiar filtros" borra chip y búsqueda', async () => {
      const { user } = await ready({
        route: `${ROUTE}?f=mine&q=kayak`,
        groups: [tripOf(12)],
        viewers: BETO,
      });
      expect(
        await screen.findByText('No hay gastos que coincidan con "kayak".')
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
      expect(currentSearch()).toBe('');
      expect(screen.getByText('Total del grupo')).toBeInTheDocument();
      expect(screen.getByText('12 gastos')).toBeInTheDocument();
      expect(chip('Donde participo')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('textbox', { name: 'Buscar gasto' })).toHaveValue(
        ''
      );
    });

    it('con solo filtro dice "No hay gastos con este filtro."', async () => {
      await ready({
        route: `${ROUTE}?f=paidby:Beto`,
        groups: [
          makeGroup({
            members: ['Ana', 'Beto'],
            expenses: [
              {
                id: 'e1',
                description: 'Asado',
                amount: 9000,
                payer: 'Ana',
                among: ['Ana', 'Beto'],
              },
            ],
          }),
        ],
      });
      expect(
        await screen.findByText('No hay gastos con este filtro.')
      ).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('query params', () => {
    it('un filtro en la URL se aplica al abrir (como al recargar)', async () => {
      await ready({
        route: `${ROUTE}?f=paid`,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      expect(await screen.findByText('Lo que pagaste')).toBeInTheDocument();
      expect(chip('Pagué yo')).toHaveAttribute('aria-pressed', 'true');
    });

    it.each([
      ['un valor inválido', '?f=cualquier-cosa'],
      ['un miembro que no existe', '?f=member:Zoe'],
      ['un tipo desconocido', '?f=otro:Ana'],
    ])('ignora %s', async (_name, search) => {
      await ready({
        route: `${ROUTE}${search}`,
        groups: [tripOf(4)],
        viewers: BETO,
      });
      expect(screen.getByText('Total del grupo')).toBeInTheDocument();
      expect(screen.getByText('4 gastos')).toBeInTheDocument();
    });

    it('ignora ?f=mine si no sabes quién eres', async () => {
      await ready({ route: `${ROUTE}?f=mine`, groups: [tripOf(4)] });
      expect(screen.getByText('Total del grupo')).toBeInTheDocument();
      expect(screen.getByText('4 gastos')).toBeInTheDocument();
    });

    it('el filtro de una persona no depende de saber quién eres', async () => {
      await ready({ route: `${ROUTE}?f=member:Ana`, groups: [tripOf(4)] });
      expect(await screen.findByText('Gastos de Ana')).toBeInTheDocument();
    });
  });

  describe('captura de solo lectura', () => {
    it('chips, búsqueda y total funcionan con el viewer de la captura y su ?f=', async () => {
      const snapshot = createSnapshot(
        { ...tripOf(12), id: 'trip-1' },
        '2026-04-01T10:00:00.000Z'
      );
      const hash = await encodeSnapshot(snapshot);
      const { user } = renderWithProviders(undefined, {
        route: `/shared/expenses?f=mine#${hash}`,
        // Snapshot members are m0, m1... by position: Beto is m1.
        viewers: { 'snapshot:trip-1': { memberId: 'm1' } },
      });
      expect(await screen.findByText('Donde participas')).toBeInTheDocument();
      expect(
        screen.getByText('3 de 12 gastos · tu parte $35.001')
      ).toBeInTheDocument();
      expect(chip('Donde participo')).toHaveAttribute('aria-pressed', 'true');

      await user.click(chip('Donde participo'));
      expect(screen.getByText('Total del grupo')).toBeInTheDocument();
      // The data of the link stays in the hash.
      await user.type(
        screen.getByRole('textbox', { name: 'Buscar gasto' }),
        'taxi'
      );
      expect(screen.getByText('Coinciden con "taxi"')).toBeInTheDocument();
      expect(screen.getByText('Taxi aeropuerto')).toBeInTheDocument();
    });
  });
});
