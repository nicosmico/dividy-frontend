import type { Group, GroupId } from '@/domain';

/**
 * Persistence port (ADR 0002). Asynchronous so a future HTTP implementation
 * fits. It only stores and retrieves whole groups; it has no business rules.
 */
export interface GroupRepository {
  /** All groups, most recently updated first. */
  list(): Promise<Group[]>;
  get(id: GroupId): Promise<Group | null>;
  /** Creates the group or replaces the existing one with the same id. */
  save(group: Group): Promise<void>;
  /** Deleting an unknown id is a no-op. */
  delete(id: GroupId): Promise<void>;
}

/** Most recently updated first; ties keep their original order (stable sort). */
export function sortByUpdatedAtDesc(groups: Group[]): Group[] {
  return [...groups].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
  );
}
