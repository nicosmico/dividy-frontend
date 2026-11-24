import type { GroupId, Snapshot } from '@/domain';

/**
 * Persistence port for saved snapshots (ADR 0002, ADR 0006): asynchronous like
 * `GroupRepository`, and just as free of business rules. A snapshot is keyed by
 * the group it was taken from (`sourceGroupId`); which one wins when a newer or
 * older capture of the same group arrives is decided by the domain
 * (`decideSnapshotSave`), not here.
 */
export interface SnapshotRepository {
  /** All saved snapshots, the most recent capture first. */
  list(): Promise<Snapshot[]>;
  get(sourceGroupId: GroupId): Promise<Snapshot | null>;
  /** Saves the snapshot or replaces the one of the same `sourceGroupId`. */
  save(snapshot: Snapshot): Promise<void>;
  /** Deleting an unknown id is a no-op. */
  delete(sourceGroupId: GroupId): Promise<void>;
}

/** Most recent capture first; ties keep their original order (stable sort). */
export function sortByTakenAtDesc(snapshots: Snapshot[]): Snapshot[] {
  return [...snapshots].sort((a, b) =>
    a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0
  );
}
