import { useMemo, useState, type ReactNode } from 'react';

import {
  InMemorySnapshotRepository,
  InMemoryViewerRepository,
  type GroupRepository,
  type SnapshotRepository,
  type ViewerRepository,
} from '@/data';
import { newId as defaultNewId } from '@/lib/id';
import { ServicesContext } from './services';

interface RepositoryProviderProps {
  repository: GroupRepository;
  /** Saved read-only snapshots. Defaults to an empty in-memory repository. */
  snapshotRepository?: SnapshotRepository;
  /** Who "you" are on this device. Defaults to an empty in-memory repository. */
  viewerRepository?: ViewerRepository;
  now?: () => string;
  newId?: () => string;
  children: ReactNode;
}

/**
 * Injects the `GroupRepository` (and the clock and id generator) through
 * context: `LocalStorageGroupRepository` in production,
 * `InMemoryGroupRepository` in tests.
 */
export function RepositoryProvider({
  repository,
  snapshotRepository,
  viewerRepository,
  now = () => new Date().toISOString(),
  newId = defaultNewId,
  children,
}: RepositoryProviderProps) {
  const [fallbackSnapshots] = useState(() => new InMemorySnapshotRepository());
  const [fallbackViewers] = useState(() => new InMemoryViewerRepository());
  const snapshots = snapshotRepository ?? fallbackSnapshots;
  const viewers = viewerRepository ?? fallbackViewers;
  const value = useMemo(
    () => ({ repository, snapshots, viewers, now, newId }),
    [repository, snapshots, viewers, now, newId]
  );
  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
}
