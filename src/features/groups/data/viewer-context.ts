import { createContext, useContext } from 'react';

import type { Member, MemberId, ViewerScope } from '@/domain';

export interface ViewerContextValue {
  scope: ViewerScope | null;
  /** The members the viewer can be one of. */
  members: Member[];
  /** The member who is "you" here, or `null` (not asked, chose "none", or still loading). */
  viewerId: MemberId | null;
  /** "¿Quién eres?" is open. */
  sheetOpen: boolean;
  openSheet: () => void;
  /** Closes the sheet without saving anything: "skip, only for this visit". */
  closeSheet: () => void;
  /** Saves "I am this member" and closes the sheet. Resolves `false` after an error toast. */
  choose: (memberId: MemberId) => Promise<boolean>;
  /** Saves "none" and closes the sheet. */
  skip: () => Promise<boolean>;
}

const noop = async () => true;

/** Outside a group or a snapshot there is no viewer. */
const NO_VIEWER: ViewerContextValue = {
  scope: null,
  members: [],
  viewerId: null,
  sheetOpen: false,
  openSheet: () => undefined,
  closeSheet: () => undefined,
  choose: noop,
  skip: noop,
};

export const ViewerContext = createContext<ViewerContextValue>(NO_VIEWER);

/** Who "you" are in the group or snapshot being shown (CONTEXT.md, Viewer). */
export function useViewer(): ViewerContextValue {
  return useContext(ViewerContext);
}
