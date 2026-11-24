import { describe, expect, it } from 'vitest';
import { createSnapshot, type Snapshot } from '@/domain';
import { makeGroup } from '@/domain/test-utils/fixtures';
import type { SnapshotRepository } from './snapshot-repository';

export const snapshot = (
  sourceGroupId: string,
  takenAt: string,
  name = `Grupo ${sourceGroupId}`
): Snapshot =>
  createSnapshot(
    {
      ...makeGroup({
        name,
        members: ['Ana', 'Beto'],
        expenses: [{ amount: 1000, payer: 'Ana', among: ['Ana', 'Beto'] }],
        payments: [{ from: 'Beto', to: 'Ana', amount: 100 }],
      }),
      id: sourceGroupId,
    },
    takenAt
  );

/**
 * Behaviour every `SnapshotRepository` must have. Call it from the test file
 * of each implementation (including a future HTTP one).
 */
export function describeSnapshotRepositoryContract(
  name: string,
  factory: () => SnapshotRepository | Promise<SnapshotRepository>
) {
  describe(`contrato de SnapshotRepository: ${name}`, () => {
    it('empieza vacío', async () => {
      const repo = await factory();
      expect(await repo.list()).toEqual([]);
    });

    it('guarda y recupera una captura completa por su grupo de origen', async () => {
      const repo = await factory();
      const s = snapshot('g1', '2026-01-01T00:00:00.000Z');
      await repo.save(s);
      expect(await repo.get('g1')).toEqual(s);
    });

    it('devuelve null para un id inexistente', async () => {
      const repo = await factory();
      expect(await repo.get('nope')).toBeNull();
    });

    it('guardar con el mismo grupo de origen reemplaza la captura sin duplicarla', async () => {
      const repo = await factory();
      await repo.save(snapshot('g1', '2026-01-01T00:00:00.000Z', 'Vieja'));
      await repo.save(snapshot('g1', '2026-01-02T00:00:00.000Z', 'Nueva'));
      const all = await repo.list();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Nueva');
      expect(all[0].takenAt).toBe('2026-01-02T00:00:00.000Z');
    });

    it('capturas de grupos distintos conviven', async () => {
      const repo = await factory();
      await repo.save(snapshot('a', '2026-01-01T00:00:00.000Z'));
      await repo.save(snapshot('b', '2026-01-01T00:00:00.000Z'));
      expect(await repo.list()).toHaveLength(2);
    });

    it('lista ordenado por fecha de captura, la más reciente primero', async () => {
      const repo = await factory();
      await repo.save(snapshot('a', '2026-01-02T00:00:00.000Z'));
      await repo.save(snapshot('b', '2026-03-01T00:00:00.000Z'));
      await repo.save(snapshot('c', '2026-02-01T00:00:00.000Z'));
      expect((await repo.list()).map((s) => s.sourceGroupId)).toEqual([
        'b',
        'c',
        'a',
      ]);
    });

    it('elimina una captura sin afectar a las demás', async () => {
      const repo = await factory();
      await repo.save(snapshot('a', '2026-01-01T00:00:00.000Z'));
      await repo.save(snapshot('b', '2026-02-01T00:00:00.000Z'));
      await repo.delete('a');
      expect(await repo.get('a')).toBeNull();
      expect((await repo.list()).map((s) => s.sourceGroupId)).toEqual(['b']);
    });

    it('eliminar un id inexistente no falla', async () => {
      const repo = await factory();
      await expect(repo.delete('nope')).resolves.toBeUndefined();
    });

    it('no comparte referencias: mutar lo guardado o lo leído no altera el repositorio', async () => {
      const repo = await factory();
      const s = snapshot('g1', '2026-01-01T00:00:00.000Z');
      await repo.save(s);
      s.name = 'mutado';
      const read = (await repo.get('g1'))!;
      read.members.push({
        id: 'x',
        name: 'X',
        avatar: { color: 0, seed: 'x' },
      });
      const again = (await repo.get('g1'))!;
      expect(again.name).toBe('Grupo g1');
      expect(again.members).toHaveLength(2);
      const listed = await repo.list();
      listed[0].name = 'otro';
      expect((await repo.get('g1'))!.name).toBe('Grupo g1');
    });
  });
}
