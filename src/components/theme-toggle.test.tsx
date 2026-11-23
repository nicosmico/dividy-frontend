import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { THEME_STORAGE_KEY } from '@/hooks/use-theme';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', (query: string) => ({
      media: query,
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('ofrece Sistema, Claro y Oscuro, con "Sistema" marcado al inicio', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Tema de colores' }));

    const options = screen.getAllByRole('menuitemradio');
    expect(options.map((option) => option.textContent)).toEqual([
      'Sistema',
      'Claro',
      'Oscuro',
    ]);
    expect(
      screen.getByRole('menuitemradio', { name: 'Sistema' })
    ).toBeChecked();
  });

  it('elegir "Oscuro" aplica la clase dark y lo guarda', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Tema de colores' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Oscuro' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Tema de colores' }));
    expect(screen.getByRole('menuitemradio', { name: 'Oscuro' })).toBeChecked();
  });

  it('elegir "Claro" quita la clase dark', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeToggle />);
    expect(document.documentElement).toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Tema de colores' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Claro' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
