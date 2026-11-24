import type { GroupId, ViewerScope } from '@/domain';

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  detail: (id: GroupId) => [...groupKeys.all, 'detail', id] as const,
};

export const viewerKeys = {
  all: ['viewers'] as const,
  detail: (scope: ViewerScope) =>
    [...viewerKeys.all, scope.kind, scope.id] as const,
};
