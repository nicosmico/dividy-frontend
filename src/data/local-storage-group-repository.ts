import type { Group, GroupId } from '@/domain';
import { newId as defaultNewId } from '@/lib/id';
import { sortByUpdatedAtDesc, type GroupRepository } from './group-repository';
import {
  LEGACY_BILLS_KEY,
  LEGACY_MEMBERS_KEY,
  migrateLegacyData,
} from './legacy-migration';
import { emptyDocument, parseDocument } from './migrations';
import type { StoredDocument } from './schema';

export const STORAGE_KEY = 'dividy';
export const CORRUPTED_KEY_PREFIX = 'dividy.corrupted.';

export interface LocalStorageGroupRepositoryOptions {
  storage?: Storage;
  newId?: () => string;
  /** Returns an ISO timestamp. */
  now?: () => string;
}

/**
 * Stores `{ version, groups }` under one key. Corrupt content is never
 * deleted: its raw text is copied to `dividy.corrupted.<ISO>` and the
 * repository starts from an empty document. Data in the old format
 * (`members-store` / `bills-store`) is migrated lazily on first use.
 */
export class LocalStorageGroupRepository implements GroupRepository {
  private readonly storage: Storage;
  private readonly newId: () => string;
  private readonly now: () => string;
  private ready: Promise<void> | null = null;
  private lastBackedUp: string | null = null;

  constructor(options: LocalStorageGroupRepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage;
    this.newId = options.newId ?? defaultNewId;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async list(): Promise<Group[]> {
    await this.ensureReady();
    return sortByUpdatedAtDesc(this.read().groups);
  }

  async get(id: GroupId): Promise<Group | null> {
    await this.ensureReady();
    return this.read().groups.find((g) => g.id === id) ?? null;
  }

  async save(group: Group): Promise<void> {
    await this.ensureReady();
    const doc = this.read();
    const index = doc.groups.findIndex((g) => g.id === group.id);
    const groups = [...doc.groups];
    if (index === -1) groups.push(group);
    else groups[index] = group;
    this.write({ ...doc, groups });
  }

  async delete(id: GroupId): Promise<void> {
    await this.ensureReady();
    const doc = this.read();
    if (!doc.groups.some((g) => g.id === id)) return;
    this.write({ ...doc, groups: doc.groups.filter((g) => g.id !== id) });
  }

  private ensureReady(): Promise<void> {
    this.ready ??= this.runLegacyMigration().catch((error: unknown) => {
      this.ready = null; // allow a retry on the next operation
      throw error;
    });
    return this.ready;
  }

  private async runLegacyMigration(): Promise<void> {
    if (this.storage.getItem(STORAGE_KEY) !== null) return;
    const membersStore = this.storage.getItem(LEGACY_MEMBERS_KEY);
    const billsStore = this.storage.getItem(LEGACY_BILLS_KEY);
    if (membersStore === null && billsStore === null) return;

    const group = migrateLegacyData({
      membersStore,
      billsStore,
      newId: this.newId,
      now: this.now(),
    });
    if (!group) return;

    this.write({ ...emptyDocument(), groups: [group] });
    // Only after a successful save: the old keys are no longer needed.
    this.storage.removeItem(LEGACY_MEMBERS_KEY);
    this.storage.removeItem(LEGACY_BILLS_KEY);
  }

  private read(): StoredDocument {
    const text = this.storage.getItem(STORAGE_KEY);
    if (text === null) return emptyDocument();
    const parsed = parseDocument(text);
    if (parsed.ok) return parsed.document;
    if (this.lastBackedUp !== text) {
      try {
        this.storage.setItem(`${CORRUPTED_KEY_PREFIX}${this.now()}`, text);
      } catch {
        // storage full: nothing else to do, the original text stays untouched
      }
      this.lastBackedUp = text;
    }
    return emptyDocument();
  }

  private write(doc: StoredDocument): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }
}
