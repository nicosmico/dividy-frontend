import { useMemo, useState, type ReactNode } from 'react';

import {
  InMemorySnapshotRepository,
  type GroupRepository,
  type SnapshotRepository,
} from '@/data';
import { newId as defaultNewId } from '@/lib/id';
import { ServicesContext } from './services';

interface RepositoryProviderProps {
  repository: GroupRepository;
  /** Saved read-only snapshots. Defaults to an empty in-memory repository. */
  snapshotRepository?: SnapshotRepository;
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
  now = () => new Date().toISOString(),
  newId = defaultNewId,
  children,
}: RepositoryProviderProps) {
  const [fallbackSnapshots] = useState(() => new InMemorySnapshotRepository());
  const snapshots = snapshotRepository ?? fallbackSnapshots;
  const value = useMemo(
    () => ({ repository, snapshots, now, newId }),
    [repository, snapshots, now, newId]
  );
  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
}
