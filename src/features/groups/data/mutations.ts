import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createGroup,
  touch,
  type DomainError,
  type Group,
  type GroupId,
  type Member,
  type Result,
} from '@/domain';
import { groupKeys } from './query-keys';
import { useServices } from './services';

/** Failures that are not the user's fault. The hook already showed a toast. */
export interface InfrastructureError {
  code: 'save_failed' | 'group_not_found';
  message: string;
}

export type OperationError = DomainError | InfrastructureError;

/** A successful operation, with what is needed to take it back. */
export interface OperationSuccess {
  ok: true;
  /** The group as saved. */
  value: Group;
  /** The group as it was before the operation. */
  previous: Group;
  /**
   * Restores `previous`, but only if the group was not changed since this
   * operation (same `updatedAt`). Otherwise it shows "No se pudo deshacer
   * porque el grupo cambió." and resolves `false`. Shows its own toast.
   */
  undo: () => Promise<boolean>;
}

export type OperationResult =
  OperationSuccess | { ok: false; error: OperationError };

/** How long the "Deshacer" toast stays on screen. */
export const UNDO_DURATION_MS = 6000;

export const UNDO_FAILED_MESSAGE =
  'No se pudo deshacer porque el grupo cambió.';

const SAVE_FAILED: InfrastructureError = {
  code: 'save_failed',
  message:
    'No pudimos guardar los cambios. Revisa el espacio de tu dispositivo e inténtalo de nuevo.',
};

/**
 * Success toast with a "Deshacer" button that calls `result.undo()`. Use it
 * after removing something that has no confirmation step.
 */
export function toastUndoable(message: string, result: OperationSuccess) {
  toast.success(message, {
    duration: UNDO_DURATION_MS,
    action: { label: 'Deshacer', onClick: () => void result.undo() },
  });
}

export function isInfrastructureError(
  error: OperationError
): error is InfrastructureError {
  return error.code === 'save_failed' || error.code === 'group_not_found';
}

/**
 * Domain function applied to the current group, e.g.
 * `(group) => renameMember(group, id, name)`.
 */
export type GroupOperation = (group: Group) => Result<Group>;

/**
 * Applies a domain operation to a group and saves it.
 *
 * `run(operation)` always resolves (never rejects):
 * - domain failure: `{ ok: false, error }` with the `DomainError`, nothing is
 *   saved; the caller shows `error.message` inline.
 * - save failure (e.g. storage quota): shows an error toast and resolves with
 *   `code: 'save_failed'` (use `isInfrastructureError` to skip inline display).
 * - success: `touch(group, now)`, `repository.save`, queries invalidated,
 *   `{ ok: true, value: savedGroup }`.
 *
 * It reads the group from the repository (not the query cache) so a stale
 * screen can never overwrite newer data.
 */
export function useGroupOperation(groupId: GroupId) {
  const { repository, now } = useServices();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (operation: GroupOperation): Promise<OperationResult> => {
      let current: Group | null;
      try {
        current = await repository.get(groupId);
      } catch {
        toast.error(SAVE_FAILED.message);
        return { ok: false, error: SAVE_FAILED };
      }
      if (!current) {
        const error: InfrastructureError = {
          code: 'group_not_found',
          message: 'Este grupo ya no existe. Vuelve a Mis grupos.',
        };
        toast.error(error.message);
        return { ok: false, error };
      }
      const result = operation(current);
      if (!result.ok) return result;
      const next = touch(result.value, now());
      try {
        await repository.save(next);
      } catch {
        toast.error(SAVE_FAILED.message);
        return { ok: false, error: SAVE_FAILED };
      }
      await queryClient.invalidateQueries({ queryKey: groupKeys.all });
      const undo = async (): Promise<boolean> => {
        let latest: Group | null;
        try {
          latest = await repository.get(groupId);
        } catch {
          toast.error(SAVE_FAILED.message);
          return false;
        }
        if (!latest || latest.updatedAt !== next.updatedAt) {
          toast.error(UNDO_FAILED_MESSAGE);
          return false;
        }
        try {
          await repository.save(current);
        } catch {
          toast.error(SAVE_FAILED.message);
          return false;
        }
        await queryClient.invalidateQueries({ queryKey: groupKeys.all });
        toast.success('Cambio deshecho');
        return true;
      };
      return { ok: true, value: next, previous: current, undo };
    },
  });

  return {
    run: (operation: GroupOperation) => mutation.mutateAsync(operation),
    isPending: mutation.isPending,
  };
}

export interface CreateGroupValues {
  name: string;
  memberNames: string[];
}

/** `create({ name, memberNames })` builds the group (ids and time injected) and saves it. */
export function useCreateGroup() {
  const { repository, now, newId } = useServices();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (
      values: CreateGroupValues
    ): Promise<Result<Group, OperationError>> => {
      const members: Member[] = values.memberNames.map((name) => ({
        id: newId(),
        name,
      }));
      const result = createGroup({
        id: newId(),
        name: values.name,
        members,
        now: now(),
      });
      if (!result.ok) return result;
      try {
        await repository.save(result.value);
      } catch {
        toast.error(SAVE_FAILED.message);
        return { ok: false, error: SAVE_FAILED };
      }
      await queryClient.invalidateQueries({ queryKey: groupKeys.all });
      return result;
    },
  });

  return {
    create: (values: CreateGroupValues) => mutation.mutateAsync(values),
    isPending: mutation.isPending,
  };
}

/** `remove(groupId)` resolves `true` when deleted, `false` after an error toast. */
export function useDeleteGroup() {
  const { repository } = useServices();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (groupId: GroupId): Promise<boolean> => {
      try {
        await repository.delete(groupId);
      } catch {
        toast.error('No pudimos eliminar el grupo. Inténtalo de nuevo.');
        return false;
      }
      queryClient.removeQueries({ queryKey: groupKeys.detail(groupId) });
      await queryClient.invalidateQueries({ queryKey: groupKeys.list() });
      return true;
    },
  });

  return {
    remove: (groupId: GroupId) => mutation.mutateAsync(groupId),
    isPending: mutation.isPending,
  };
}
