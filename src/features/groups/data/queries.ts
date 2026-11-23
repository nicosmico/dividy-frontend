import { useQuery } from '@tanstack/react-query';

import type { Group, GroupId } from '@/domain';
import { groupKeys } from './query-keys';
import { useServices } from './services';

/** All groups, most recently updated first. */
export function useGroups() {
  const { repository } = useServices();
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: () => repository.list(),
  });
}

/** One group, or `null` (as `data`) when it does not exist. */
export function useGroup(groupId: GroupId) {
  const { repository } = useServices();
  return useQuery<Group | null>({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => repository.get(groupId),
  });
}
