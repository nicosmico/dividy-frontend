import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import {
  isStaleViewerChoice,
  resolveViewer,
  type Member,
  type ViewerChoice,
  type ViewerScope,
} from '@/domain';
import { viewerKeys } from './query-keys';
import { useServices } from './services';
import { ViewerContext, type ViewerContextValue } from './viewer-context';

const SAVE_FAILED =
  'No pudimos guardar tu elección. Revisa el espacio de tu dispositivo e inténtalo de nuevo.';

/**
 * Loads the saved choice for `scope` and provides it to everything inside
 * (ADR 0007). Mount it with `key={scope.id}` so each group starts fresh.
 *
 * - A choice that points to a member who is gone counts as not asked and is
 *   cleared from storage.
 * - When the choice first loads and nobody was asked yet, the sheet opens, once
 *   per mount. Closing it without choosing saves nothing: it asks again the
 *   next time this screen is opened. A member removed while the screen is open
 *   is asked about on the next visit, not in the middle of the removal.
 */
export function ViewerProvider({
  scope: scopeProp,
  members,
  children,
}: {
  scope: ViewerScope;
  members: Member[];
  children: ReactNode;
}) {
  const { viewers } = useServices();
  const queryClient = useQueryClient();
  const scope = useMemo<ViewerScope>(
    () => ({ kind: scopeProp.kind, id: scopeProp.id }),
    [scopeProp.kind, scopeProp.id]
  );
  const key = viewerKeys.detail(scope);
  const query = useQuery({
    queryKey: key,
    queryFn: () => viewers.get(scope),
  });
  const loading = query.isPending;
  const choice: ViewerChoice | null = query.data ?? null;
  const resolution = resolveViewer(members, choice);
  const stale = isStaleViewerChoice(members, choice);
  const viewerId = resolution.kind === 'member' ? resolution.memberId : null;

  useEffect(() => {
    if (loading || !stale) return;
    void viewers
      .clear(scope)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: viewerKeys.detail(scope) })
      )
      .catch(() => undefined);
  }, [loading, stale, viewers, queryClient, scope]);

  // Decided once, when the choice first loads (adjusting state while rendering).
  const [firstLoad, setFirstLoad] = useState<'pending' | 'ask' | 'skip'>(
    'pending'
  );
  if (firstLoad === 'pending' && !loading) {
    setFirstLoad(resolution.kind === 'unasked' ? 'ask' : 'skip');
  }
  const [phase, setPhase] = useState<'auto' | 'open' | 'closed'>('auto');
  const sheetOpen =
    phase === 'open' || (phase === 'auto' && firstLoad === 'ask');

  const save = useCallback(
    async (next: ViewerChoice): Promise<boolean> => {
      try {
        await viewers.set(scope, next);
      } catch {
        toast.error(SAVE_FAILED);
        return false;
      }
      setPhase('closed');
      await queryClient.invalidateQueries({
        queryKey: viewerKeys.detail(scope),
      });
      return true;
    },
    [viewers, queryClient, scope]
  );

  const value = useMemo<ViewerContextValue>(
    () => ({
      scope,
      members,
      viewerId,
      sheetOpen,
      openSheet: () => setPhase('open'),
      closeSheet: () => setPhase('closed'),
      choose: (memberId) => save({ memberId }),
      skip: () => save({ none: true }),
    }),
    [scope, members, viewerId, sheetOpen, save]
  );

  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  );
}
