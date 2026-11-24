import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';
import type {
  GroupRepository,
  SnapshotRepository,
  ViewerRepository,
} from '@/data';
import { RepositoryProvider } from '@/features/groups/data';
import { createQueryClient } from '@/lib/query-client';

interface AppProvidersProps {
  repository: GroupRepository;
  snapshotRepository?: SnapshotRepository;
  viewerRepository?: ViewerRepository;
  now?: () => string;
  newId?: () => string;
  queryClient?: QueryClient;
  children: ReactNode;
}

/** QueryClient + repository (with injectable clock and ids) + toaster. */
export function AppProviders({
  repository,
  snapshotRepository,
  viewerRepository,
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
        viewerRepository={viewerRepository}
        now={now}
        newId={newId}
      >
        {children}
        <Toaster />
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
