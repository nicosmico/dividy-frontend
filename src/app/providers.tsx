import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';
import type { GroupRepository, SnapshotRepository } from '@/data';
import { RepositoryProvider } from '@/features/groups/data';
import { createQueryClient } from '@/lib/query-client';

interface AppProvidersProps {
  repository: GroupRepository;
  snapshotRepository?: SnapshotRepository;
  now?: () => string;
  newId?: () => string;
  queryClient?: QueryClient;
  children: ReactNode;
}

/** QueryClient + repository (with injectable clock and ids) + toaster. */
export function AppProviders({
  repository,
  snapshotRepository,
  now,
  newId,
  queryClient,
  children,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <RepositoryProvider
        repository={repository}
        snapshotRepository={snapshotRepository}
        now={now}
        newId={newId}
      >
        {children}
        <Toaster />
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
