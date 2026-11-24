import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  decideSnapshotSave,
  type GroupId,
  type Snapshot,
  type SnapshotSaveDecision,
} from '@/domain';
import { UNDO_DURATION_MS, useServices } from '@/features/groups/data';

export const snapshotKeys = {
  all: ['snapshots'] as const,
  list: () => [...snapshotKeys.all, 'list'] as const,
  detail: (sourceGroupId: GroupId) =>
    [...snapshotKeys.all, 'detail', sourceGroupId] as const,
};

const SAVE_FAILED =
  'No pudimos guardar la captura. Revisa el espacio de tu dispositivo e inténtalo de nuevo.';

/** Saved snapshots, the most recent capture first. */
export function useSnapshots() {
  const { snapshots } = useServices();
  return useQuery({
    queryKey: snapshotKeys.list(),
    queryFn: () => snapshots.list(),
  });
}

/** The snapshot saved for a group (`data: null` when there is none). */
export function useSnapshot(sourceGroupId: GroupId) {
  const { snapshots } = useServices();
  return useQuery<Snapshot | null>({
    queryKey: snapshotKeys.detail(sourceGroupId),
    queryFn: () => snapshots.get(sourceGroupId),
  });
}

/** What `save` did with the snapshot. */
export interface SaveSnapshotOutcome {
  status: SnapshotSaveDecision | 'failed';
  /** The capture that was already saved for that group, if any. */
  saved: Snapshot | null;
}

function invalidate(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
}

/**
 * `save(snapshot)` keeps the newest capture of each group (`decideSnapshotSave`):
 * it saves when nothing is saved, replaces an older one, and leaves the saved
 * one alone when it is the same capture or a newer one. It resolves with what
 * happened (`saved` is the capture that was already there, when it was kept)
 * and never rejects: a storage error shows a toast and resolves `failed`.
 */
export function useSaveSnapshot() {
  const { snapshots } = useServices();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (incoming: Snapshot): Promise<SaveSnapshotOutcome> => {
      try {
        const saved = await snapshots.get(incoming.sourceGroupId);
        const decision = decideSnapshotSave(saved, incoming);
        if (decision === 'same' || decision === 'older') {
          return { status: decision, saved };
        }
        await snapshots.save(incoming);
        await invalidate(queryClient);
        return { status: decision, saved };
      } catch {
        toast.error(SAVE_FAILED);
        return { status: 'failed', saved: null };
      }
    },
  });

  return {
    save: (snapshot: Snapshot) => mutation.mutateAsync(snapshot),
    isPending: mutation.isPending,
  };
}

/**
 * `remove(snapshot)` deletes a saved snapshot and shows "Captura eliminada"
 * with a "Deshacer" button (the same pattern as the rest of the app). Undoing
 * puts it back unless a capture of that group was saved in the meantime.
 * Resolves `true` when deleted, `false` after an error toast. `onDeleted` runs
 * right after the deletion (e.g. to leave the screen of the deleted capture).
 */
export function useDeleteSnapshot() {
  const { snapshots } = useServices();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      snapshot,
      onDeleted,
    }: {
      snapshot: Snapshot;
      onDeleted?: () => void;
    }): Promise<boolean> => {
      try {
        await snapshots.delete(snapshot.sourceGroupId);
      } catch {
        toast.error('No pudimos eliminar la captura. Inténtalo de nuevo.');
        return false;
      }
      onDeleted?.();
      await invalidate(queryClient);
      toast.success('Captura eliminada', {
        duration: UNDO_DURATION_MS,
        action: {
          label: 'Deshacer',
          onClick: () => void restore(snapshot),
        },
      });
      return true;
    },
  });

  async function restore(snapshot: Snapshot) {
    try {
      if (await snapshots.get(snapshot.sourceGroupId)) {
        toast.error(
          'No se pudo deshacer porque ya guardaste otra captura de este grupo.'
        );
        return;
      }
      await snapshots.save(snapshot);
    } catch {
      toast.error(SAVE_FAILED);
      return;
    }
    await invalidate(queryClient);
    toast.success('Captura restaurada');
  }

  return {
    remove: (snapshot: Snapshot, onDeleted?: () => void) =>
      mutation.mutateAsync({ snapshot, onDeleted }),
    isPending: mutation.isPending,
  };
}
