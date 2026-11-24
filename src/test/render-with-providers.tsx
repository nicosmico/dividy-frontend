import { QueryClient } from '@tanstack/react-query';
import {
  render,
  renderHook,
  screen,
  type RenderHookResult,
  type RenderResult,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';

import { AppRoutes } from '@/app/router';
import {
  InMemoryGroupRepository,
  InMemorySnapshotRepository,
  InMemoryViewerRepository,
  type GroupRepository,
  type SnapshotRepository,
  type ViewerRepository,
} from '@/data';
import type { Group, Snapshot, ViewerChoice } from '@/domain';
import { createQueryClient } from '@/lib/query-client';
import { TestProviders } from './test-providers';

export const TEST_NOW = '2026-05-01T10:00:00.000Z';

/** Deterministic ids: `id1`, `id2`... */
export function createIdSequence(prefix = 'id'): () => string {
  let n = 0;
  return () => `${prefix}${++n}`;
}

/** Current route of the render, e.g. `/groups/g1/members`. */
export function currentPath(): string {
  return screen.getByTestId('pathname').textContent ?? '';
}

export interface RenderWithProvidersOptions {
  /** Initial URL. Default `/`. */
  route?: string;
  /** Groups the repository starts with (ignored if `repository` is given). */
  groups?: Group[];
  repository?: GroupRepository;
  /** Snapshots saved on the device (ignored if `snapshotRepository` is given). */
  snapshots?: Snapshot[];
  snapshotRepository?: SnapshotRepository;
  /**
   * Saved "who am I" choices, by `group:<id>` / `snapshot:<id>`. Unless
   * `askViewer` is set, every group and snapshot given above also starts with
   * `{ none: true }`, so "¿Quién eres?" does not cover the screen being tested.
   */
  viewers?: Record<string, ViewerChoice>;
  /** Leave the groups and snapshots without a saved choice: the sheet opens. */
  askViewer?: boolean;
  viewerRepository?: ViewerRepository;
  now?: () => string;
  newId?: () => string;
  queryClient?: QueryClient;
}

function seededViewers(
  options: RenderWithProvidersOptions
): Record<string, ViewerChoice> {
  const seeded: Record<string, ViewerChoice> = {};
  if (!options.askViewer) {
    for (const g of options.groups ?? [])
      seeded[`group:${g.id}`] = { none: true };
    for (const s of options.snapshots ?? []) {
      seeded[`snapshot:${s.sourceGroupId}`] = { none: true };
    }
  }
  return { ...seeded, ...options.viewers };
}

function resolve(options: RenderWithProvidersOptions) {
  return {
    viewerRepository:
      options.viewerRepository ??
      new InMemoryViewerRepository(seededViewers(options)),
    repository:
      options.repository ?? new InMemoryGroupRepository(options.groups),
    snapshotRepository:
      options.snapshotRepository ??
      new InMemorySnapshotRepository(options.snapshots),
    queryClient: options.queryClient ?? createQueryClient(),
    now: options.now ?? (() => TEST_NOW),
    newId: options.newId ?? createIdSequence(),
    route: options.route ?? '/',
  };
}

export interface RenderWithProvidersResult extends RenderResult {
  user: UserEvent;
  repository: GroupRepository;
  snapshotRepository: SnapshotRepository;
  viewerRepository: ViewerRepository;
  queryClient: QueryClient;
}

/**
 * Renders `ui` (the whole `<AppRoutes />` by default) with every provider the
 * app has: QueryClient, repository (in memory), fixed clock and ids, toaster
 * and a `MemoryRouter`. Use `currentPath()` to assert navigation.
 */
export function renderWithProviders(
  ui: ReactElement = <AppRoutes />,
  options: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
  const providers = resolve(options);
  const result = render(<TestProviders {...providers}>{ui}</TestProviders>);
  return {
    ...result,
    user: userEvent.setup(),
    repository: providers.repository,
    snapshotRepository: providers.snapshotRepository,
    viewerRepository: providers.viewerRepository,
    queryClient: providers.queryClient,
  };
}

/** Same providers for testing a hook: `renderHookWithProviders(() => useGroup('g1'), { groups })`. */
export function renderHookWithProviders<Result>(
  hook: () => Result,
  options: RenderWithProvidersOptions = {}
): RenderHookResult<Result, unknown> & {
  repository: GroupRepository;
  snapshotRepository: SnapshotRepository;
  queryClient: QueryClient;
} {
  const providers = resolve(options);
  const result = renderHook(hook, {
    wrapper: ({ children }) => (
      <TestProviders {...providers}>{children}</TestProviders>
    ),
  });
  return {
    ...result,
    repository: providers.repository,
    snapshotRepository: providers.snapshotRepository,
    queryClient: providers.queryClient,
  };
}
