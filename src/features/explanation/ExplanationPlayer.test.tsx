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

    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(screen.getByText('2 · Se calcula su parte')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(screen.getByText('3 · Se compara')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(screen.getByText('4 · Se salda')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(section).toHaveAttribute('data-step', '0');
    await user.click(screen.getByRole('button', { name: 'Paso anterior' }));
    expect(section).toHaveAttribute('data-step', '3');
  });

  it('anuncia el texto de cada paso en una región aria-live', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('Paso 2 de 4: Se calcula su parte.');
    expect(live).toHaveTextContent('Bebidas solo entre Beto y Carla');
  });

  it('avanza solo cada 4 segundos en loop y se detiene con Pausar', () => {
    vi.useFakeTimers();
    const { section } = renderExample();
    act(() => void vi.advanceTimersByTime(4000));
    expect(section).toHaveAttribute('data-step', '1');
    for (let i = 0; i < 3; i++) act(() => void vi.advanceTimersByTime(4000));
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
    for (const expected of [
      ['sad', 'sad', 'sad'],
      ['sad', 'sad', 'sad'],
      ['sad', 'sad', 'sad'],
      ['happy', 'happy', 'happy'],
    ]) {
      expect(moods(section)).toEqual(expected);
      await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    }
  });

  it('el paso 4 muestra las transferencias sugeridas del dominio', async () => {
    const user = userEvent.setup();
    renderExample();
    const rows = () => [...document.querySelectorAll('[data-slot="transfer"]')];
    expect(rows().map((r) => r.textContent)).toEqual([
      'CarlaBeto$12.500',
      'CarlaAna$5.000',
    ]);
    const container = rows()[0].parentElement!;
    expect(container).toHaveAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    }
    expect(container).toHaveAttribute('aria-hidden', 'false');
  });

  it('el pie es el mismo con los tags de saldo en el paso 3', async () => {
    const user = userEvent.setup();
    const { section } = renderExample();
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    const tags = [...section.querySelectorAll('[data-slot="balance-tag"]')].map(
      (t) => t.textContent
    );
    expect(tags).toEqual(['Le deben$5.000', 'Le deben$12.500', 'Debe$17.500']);
  });
});

describe('ExplanationPlayer con un grupo real', () => {
  it('con más de 4 miembros usa filas y el último paso refleja los pagos', async () => {
    const user = userEvent.setup();
    const names = ['A', 'B', 'C', 'D', 'E'];
    const group = makeGroup({
      members: names,
      expenses: [{ amount: 10000, payer: 'A', among: names }],
      payments: [{ from: 'B', to: 'A', amount: 2000 }],
    });
    render(<ExplanationPlayer group={group} label='Real' />);
    expect(document.querySelector('ul.grid.gap-3')).not.toBeNull();
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    }
    expect(screen.getByText('Pagos ya registrados')).toBeInTheDocument();
    expect(screen.getByText('Falta transferir')).toBeInTheDocument();
    expect(screen.getByText(/Ya se registró 1 pago/)).toBeInTheDocument();
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
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    }
    expect(screen.getByText('¡Están al día!')).toBeInTheDocument();
    expect(moods(container)).toEqual(['happy', 'happy']);
  });
});
