import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';

import { AppProviders } from '@/app/providers';
import type {
  GroupRepository,
  SnapshotRepository,
  ViewerRepository,
} from '@/data';

function LocationProbe() {
  const { pathname, search } = useLocation();
  return (
    <>
      <output data-testid='pathname'>{pathname}</output>
      <output data-testid='search'>{search}</output>
    </>
  );
}

interface TestProvidersProps {
  repository: GroupRepository;
  snapshotRepository: SnapshotRepository;
  viewerRepository: ViewerRepository;
  queryClient: QueryClient;
  now: () => string;
  newId: () => string;
  route: string;
  children: ReactNode;
}

/** All app providers plus a `MemoryRouter` and a probe that shows the pathname and the query string. */
export function TestProviders({
  repository,
  snapshotRepository,
  viewerRepository,
  queryClient,
  now,
  newId,
  route,
  children,
}: TestProvidersProps) {
  return (
    <AppProviders
      repository={repository}
      snapshotRepository={snapshotRepository}
      viewerRepository={viewerRepository}
      queryClient={queryClient}
      now={now}
      newId={newId}
    >
      <MemoryRouter initialEntries={[route]}>
        {children}
        <LocationProbe />
      </MemoryRouter>
    </AppProviders>
  );
}
