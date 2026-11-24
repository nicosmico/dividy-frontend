import type { GroupId, Snapshot } from '@/domain';
import {
  sortByTakenAtDesc,
  type SnapshotRepository,
} from './snapshot-repository';

/** Repository backed by a Map. For tests and as a reference implementation. */
export class InMemorySnapshotRepository implements SnapshotRepository {
  private readonly snapshots = new Map<GroupId, Snapshot>();

  constructor(initial: Snapshot[] = []) {
    for (const snapshot of initial) {
      this.snapshots.set(snapshot.sourceGroupId, structuredClone(snapshot));
    }
  }

  async list(): Promise<Snapshot[]> {
    return sortByTakenAtDesc([...this.snapshots.values()]).map((s) =>
      structuredClone(s)
    );
  }

  async get(sourceGroupId: GroupId): Promise<Snapshot | null> {
    const snapshot = this.snapshots.get(sourceGroupId);
    return snapshot ? structuredClone(snapshot) : null;
  }

  async save(snapshot: Snapshot): Promise<void> {
    this.snapshots.set(snapshot.sourceGroupId, structuredClone(snapshot));
  }

  async delete(sourceGroupId: GroupId): Promise<void> {
    this.snapshots.delete(sourceGroupId);
  }
}
