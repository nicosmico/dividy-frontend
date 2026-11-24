import type { GroupId, Snapshot } from '@/domain';
import {
  LocalStorageStore,
  type LocalStorageStoreOptions,
} from './local-storage-store';
import {
  sortByTakenAtDesc,
  type SnapshotRepository,
} from './snapshot-repository';

export interface LocalStorageSnapshotRepositoryOptions extends LocalStorageStoreOptions {
  /** Share it with `LocalStorageGroupRepository` so both use the same document. */
  store?: LocalStorageStore;
}

/**
 * Stores the snapshots in the `snapshots` list of the same versioned document
 * as the groups (see `LocalStorageStore`). It never touches the groups.
 */
export class LocalStorageSnapshotRepository implements SnapshotRepository {
  private readonly store: LocalStorageStore;

  constructor(options: LocalStorageSnapshotRepositoryOptions = {}) {
    this.store = options.store ?? new LocalStorageStore(options);
  }

  async list(): Promise<Snapshot[]> {
    await this.store.ensureReady();
    return sortByTakenAtDesc(this.store.read().snapshots);
  }

  async get(sourceGroupId: GroupId): Promise<Snapshot | null> {
    await this.store.ensureReady();
    return (
      this.store
        .read()
        .snapshots.find((s) => s.sourceGroupId === sourceGroupId) ?? null
    );
  }

  async save(snapshot: Snapshot): Promise<void> {
    await this.store.ensureReady();
    const doc = this.store.read();
    const index = doc.snapshots.findIndex(
      (s) => s.sourceGroupId === snapshot.sourceGroupId
    );
    const snapshots = [...doc.snapshots];
    if (index === -1) snapshots.push(snapshot);
    else snapshots[index] = snapshot;
    this.store.write({ ...doc, snapshots });
  }

  async delete(sourceGroupId: GroupId): Promise<void> {
    await this.store.ensureReady();
    const doc = this.store.read();
    if (!doc.snapshots.some((s) => s.sourceGroupId === sourceGroupId)) return;
    this.store.write({
      ...doc,
      snapshots: doc.snapshots.filter((s) => s.sourceGroupId !== sourceGroupId),
    });
  }
}
