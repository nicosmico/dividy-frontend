import type { GroupId } from '@/domain';

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  detail: (id: GroupId) => [...groupKeys.all, 'detail', id] as const,
};
