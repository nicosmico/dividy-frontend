import { useMemo, type ReactNode } from 'react';

import type { GroupRepository } from '@/data';
import { newId as defaultNewId } from '@/lib/id';
import { ServicesContext } from './services';

interface RepositoryProviderProps {
  repository: GroupRepository;
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
  now = () => new Date().toISOString(),
  newId = defaultNewId,
  children,
}: RepositoryProviderProps) {
  const value = useMemo(
    () => ({ repository, now, newId }),
    [repository, now, newId]
  );
  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
}
