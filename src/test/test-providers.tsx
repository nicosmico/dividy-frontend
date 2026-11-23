import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';

import { AppProviders } from '@/app/providers';
import type { GroupRepository } from '@/data';

function LocationProbe() {
  const { pathname } = useLocation();
  return <output data-testid='pathname'>{pathname}</output>;
}

interface TestProvidersProps {
  repository: GroupRepository;
  queryClient: QueryClient;
  now: () => string;
  newId: () => string;
  route: string;
  children: ReactNode;
}

/** All app providers plus a `MemoryRouter` and a probe that shows the pathname. */
export function TestProviders({
  repository,
  queryClient,
  now,
  newId,
  route,
  children,
}: TestProvidersProps) {
  return (
    <AppProviders
      repository={repository}
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
