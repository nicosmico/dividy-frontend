import type { Page } from '@playwright/test';

import type { Group } from '../src/domain';
import { makeGroup } from '../src/domain/test-utils/fixtures';

/** Two groups: "Viaje a Pucón" with expenses and a payment, and an empty "Casa". */
export function sampleGroups(): Group[] {
  const trip = makeGroup({
    name: 'Viaje a Pucón',
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        id: 'e1',
        description: 'Supermercado',
        amount: 10000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
        date: '2026-03-10',
      },
      {
        id: 'e2',
        description: 'Taxi',
        amount: 3000,
        payer: 'Beto',
        among: ['Ana', 'Beto'],
        date: '2026-03-09',
      },
    ],
    payments: [{ id: 'p1', from: 'Beto', to: 'Ana', amount: 500 }],
  });
  const house = {
    ...makeGroup({ name: 'Casa', members: ['Ana', 'Beto'] }),
    id: 'g2',
    updatedAt: '2026-01-05T12:00:00.000Z',
  };
  return [trip, house];
}

/** Saves groups in localStorage before the app loads (only on the first load, so reloads keep the app's own changes). */
export async function seedGroups(page: Page, groups: Group[]) {
  await page.addInitScript(
    (document) => {
      if (!window.localStorage.getItem('dividy')) {
        window.localStorage.setItem('dividy', document);
      }
    },
    JSON.stringify({ version: 4, groups, snapshots: [] })
  );
}

/** Saves an exact document (e.g. an old version) before the app loads, only on the first load. */
export async function seedDocument(page: Page, document: unknown) {
  await page.addInitScript((raw) => {
    if (!window.localStorage.getItem('dividy')) {
      window.localStorage.setItem('dividy', raw);
    }
  }, JSON.stringify(document));
}
