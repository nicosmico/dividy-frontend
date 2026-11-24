import { beforeEach, describe, expect, it } from 'vitest';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { describeGroupRepositoryContract } from './group-repository.contract';
import {
  CORRUPTED_KEY_PREFIX,
  LocalStorageGroupRepository,
  STORAGE_KEY,
} from './local-storage-group-repository';

const NOW = '2026-05-01T10:00:00.000Z';

function makeRepo(storage: Storage = window.localStorage) {
  let n = 0;
  return new LocalStorageGroupRepository({
    storage,
    newId: () => `id${++n}`,
    now: () => NOW,
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

describeGroupRepositoryContract('LocalStorageGroupRepository', () => {
  window.localStorage.clear();
  return makeRepo();
});

describe('LocalStorageGroupRepository', () => {
  it('guarda un documento versionado bajo la clave "dividy"', async () => {
    const group = makeGroup({ members: ['A', 'B'] });
    await makeRepo().save(group);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({
      version: 3,
      groups: [group],
    });
  });

  it('lee un documento v1 en minúsculas ya capitalizado y lo guarda como v3', async () => {
    const group = makeGroup({ name: 'casa', members: ['ana'] });
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, groups: [group] })
    );
    const repo = makeRepo();
    const loaded = await repo.get(group.id);
    expect(loaded?.name).toBe('Casa');
    expect(loaded?.members[0].name).toBe('Ana');
    expect(loaded?.members[0].avatar).toEqual({ color: 0, seed: 'ana' });
    await repo.save(loaded!);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).version).toBe(
      3
    );
  });

  it('persiste entre instancias del repositorio', async () => {
    const group = makeGroup({ members: ['A'] });
    await makeRepo().save(group);
    expect(await makeRepo().get('g1')).toEqual(group);
  });

  it('usa window.localStorage por defecto', async () => {
    const repo = new LocalStorageGroupRepository();
    await repo.save(makeGroup({ members: ['A'] }));
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('propaga el error si el almacenamiento está lleno', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => {},
    } as unknown as Storage;
    await expect(
      makeRepo(storage).save(makeGroup({ members: ['A'] }))
    ).rejects.toThrow();
  });

  describe('contenido corrupto', () => {
    const corruptCases: [string, string][] = [
      ['JSON inválido', '{not json'],
      ['sin versión', JSON.stringify({ groups: [] })],
      ['versión futura', JSON.stringify({ version: 99, groups: [] })],
      ['versión inválida', JSON.stringify({ version: 'x', groups: [] })],
      ['no es un objeto', '42'],
      ['forma inválida', JSON.stringify({ version: 1, groups: 'nope' })],
    ];

    it.each(corruptCases)(
      '%s: respalda el texto crudo y parte vacío sin borrar nada',
      async (_n, raw) => {
        window.localStorage.setItem(STORAGE_KEY, raw);
        const repo = makeRepo();
        expect(await repo.list()).toEqual([]);
        expect(
          window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}`)
        ).toBe(raw);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
      }
    );

    describe('grupos inválidos dentro de un documento válido', () => {
      const good = makeGroup({ members: ['A', 'B'] });
      const brokenInvariants = {
        ...makeGroup({
          members: ['A'],
          expenses: [{ amount: 5, payer: 'Z', among: ['A'] }],
        }),
        id: 'bad1',
      };
      const brokenShape = { id: 'bad2', name: 42 };

      it('carga los grupos válidos y respalda cada inválido con su motivo', async () => {
        const raw = JSON.stringify({
          version: 1,
          groups: [brokenInvariants, good, brokenShape],
        });
        window.localStorage.setItem(STORAGE_KEY, raw);
        const repo = makeRepo();

        expect(await repo.list()).toEqual([good]);
        expect(await repo.get('bad1')).toBeNull();

        const first = JSON.parse(
          window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}`)!
        );
        const second = JSON.parse(
          window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}#1`)!
        );
        expect(first.group).toEqual(brokenInvariants);
        expect(first.reason).toEqual(expect.any(String));
        expect(second.group).toEqual(brokenShape);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
      });

      it('no repite el respaldo en cada lectura', async () => {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, groups: [brokenInvariants, good] })
        );
        const repo = makeRepo();
        await repo.list();
        await repo.list();
        const backups = Object.keys(window.localStorage).filter((k) =>
          k.startsWith(CORRUPTED_KEY_PREFIX)
        );
        expect(backups).toHaveLength(1);
      });

      it('al guardar, el documento queda sólo con grupos válidos y el respaldo permanece', async () => {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, groups: [brokenInvariants, good] })
        );
        const repo = makeRepo();
        await repo.save({ ...good, name: 'Otro' });
        expect(
          JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).groups
        ).toEqual([{ ...good, name: 'Otro' }]);
        expect(
          window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}`)
        ).not.toBeNull();
      });
    });

    it('no repite el respaldo en cada lectura', async () => {
      window.localStorage.setItem(STORAGE_KEY, '{bad');
      const repo = makeRepo();
      await repo.list();
      await repo.get('x');
      const backups = Object.keys(window.localStorage).filter((k) =>
        k.startsWith(CORRUPTED_KEY_PREFIX)
      );
      expect(backups).toHaveLength(1);
    });

    it('al guardar después de un respaldo, el documento nuevo es válido y el respaldo sigue ahí', async () => {
      window.localStorage.setItem(STORAGE_KEY, '{bad');
      const repo = makeRepo();
      await repo.save(makeGroup({ members: ['A'] }));
      expect(await repo.list()).toHaveLength(1);
      expect(window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}`)).toBe(
        '{bad'
      );
    });

    it('si el respaldo no cabe en el almacenamiento, igual parte vacío', async () => {
      const store = new Map<string, string>([[STORAGE_KEY, '{bad']]);
      const storage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: () => {
          throw new Error('full');
        },
        removeItem: (k: string) => void store.delete(k),
      } as unknown as Storage;
      expect(await makeRepo(storage).list()).toEqual([]);
    });
  });

  it('tras una migración fallida se puede reintentar en la siguiente operación', async () => {
    const store = new Map<string, string>([
      [
        'members-store',
        JSON.stringify({
          state: {
            members: { a: { id: 'a', name: 'Ana', picture: '' } },
            membersOrder: ['a'],
          },
          version: 0,
        }),
      ],
    ]);
    let failures = 1;
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (failures-- > 0) throw new Error('full');
        store.set(k, v);
      },
      removeItem: (k: string) => void store.delete(k),
    } as unknown as Storage;
    const repo = makeRepo(storage);
    await expect(repo.list()).rejects.toThrow();
    expect(store.has('members-store')).toBe(true);
    expect(await repo.list()).toHaveLength(1);
    expect(store.has('members-store')).toBe(false);
  });
});
