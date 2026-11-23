import { createContext, useContext } from 'react';

import type { GroupRepository } from '@/data';

export interface Services {
  repository: GroupRepository;
  /** Current time as an ISO timestamp. Injectable so tests are deterministic. */
  now: () => string;
  /** New unique id. Injectable for the same reason. */
  newId: () => string;
}

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices must be used inside <RepositoryProvider>');
  }
  return services;
}
