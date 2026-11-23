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
import { useGroupOperation, type OperationResult } from './mutations';
import { useGroup } from './queries';

async function setup(
  repository = new InMemoryGroupRepository([makeGroup({ members: ['A'] })])
) {
  const view = renderHookWithProviders(
    () => ({ operation: useGroupOperation('g1'), group: useGroup('g1') }),
    { repository }
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
});
