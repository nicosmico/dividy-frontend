import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { InMemoryGroupRepository } from '@/data';
import { fail, renameGroup } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import {
  renderHookWithProviders,
  TEST_NOW,
} from '@/test/render-with-providers';
import {
  UNDO_FAILED_MESSAGE,
  useGroupOperation,
  type OperationResult,
} from './mutations';
import { useGroup } from './queries';

/** A clock that moves one minute on every call, so each save gets its own `updatedAt`. */
function ticking(): () => string {
  let n = 0;
  return () => new Date(Date.UTC(2026, 4, 1, 10, ++n)).toISOString();
}

async function setup(
  repository = new InMemoryGroupRepository([makeGroup({ members: ['A'] })]),
  now?: () => string
) {
  const view = renderHookWithProviders(
    () => ({ operation: useGroupOperation('g1'), group: useGroup('g1') }),
    { repository, now }
  );
  await waitFor(() => expect(view.result.current.group.data).toBeTruthy());
  return {
    ...view,
    repository,
    operation: () => view.result.current.operation,
  };
}

describe('useGroupOperation', () => {
  it('aplica la operación del dominio, hace touch, guarda y refresca las queries', async () => {
    const { repository, result: hookResult, operation } = await setup();
    let result!: OperationResult;
    await act(async () => {
      result = await operation().run((g) => renameGroup(g, ' Nuevo '));
    });
    expect(result.ok).toBe(true);
    const saved = await repository.get('g1');
    expect(saved).toMatchObject({ name: 'Nuevo', updatedAt: TEST_NOW });
    await waitFor(() =>
      expect(hookResult.current.group.data?.name).toBe('Nuevo')
    );
  });

  it('si el dominio falla devuelve el error y no guarda', async () => {
    const { repository, operation } = await setup();
    const save = vi.spyOn(repository, 'save');
    let result!: OperationResult;
    await act(async () => {
      result = await operation().run(() =>
        fail('invalid_group_name', 'Nombre inválido')
      );
    });
    expect(result).toEqual({
      ok: false,
      error: { code: 'invalid_group_name', message: 'Nombre inválido' },
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('si el guardado falla muestra un toast de error y no falla en silencio', async () => {
    const { repository, operation } = await setup();
    vi.spyOn(repository, 'save').mockRejectedValue(
      new DOMException('full', 'QuotaExceededError')
    );
    const toastError = vi.spyOn(toast, 'error');
    let result!: OperationResult;
    await act(async () => {
      result = await operation().run((g) => renameGroup(g, 'Otro'));
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'save_failed' } });
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('No pudimos guardar')
    );
    expect((await repository.get('g1'))?.name).toBe('Grupo');
  });

  it('si el grupo ya no existe lo informa', async () => {
    const { repository, operation } = await setup();
    await repository.delete('g1');
    let result!: OperationResult;
    await act(async () => {
      result = await operation().run((g) => renameGroup(g, 'Otro'));
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'group_not_found' },
    });
  });

  describe('deshacer', () => {
    async function run(operation: () => ReturnType<typeof useGroupOperation>) {
      let result!: OperationResult;
      await act(async () => {
        result = await operation().run((g) => renameGroup(g, 'Otro'));
      });
      if (!result.ok) throw new Error('expected success');
      return result;
    }

    it('devuelve el grupo anterior y restaura ese estado', async () => {
      const {
        repository,
        result: hook,
        operation,
      } = await setup(undefined, ticking());
      const before = (await repository.get('g1'))!;
      const result = await run(operation);
      expect(result.previous).toEqual(before);
      expect((await repository.get('g1'))?.name).toBe('Otro');

      const toastSuccess = vi.spyOn(toast, 'success');
      let undone = false;
      await act(async () => {
        undone = await result.undo();
      });
      expect(undone).toBe(true);
      expect(await repository.get('g1')).toEqual(before);
      expect(toastSuccess).toHaveBeenCalledWith('Cambio deshecho');
      await waitFor(() =>
        expect(hook.current.group.data?.name).toBe(before.name)
      );
    });

    it('no restaura si el grupo cambió desde entonces y avisa', async () => {
      const { repository, operation } = await setup(undefined, ticking());
      const first = await run(operation);
      await act(async () => {
        await operation().run((g) => renameGroup(g, 'Tercero'));
      });
      const toastError = vi.spyOn(toast, 'error');
      let undone = true;
      await act(async () => {
        undone = await first.undo();
      });
      expect(undone).toBe(false);
      expect((await repository.get('g1'))?.name).toBe('Tercero');
      expect(toastError).toHaveBeenCalledWith(UNDO_FAILED_MESSAGE);
    });

    it('no restaura si el grupo se eliminó', async () => {
      const { repository, operation } = await setup(undefined, ticking());
      const result = await run(operation);
      await repository.delete('g1');
      let undone = true;
      await act(async () => {
        undone = await result.undo();
      });
      expect(undone).toBe(false);
      expect(await repository.get('g1')).toBeNull();
    });

    it('si el guardado falla al deshacer muestra un toast de error', async () => {
      const { repository, operation } = await setup(undefined, ticking());
      const result = await run(operation);
      vi.spyOn(repository, 'save').mockRejectedValue(new Error('full'));
      const toastError = vi.spyOn(toast, 'error');
      let undone = true;
      await act(async () => {
        undone = await result.undo();
      });
      expect(undone).toBe(false);
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining('No pudimos guardar')
      );
    });
  });
});
