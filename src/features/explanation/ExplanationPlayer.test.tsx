import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { buildExampleGroup } from './example-group';
import { ExplanationPlayer } from './ExplanationPlayer';

const moods = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-mood]')].map((el) =>
    el.getAttribute('data-mood')
  );

function renderExample() {
  const view = render(
    <ExplanationPlayer
      group={buildExampleGroup()}
      settleAtEnd
      label='Ejemplo animado'
    />
  );
  return {
    ...view,
    section: screen.getByRole('region', { name: 'Ejemplo animado' }),
  };
}

/** The welcome example has 3 expenses, so step 2 has 3 sub-steps: 6 frames. */
const FRAMES = 6;

async function next(user: ReturnType<typeof userEvent.setup>, times = 1) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
  }
}

const slot = (root: ParentNode, name: string) => [
  ...root.querySelectorAll(`[data-slot="${name}"]`),
];

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('ExplanationPlayer', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('empieza en el paso 1 y "Siguiente" y "Anterior" navegan en loop', async () => {
    const user = userEvent.setup();
    const { section } = renderExample();
    expect(section).toHaveAttribute('data-step', '0');
    expect(screen.getByText('1 · Cada uno paga')).toBeInTheDocument();
    expect(
      screen.getByText(/Ana pagó Carne \(\$30\.000\)/)
    ).toBeInTheDocument();

    await next(user);
    expect(screen.getByText('2 · Se calcula su parte')).toBeInTheDocument();
    await next(user, 3);
    expect(screen.getByText('3 · Se compara')).toBeInTheDocument();
    await next(user);
    expect(screen.getByText('4 · Se salda')).toBeInTheDocument();
    await next(user);
    expect(section).toHaveAttribute('data-step', '0');
    await user.click(screen.getByRole('button', { name: 'Paso anterior' }));
    expect(section).toHaveAttribute('data-step', '3');
  });

  it('el paso 2 recorre un gasto a la vez, del más grande al más chico, y "Anterior" retrocede de a uno', async () => {
    const user = userEvent.setup();
    const { section } = renderExample();
    const live = () => document.querySelector('[aria-live="polite"]')!;
    const progress = () => slot(section, 'share-progress')[0].textContent;

    await next(user);
    expect(section).toHaveAttribute('data-sub', '0');
    expect(progress()).toContain('Gasto 1 de 3');
    expect(live()).toHaveTextContent(
      'Beto pagó Alojamiento ($45.000). Se divide entre 3: $15.000 cada uno.'
    );
    await next(user);
    expect(progress()).toContain('Gasto 2 de 3');
    expect(live()).toHaveTextContent(
      'Ana pagó Carne ($30.000). Se divide entre 3: $10.000 cada uno.'
    );
    await next(user);
    expect(live()).toHaveTextContent(
      'Carla pagó Bebidas ($15.000). Se divide entre 2: $7.500 cada uno.'
    );
    await user.click(screen.getByRole('button', { name: 'Paso anterior' }));
    expect(section).toHaveAttribute('data-sub', '1');
    expect(progress()).toContain('Gasto 2 de 3');
    await next(user, 2);
    expect(section).toHaveAttribute('data-step', '2');
    expect(section).not.toHaveAttribute('data-sub');
  });

  it('en cada sub-paso se resalta el gasto, se divide en partes y los tramos de "Su parte" aparecen de a uno', async () => {
    const user = userEvent.setup();
    const { section } = renderExample();
    const opacities = (row: number, bar: number) =>
      slot(slot(section, 'paid-share-row')[row], 'bar')[bar] &&
      slot(
        slot(slot(section, 'paid-share-row')[row], 'bar')[bar],
        'segment'
      ).map((el) => (el as HTMLElement).style.opacity);

    // Step 1: "Su parte" is empty (hidden segments), no cuts anywhere.
    expect(opacities(0, 1)).toEqual(['0', '0']);
    expect(slot(section, 'cut')).toHaveLength(0);

    await next(user);
    // Alojamiento (Beto's) is cut in 3 parts (2 cuts); the others are dimmed.
    const cuts = slot(section, 'cut');
    expect(cuts).toHaveLength(2);
    expect(slot(section, 'paid-share-row')[1]).toContainElement(
      cuts[0] as HTMLElement
    );
    // Ana: Alojamiento is her 2nd share slice (biggest first: 15.000, 10.000).
    expect(opacities(0, 1)).toEqual(['1', '0']);
    // Carla gets a slice of Alojamiento too; Beto's other expense is hidden.
    expect(opacities(2, 1)).toEqual(['1', '0', '0']);

    await next(user, 2);
    // From step 2 on, every "Gastó" segment stays cut; "Su parte" never is.
    const rowCuts = (row: number, bar: number) =>
      slot(slot(slot(section, 'paid-share-row')[row], 'bar')[bar], 'cut')
        .length;
    expect(rowCuts(0, 0)).toBeGreaterThan(0);
    expect(rowCuts(0, 1)).toBe(0);
    expect(opacities(0, 1)).toEqual(['1', '1']);
    expect(opacities(2, 1)).toEqual(['1', '1', '1']);
    // The share amount is the running total.
    expect(
      slot(slot(section, 'paid-share-row')[0], 'amount')[1]
    ).toHaveTextContent('$25.000');
  });

  it('anuncia el texto de cada paso en una región aria-live', async () => {
    const user = userEvent.setup();
    renderExample();
    await next(user);
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('Paso 2 de 4: Se calcula su parte.');
    expect(live).toHaveTextContent('Gasto 1 de 3');
    expect(live).toHaveTextContent('Beto pagó Alojamiento');
  });

  it('avanza solo cada 4 segundos en loop y se detiene con Pausar', () => {
    vi.useFakeTimers();
    const { section } = renderExample();
    act(() => void vi.advanceTimersByTime(4000));
    expect(section).toHaveAttribute('data-step', '1');
    for (let i = 0; i < FRAMES - 2; i++) {
      act(() => void vi.advanceTimersByTime(4000));
    }
    expect(section).toHaveAttribute('data-step', '3');
    act(() => void vi.advanceTimersByTime(4000));
    expect(section).toHaveAttribute('data-step', '0');

    act(() => screen.getByRole('button', { name: 'Pausar' }).click());
    act(() => void vi.advanceTimersByTime(20000));
    expect(section).toHaveAttribute('data-step', '0');
    expect(
      screen.getByRole('button', { name: 'Reproducir' })
    ).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Reproducir' }).click());
    act(() => void vi.advanceTimersByTime(4000));
    expect(section).toHaveAttribute('data-step', '1');
  });

  it('no avanza mientras la pestaña está oculta', () => {
    vi.useFakeTimers();
    const { section } = renderExample();
    const state = vi.spyOn(document, 'visibilityState', 'get');
    state.mockReturnValue('hidden');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    act(() => void vi.advanceTimersByTime(20000));
    expect(section).toHaveAttribute('data-step', '0');
    state.mockReturnValue('visible');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    act(() => void vi.advanceTimersByTime(4000));
    expect(section).toHaveAttribute('data-step', '1');
    state.mockRestore();
  });

  it('con reduced motion no hay autoplay ni botón de reproducir, pero sí navegación', async () => {
    mockReducedMotion(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { section } = renderExample();
    act(() => void vi.advanceTimersByTime(30000));
    expect(section).toHaveAttribute('data-step', '0');
    expect(screen.queryByRole('button', { name: 'Pausar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reproducir' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(section).toHaveAttribute('data-step', '1');
  });

  it('las caritas están tristes en los pasos 1 a 3 y felices en el 4', async () => {
    const user = userEvent.setup();
    const { section } = renderExample();
    for (let i = 0; i < FRAMES - 1; i++) {
      expect(moods(section)).toEqual(['sad', 'sad', 'sad']);
      await next(user);
    }
    expect(moods(section)).toEqual(['happy', 'happy', 'happy']);
  });

  it('el paso 4 muestra las transferencias sugeridas del dominio', async () => {
    const user = userEvent.setup();
    renderExample();
    const rows = () => [...document.querySelectorAll('[data-slot="transfer"]')];
    expect(rows().map((r) => r.textContent)).toEqual([
      'CarlaBeto$12.500',
      'CarlaAna$5.000',
    ]);
    const container = rows()[0].closest('[data-slot="settling"]')!;
    expect(container).toHaveAttribute('aria-hidden', 'true');
    await next(user, FRAMES - 1);
    expect(container).toHaveAttribute('aria-hidden', 'false');
  });

  it('el saldo en palabras aparece en el paso 3 y pasa a "Al día" en el 4', async () => {
    const user = userEvent.setup();
    const { section } = renderExample();
    const balances = () =>
      slot(section, 'paid-share-row').map((row) => ({
        text: row.querySelector('span.shrink-0.text-right')!.textContent,
        hidden: row
          .querySelector('span.shrink-0.text-right')!
          .classList.contains('opacity-0'),
      }));
    expect(balances().every((b) => b.hidden)).toBe(true);
    await next(user, 1 + 3);
    expect(balances()).toEqual([
      { text: 'Le deben $5.000', hidden: false },
      { text: 'Le deben $12.500', hidden: false },
      { text: 'Debe $17.500', hidden: false },
    ]);
    await next(user);
    expect(balances().map((b) => b.text)).toEqual([
      'Al día',
      'Al día',
      'Al día',
    ]);
  });

  it('en el paso 4 de la bienvenida la barra "Gastó" iguala su parte', async () => {
    const user = userEvent.setup();
    const { section } = renderExample();
    const paidAmounts = () =>
      slot(section, 'paid-share-row').map(
        (row) => slot(row, 'amount')[0].textContent
      );
    expect(paidAmounts()).toEqual(['$30.000', '$45.000', '$15.000']);
    await next(user, FRAMES - 1);
    expect(paidAmounts()).toEqual(['$25.000', '$32.500', '$32.500']);
  });
});

describe('ExplanationPlayer con un grupo real', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => vi.unstubAllGlobals());

  it('con 5 miembros usa las mismas filas horizontales y el último paso refleja los pagos', async () => {
    const user = userEvent.setup();
    const names = ['A', 'B', 'C', 'D', 'E'];
    const group = makeGroup({
      members: names,
      expenses: [{ amount: 10000, payer: 'A', among: names }],
      payments: [{ from: 'B', to: 'A', amount: 2000 }],
    });
    const { container } = render(
      <ExplanationPlayer group={group} label='Real' />
    );
    expect(slot(container, 'paid-share-row')).toHaveLength(5);
    // 1 expense: frames are step 1, its sub-step, step 3 and step 4.
    await next(user, 3);
    expect(screen.getByText('Pagos ya registrados')).toBeInTheDocument();
    expect(screen.getByText('Falta transferir')).toBeInTheDocument();
    expect(screen.getByText(/Ya se registró 1 pago/)).toBeInTheDocument();
  });

  it('con más de 6 gastos recorre los 6 más grandes y reparte el resto junto', async () => {
    const user = userEvent.setup();
    const names = ['A', 'B'];
    const group = makeGroup({
      members: names,
      expenses: Array.from({ length: 9 }, (_, i) => ({
        amount: (20 - i) * 1000,
        payer: 'A',
        among: names,
      })),
    });
    const { container } = render(
      <ExplanationPlayer group={group} label='Real' />
    );
    await next(user, 7);
    expect(slot(container, 'share-progress')[0].textContent).toContain(
      'Los otros gastos'
    );
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      'Los otros 3 gastos'
    );
    // The 9 expenses are all cut (here, between the 5 people who share them).
    expect(slot(container, 'cut').length).toBeGreaterThan(0);
  });

  it('si no falta nada dice que están al día', async () => {
    const user = userEvent.setup();
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [{ amount: 6000, payer: 'Ana', among: ['Ana', 'Beto'] }],
      payments: [{ from: 'Beto', to: 'Ana', amount: 3000 }],
    });
    const { container } = render(
      <ExplanationPlayer group={group} label='Real' />
    );
    await next(user, 3);
    expect(screen.getByText('¡Están al día!')).toBeInTheDocument();
    expect(moods(container)).toEqual(['happy', 'happy']);
  });

  describe('layout page (el diálogo "Ver cómo se calculó")', () => {
    const renderPage = () =>
      render(
        <ExplanationPlayer
          group={buildExampleGroup()}
          label='Diálogo'
          layout='page'
        />
      );

    it('en los pasos 1 a 3 no existe el contenido del paso 4 y en el 4 no existe la leyenda', async () => {
      const user = userEvent.setup();
      renderPage();
      for (let i = 0; i < FRAMES - 1; i++) {
        expect(slot(document, 'settling')).toHaveLength(0);
        expect(slot(document, 'transfer')).toHaveLength(0);
        expect(slot(document, 'legend')).toHaveLength(1);
        await next(user);
      }
      expect(slot(document, 'settling')).toHaveLength(1);
      expect(slot(document, 'transfer')).toHaveLength(2);
      expect(slot(document, 'legend')).toHaveLength(0);
    });

    it('la narración va dentro del cuerpo, antes de las filas, y el pie solo tiene los controles', async () => {
      const user = userEvent.setup();
      renderPage();
      for (let i = 0; i < FRAMES; i++) {
        const body = slot(document, 'player-body')[0];
        const footer = slot(document, 'player-footer')[0];
        const live = body.querySelector('[aria-live="polite"]');
        expect(live).not.toBeNull();
        const firstRow = body.querySelector('[data-slot="paid-share-row"]')!;
        expect(
          live!.compareDocumentPosition(firstRow) &
            Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(footer.querySelector('[aria-live]')).toBeNull();
        expect(footer.querySelector('[data-slot="paid-share-row"]')).toBeNull();
        expect(
          [...footer.querySelectorAll('button')].map(
            (b) => b.textContent || b.getAttribute('aria-label')
          )
        ).toEqual(['Paso anterior', 'Pausar', 'Paso siguiente']);
        await next(user);
      }
    });

    it('en el paso 2 muestra "Gasto X de Y" dentro del cuerpo', async () => {
      const user = userEvent.setup();
      renderPage();
      await next(user);
      expect(
        slot(document, 'player-body')[0].querySelector(
          '[data-slot="share-progress"]'
        )
      ).toHaveTextContent('Gasto 1 de 3');
    });

    it('al cambiar de paso sube hasta el título si quedó fuera de la vista', async () => {
      const user = userEvent.setup();
      renderPage();
      const body = slot(document, 'player-body')[0] as HTMLElement;
      const scrollTo = vi.fn();
      body.scrollTo = scrollTo as unknown as typeof body.scrollTo;
      // The title is above the visible area of the body.
      const title = screen.getByText(/^1 · /);
      vi.spyOn(body, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 500,
      } as DOMRect);
      vi.spyOn(title, 'getBoundingClientRect').mockReturnValue({
        top: -200,
        bottom: -180,
      } as DOMRect);
      await next(user);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: 'smooth' });
    });

    it('con "reducir movimiento" sube sin animar', async () => {
      mockReducedMotion(true);
      const user = userEvent.setup();
      renderPage();
      const body = slot(document, 'player-body')[0] as HTMLElement;
      const scrollTo = vi.fn();
      body.scrollTo = scrollTo as unknown as typeof body.scrollTo;
      vi.spyOn(body, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 500,
      } as DOMRect);
      vi.spyOn(
        screen.getByText(/^1 · /),
        'getBoundingClientRect'
      ).mockReturnValue({
        top: -200,
        bottom: -180,
      } as DOMRect);
      await next(user);
      expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: 'auto' });
    });

    it('no se mueve el scroll si el título y la narración están a la vista', async () => {
      const user = userEvent.setup();
      renderPage();
      const body = slot(document, 'player-body')[0] as HTMLElement;
      const scrollTo = vi.fn();
      body.scrollTo = scrollTo as unknown as typeof body.scrollTo;
      await next(user);
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('la bienvenida (card) conserva la leyenda y el paso 4 en el DOM todo el tiempo', async () => {
      const user = userEvent.setup();
      renderExample();
      expect(slot(document, 'player-footer')).toHaveLength(0);
      expect(slot(document, 'legend')).toHaveLength(1);
      expect(slot(document, 'settling')).toHaveLength(1);
      await next(user, FRAMES - 1);
      expect(slot(document, 'legend')).toHaveLength(1);
      expect(slot(document, 'settling')).toHaveLength(1);
    });
  });
});
