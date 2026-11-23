import { describe, expect, it } from 'vitest';
import { makeGroup } from '@/domain/test-utils/fixtures';
import type { Group } from '@/domain';
import type { GroupRepository } from './group-repository';

const group = (id: string, updatedAt: string, name = `Grupo ${id}`): Group => ({
  ...makeGroup({
    name,
    members: ['Ana', 'Beto'],
    expenses: [{ amount: 1000, payer: 'Ana', among: ['Ana', 'Beto'] }],
    payments: [{ from: 'Beto', to: 'Ana', amount: 100 }],
  }),
  id,
  updatedAt,
});

/**
 * Behaviour every `GroupRepository` must have. Call it from the test file of
 * each implementation (including a future HttpGroupRepository).
 */
export function describeGroupRepositoryContract(
  name: string,
  factory: () => GroupRepository | Promise<GroupRepository>
) {
  describe(`contrato de GroupRepository: ${name}`, () => {
    it('empieza vacío', async () => {
      const repo = await factory();
      expect(await repo.list()).toEqual([]);
    });

    it('guarda y recupera un grupo completo', async () => {
      const repo = await factory();
      const g = group('g1', '2026-01-01T00:00:00.000Z');
      await repo.save(g);
      expect(await repo.get('g1')).toEqual(g);
    });

    it('devuelve null para un id inexistente', async () => {
      const repo = await factory();
      expect(await repo.get('nope')).toBeNull();
    });

    it('guardar con un id existente reemplaza el grupo sin duplicarlo', async () => {
      const repo = await factory();
      await repo.save(group('g1', '2026-01-01T00:00:00.000Z', 'Viejo'));
      await repo.save(group('g1', '2026-01-02T00:00:00.000Z', 'Nuevo'));
      const all = await repo.list();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Nuevo');
    });

    it('lista ordenado por updatedAt descendente', async () => {
      const repo = await factory();
      await repo.save(group('a', '2026-01-02T00:00:00.000Z'));
      await repo.save(group('b', '2026-03-01T00:00:00.000Z'));
      await repo.save(group('c', '2026-02-01T00:00:00.000Z'));
      expect((await repo.list()).map((g) => g.id)).toEqual(['b', 'c', 'a']);
    });

    it('al actualizar un grupo, sube al principio de la lista', async () => {
      const repo = await factory();
      await repo.save(group('a', '2026-01-01T00:00:00.000Z'));
      await repo.save(group('b', '2026-02-01T00:00:00.000Z'));
      await repo.save(group('a', '2026-03-01T00:00:00.000Z'));
      expect((await repo.list()).map((g) => g.id)).toEqual(['a', 'b']);
    });

    it('elimina un grupo sin afectar a los demás', async () => {
      const repo = await factory();
      await repo.save(group('a', '2026-01-01T00:00:00.000Z'));
      await repo.save(group('b', '2026-02-01T00:00:00.000Z'));
      await repo.delete('a');
      expect(await repo.get('a')).toBeNull();
      expect((await repo.list()).map((g) => g.id)).toEqual(['b']);
    });

    it('eliminar un id inexistente no falla', async () => {
      const repo = await factory();
      await expect(repo.delete('nope')).resolves.toBeUndefined();
    });

    it('no comparte referencias: mutar lo guardado o lo leído no altera el repositorio', async () => {
      const repo = await factory();
      const g = group('g1', '2026-01-01T00:00:00.000Z');
      await repo.save(g);
      g.name = 'mutado';
      const read = (await repo.get('g1'))!;
      read.members.push({ id: 'x', name: 'X' });
      const again = (await repo.get('g1'))!;
      expect(again.name).toBe('Grupo g1');
      expect(again.members).toHaveLength(2);
      const listed = await repo.list();
      listed[0].name = 'otro';
      expect((await repo.get('g1'))!.name).toBe('Grupo g1');
    });
  });
}
