import { newId as defaultNewId } from '@/lib/id';
import {
  LEGACY_BILLS_KEY,
  LEGACY_MEMBERS_KEY,
  migrateLegacyData,
} from './legacy-migration';
import { emptyDocument, parseDocument, type RejectedGroup } from './migrations';
import type { StoredDocument } from './schema';

export const STORAGE_KEY = 'dividy';
export const CORRUPTED_KEY_PREFIX = 'dividy.corrupted.';

export interface LocalStorageStoreOptions {
  storage?: Storage;
  newId?: () => string;
  /** Returns an ISO timestamp. */
  now?: () => string;
}

/**
 * The versioned document `{ version, groups, snapshots }` kept under one
 * `localStorage` key. `LocalStorageGroupRepository` and
 * `LocalStorageSnapshotRepository` share one store, so they read and write the
 * same document and quarantine broken entries once.
 *
 * Corrupt content is never deleted: when the whole document is unusable
 * (invalid JSON, unknown version) its raw text is copied to
 * `dividy.corrupted.<ISO>` and the store starts empty; when only some groups
 * or snapshots break invariants, those are copied (with the reason) to
 * `dividy.corrupted.<ISO>` and skipped while the valid ones load. Data in the
 * old format (`members-store` / `bills-store`) is migrated lazily on first
 * use.
 */
export class LocalStorageStore {
  private readonly storage: Storage;
  private readonly newId: () => string;
  private readonly now: () => string;
  private ready: Promise<void> | null = null;
  private readonly backedUp = new Set<string>();

  constructor(options: LocalStorageStoreOptions = {}) {
    this.storage = options.storage ?? window.localStorage;
    this.newId = options.newId ?? defaultNewId;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /** Resolves once the legacy data (if any) has been migrated. Retries after a failure. */
  ensureReady(): Promise<void> {
    this.ready ??= this.runLegacyMigration().catch((error: unknown) => {
      this.ready = null; // allow a retry on the next operation
      throw error;
    });
    return this.ready;
  }

  /** Reads the document. Call it only after `ensureReady()`. */
  read(): StoredDocument {
    const text = this.storage.getItem(STORAGE_KEY);
    if (text === null) return emptyDocument();
    const parsed = parseDocument(text);
    if (parsed.ok) {
      this.backUpRejected(parsed.rejected);
      return parsed.document;
    }
    this.backUp(text, text);
    return emptyDocument();
  }

  write(doc: StoredDocument): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(doc));
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

  /** One backup entry per invalid group or snapshot: `{ reason, group | snapshot }` as JSON. */
  private backUpRejected(rejected: RejectedGroup[]): void {
    rejected.forEach((entry, index) => {
      const text = JSON.stringify({
        reason: entry.reason,
        [entry.kind]: entry.raw,
      });
      this.backUp(text, text, index);
    });
  }

  /**
   * Copies `text` to `dividy.corrupted.<ISO>` (suffixed with `#n` for the
   * n-th entry of the same read) once per distinct content.
   */
  private backUp(dedupeKey: string, text: string, index = 0): void {
    if (this.backedUp.has(dedupeKey)) return;
    this.backedUp.add(dedupeKey);
    const suffix = index === 0 ? '' : `#${index}`;
    try {
      this.storage.setItem(
        `${CORRUPTED_KEY_PREFIX}${this.now()}${suffix}`,
        text
      );
    } catch {
      // storage full: nothing else to do, the original text stays untouched
    }
  }
}
