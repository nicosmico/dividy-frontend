import { describe, expect, it } from 'vitest';
import type { ViewerRepository } from './viewer-repository';

const group = { kind: 'group', id: 'g1' } as const;
const snapshot = { kind: 'snapshot', id: 'g1' } as const;

/**
 * Behaviour every `ViewerRepository` must have. Call it from the test file of
 * each implementation (including a future HTTP one).
 */
export function describeViewerRepositoryContract(
  name: string,
  factory: () => ViewerRepository | Promise<ViewerRepository>
) {
  describe(`contrato de ViewerRepository: ${name}`, () => {
    it('empieza sin elecciones', async () => {
      const repo = await factory();
      expect(await repo.get(group)).toBeNull();
    });

    it('guarda y recupera un miembro', async () => {
      const repo = await factory();
      await repo.set(group, { memberId: 'm1' });
      expect(await repo.get(group)).toEqual({ memberId: 'm1' });
    });

    it('guarda y recupera "none"', async () => {
      const repo = await factory();
      await repo.set(group, { none: true });
      expect(await repo.get(group)).toEqual({ none: true });
    });

    it('guardar de nuevo reemplaza la elección', async () => {
      const repo = await factory();
      await repo.set(group, { memberId: 'm1' });
      await repo.set(group, { none: true });
      expect(await repo.get(group)).toEqual({ none: true });
      await repo.set(group, { memberId: 'm2' });
      expect(await repo.get(group)).toEqual({ memberId: 'm2' });
    });

    it('cada grupo tiene la suya', async () => {
      const repo = await factory();
      await repo.set({ kind: 'group', id: 'a' }, { memberId: 'm1' });
      await repo.set({ kind: 'group', id: 'b' }, { none: true });
      expect(await repo.get({ kind: 'group', id: 'a' })).toEqual({
        memberId: 'm1',
      });
      expect(await repo.get({ kind: 'group', id: 'b' })).toEqual({
        none: true,
      });
      expect(await repo.get({ kind: 'group', id: 'c' })).toBeNull();
    });

    it('un grupo propio y una captura con el mismo id no se pisan', async () => {
      const repo = await factory();
      await repo.set(group, { memberId: 'abc' });
      await repo.set(snapshot, { memberId: 'm1' });
      expect(await repo.get(group)).toEqual({ memberId: 'abc' });
      expect(await repo.get(snapshot)).toEqual({ memberId: 'm1' });
      await repo.clear(snapshot);
      expect(await repo.get(group)).toEqual({ memberId: 'abc' });
      expect(await repo.get(snapshot)).toBeNull();
    });

    it('olvidar una elección no toca las demás', async () => {
      const repo = await factory();
      await repo.set({ kind: 'group', id: 'a' }, { memberId: 'm1' });
      await repo.set({ kind: 'group', id: 'b' }, { memberId: 'm2' });
      await repo.clear({ kind: 'group', id: 'a' });
      expect(await repo.get({ kind: 'group', id: 'a' })).toBeNull();
      expect(await repo.get({ kind: 'group', id: 'b' })).toEqual({
        memberId: 'm2',
      });
    });

    it('olvidar una elección inexistente no falla', async () => {
      const repo = await factory();
      await expect(repo.clear(group)).resolves.toBeUndefined();
    });

    it('no comparte referencias: mutar lo guardado o lo leído no altera el repositorio', async () => {
      const repo = await factory();
      const choice = { memberId: 'm1' };
      await repo.set(group, choice);
      choice.memberId = 'mutado';
      const read = (await repo.get(group)) as { memberId: string };
      read.memberId = 'otro';
      expect(await repo.get(group)).toEqual({ memberId: 'm1' });
    });
  });
}
