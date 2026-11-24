import { createContext, useContext } from 'react';

import type { Snapshot } from '@/domain';

/**
 * The snapshot being viewed read-only (ADR 0006), provided by
 * `SnapshotViewProvider`. The tabs of a group (Gastos, Saldos) are reused for
 * it: they read this context and hide every control that edits, instead of
 * being copied.
 */
export const SnapshotViewContext = createContext<Snapshot | null>(null);

/** The snapshot being viewed, or `null` when the screen shows a group of your own. */
export function useSnapshotView(): Snapshot | null {
  return useContext(SnapshotViewContext);
}

/** `true` while the screen is the read-only view of a snapshot. */
export function useReadOnly(): boolean {
  return useSnapshotView() !== null;
}
