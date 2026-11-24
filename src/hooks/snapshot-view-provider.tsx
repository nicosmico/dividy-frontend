import type { ReactNode } from 'react';

import type { Snapshot } from '@/domain';
import { SnapshotViewContext } from './use-snapshot-view';

/** Marks everything inside as the read-only view of `snapshot`. */
export function SnapshotViewProvider({
  snapshot,
  children,
}: {
  snapshot: Snapshot;
  children: ReactNode;
}) {
  return (
    <SnapshotViewContext.Provider value={snapshot}>
      {children}
    </SnapshotViewContext.Provider>
  );
}
