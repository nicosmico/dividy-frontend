import type { Group, GroupId } from '@/domain';
import { sortByUpdatedAtDesc, type GroupRepository } from './group-repository';

/** Repository backed by a Map. For tests and as a reference implementation. */
export class InMemoryGroupRepository implements GroupRepository {
  private readonly groups = new Map<GroupId, Group>();

  constructor(initial: Group[] = []) {
    for (const group of initial)
      this.groups.set(group.id, structuredClone(group));
  }

  async list(): Promise<Group[]> {
    return sortByUpdatedAtDesc([...this.groups.values()]).map((g) =>
      structuredClone(g)
    );
  }

  async get(id: GroupId): Promise<Group | null> {
    const group = this.groups.get(id);
    return group ? structuredClone(group) : null;
  }

  async save(group: Group): Promise<void> {
    this.groups.set(group.id, structuredClone(group));
  }

  async delete(id: GroupId): Promise<void> {
    this.groups.delete(id);
  }
}
