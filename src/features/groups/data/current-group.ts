import { useOutletContext } from 'react-router';

import type { Group } from '@/domain';

/**
 * The group of the current `/groups/:groupId/*` route. Only call it from a tab
 * rendered inside `GroupLayout`, which loads the group and provides it.
 */
export function useCurrentGroup(): Group {
  return useOutletContext<Group>();
}
