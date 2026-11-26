import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { currentPath, renderWithProviders } from '@/test/render-with-providers';
import { QUESTIONS } from './questions';

describe('Preguntas frecuentes', () => {
  it('muestra el título y las 7 preguntas como ítems expandibles', async () => {
    renderWithProviders(undefined, { route: '/preguntas' });
    expect(
      await screen.findByRole('heading', { name: 'Preguntas frecuentes' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Lo que más nos preguntan sobre Dividy.')
    ).toBeInTheDocument();
    const items = document.querySelectorAll('main details');
    expect(items).toHaveLength(7);
    expect([...items].map((item) => item.id)).toEqual([
      'datos',
      'compartir',
      'costo',
      'otro-telefono',
      'cuentas',
      'transferencias',
      'pruebas',
    ]);
    for (const item of items) expect(item).not.toHaveAttribute('open');
    expect(QUESTIONS.map((q) => q.question)).toEqual(
      [...items].map((item) => item.querySelector('summary')?.textContent)
    );
  });

  it('abre y cierra una pregunta al tocarla', async () => {
    const { user } = renderWithProviders(undefined, { route: '/preguntas' });
    await user.click(
      await screen.findByText('¿Necesito cuenta? ¿Cuesta algo?')
    );
    expect(document.getElementById('costo')).toHaveAttribute('open');
    await user.click(screen.getByText('¿Necesito cuenta? ¿Cuesta algo?'));
    expect(document.getElementById('costo')).not.toHaveAttribute('open');
  });

  it('/preguntas#transferencias abre esa pregunta y deja las demás cerradas', async () => {
    renderWithProviders(undefined, { route: '/preguntas#transferencias' });
    await screen.findByRole('heading', { name: 'Preguntas frecuentes' });
    await waitFor(() =>
      expect(document.getElementById('transferencias')).toHaveAttribute('open')
    );
    expect(document.querySelectorAll('main details[open]')).toHaveLength(1);
  });

  it('un hash desconocido no abre nada', async () => {
    renderWithProviders(undefined, { route: '/preguntas#nada' });
    await screen.findByRole('heading', { name: 'Preguntas frecuentes' });
    expect(document.querySelectorAll('main details[open]')).toHaveLength(0);
  });

  it('el link a GitHub abre en otra pestaña, de forma segura y avisándolo', async () => {
    renderWithProviders(undefined, { route: '/preguntas' });
    const link = await screen.findByRole('link', {
      name: /revisarlo en GitHub/,
    });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/nicosmico/dividy-frontend'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName(
      /^revisarlo en GitHub\s?\(se abre en otra pestaña\)$/
    );
  });

  it('"Volver" lleva al inicio', async () => {
    const { user } = renderWithProviders(undefined, { route: '/preguntas' });
    await user.click(await screen.findByRole('link', { name: 'Volver' }));
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(
      await screen.findByRole('heading', { name: 'Divide gastos sin enredos' })
    ).toBeInTheDocument();
  });

  it('pone el título del documento mientras está abierta', async () => {
    const { unmount } = renderWithProviders(undefined, {
      route: '/preguntas',
    });
    await screen.findByRole('heading', { name: 'Preguntas frecuentes' });
    expect(document.title).toBe('Preguntas frecuentes · Dividy');
    unmount();
    expect(document.title).not.toBe('Preguntas frecuentes · Dividy');
  });
});

describe('Preguntas frecuentes en la bienvenida', () => {
  it('muestra solo las 3 primeras y el link a todas', async () => {
    const { user } = renderWithProviders();
    const heading = await screen.findByRole('heading', {
      name: 'Preguntas frecuentes',
    });
    expect(heading.tagName).toBe('H2');
    const items = document.querySelectorAll('main details');
    expect([...items].map((item) => item.id)).toEqual([
      'datos',
      'compartir',
      'costo',
    ]);
    await user.click(
      within(document.querySelector('main')!).getByRole('link', {
        name: 'Ver todas las preguntas',
      })
    );
    await waitFor(() => expect(currentPath()).toBe('/preguntas'));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Preguntas frecuentes',
      })
    ).toBeInTheDocument();
  });
});

describe('Encabezado', () => {
  it('tiene el ícono de ayuda hacia las preguntas, en todas las pantallas', async () => {
    const { user } = renderWithProviders(undefined, { route: '/groups/new' });
    const link = await screen.findByRole('link', {
      name: 'Preguntas frecuentes',
    });
    expect(link).toHaveAttribute('href', '/preguntas');
    await user.click(link);
    await waitFor(() => expect(currentPath()).toBe('/preguntas'));
  });
});
