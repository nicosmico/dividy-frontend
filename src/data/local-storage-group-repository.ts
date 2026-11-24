import type { Group, GroupId } from '@/domain';
import { sortByUpdatedAtDesc, type GroupRepository } from './group-repository';
import {
  CORRUPTED_KEY_PREFIX,
  LocalStorageStore,
  STORAGE_KEY,
  type LocalStorageStoreOptions,
} from './local-storage-store';

export { CORRUPTED_KEY_PREFIX, STORAGE_KEY };

export interface LocalStorageGroupRepositoryOptions extends LocalStorageStoreOptions {
  /** Share it with `LocalStorageSnapshotRepository` so both use the same document. */
  store?: LocalStorageStore;
}

/**
 * Stores the groups in the versioned document of a `LocalStorageStore`
 * (`{ version, groups, snapshots }` under one key; see that class for the
 * quarantine of corrupt content and the migration of the old format). It never
 * touches the snapshots of the document.
 */
export class LocalStorageGroupRepository implements GroupRepository {
  private readonly store: LocalStorageStore;

  constructor(options: LocalStorageGroupRepositoryOptions = {}) {
    this.store = options.store ?? new LocalStorageStore(options);
  }

  async list(): Promise<Group[]> {
    await this.store.ensureReady();
    return sortByUpdatedAtDesc(this.store.read().groups);
  }

  async get(id: GroupId): Promise<Group | null> {
    await this.store.ensureReady();
    return this.store.read().groups.find((g) => g.id === id) ?? null;
  }

  async save(group: Group): Promise<void> {
    await this.store.ensureReady();
    const doc = this.store.read();
    const index = doc.groups.findIndex((g) => g.id === group.id);
    const groups = [...doc.groups];
    if (index === -1) groups.push(group);
    else groups[index] = group;
    this.store.write({ ...doc, groups });
  }

  async delete(id: GroupId): Promise<void> {
    await this.store.ensureReady();
    const doc = this.store.read();
    if (!doc.groups.some((g) => g.id === id)) return;
    this.store.write({ ...doc, groups: doc.groups.filter((g) => g.id !== id) });
  }
}
