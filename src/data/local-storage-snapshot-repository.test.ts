import { beforeEach, describe, expect, it } from 'vitest';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { LocalStorageGroupRepository } from './local-storage-group-repository';
import { LocalStorageSnapshotRepository } from './local-storage-snapshot-repository';
import { CORRUPTED_KEY_PREFIX, STORAGE_KEY } from './local-storage-store';
import {
  describeSnapshotRepositoryContract,
  snapshot,
} from './snapshot-repository.contract';
import { LocalStorageStore } from './local-storage-store';

const NOW = '2026-05-01T10:00:00.000Z';
const T1 = '2026-01-01T00:00:00.000Z';

function makeStore(storage: Storage = window.localStorage) {
  let n = 0;
  return new LocalStorageStore({
    storage,
    newId: () => `id${++n}`,
    now: () => NOW,
  });
}

/** Both repositories on one store, as the app wires them. */
function makeRepos(storage: Storage = window.localStorage) {
  const store = makeStore(storage);
  return {
    groups: new LocalStorageGroupRepository({ store }),
    snapshots: new LocalStorageSnapshotRepository({ store }),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describeSnapshotRepositoryContract('LocalStorageSnapshotRepository', () => {
  window.localStorage.clear();
  return makeRepos().snapshots;
});

describe('LocalStorageSnapshotRepository', () => {
  it('guarda las capturas en la lista "snapshots" del documento v4', async () => {
    const s = snapshot('g1', T1);
    await makeRepos().snapshots.save(s);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({
      version: 4,
      groups: [],
      snapshots: [s],
    });
  });

  it('persiste entre instancias', async () => {
    await makeRepos().snapshots.save(snapshot('g1', T1));
    expect(await makeRepos().snapshots.get('g1')).toEqual(snapshot('g1', T1));
  });

  it('usa window.localStorage por defecto', async () => {
    await new LocalStorageSnapshotRepository().save(snapshot('g1', T1));
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('las capturas y los grupos propios no se pisan entre sí', async () => {
    const { groups, snapshots } = makeRepos();
    const own = { ...makeGroup({ members: ['A', 'B'] }), id: 'g1' };
    await groups.save(own);
    await snapshots.save(snapshot('g1', T1)); // same id on purpose
    await groups.save({ ...own, name: 'Renombrado' });
    await snapshots.save(snapshot('g1', '2026-02-01T00:00:00.000Z'));
    expect((await groups.list()).map((g) => g.name)).toEqual(['Renombrado']);
    expect(await snapshots.list()).toHaveLength(1);
    await groups.delete('g1');
    expect(await snapshots.get('g1')).not.toBeNull();
    await snapshots.delete('g1');
    expect(await groups.list()).toEqual([]);
  });

  it('lee un documento v3 sin capturas y lo guarda como v4 sin perder los grupos', async () => {
    const group = makeGroup({ members: ['A', 'B'] });
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 3, groups: [group] })
    );
    const { groups, snapshots } = makeRepos();
    expect(await snapshots.list()).toEqual([]);
    await snapshots.save(snapshot('x', T1));
    expect(await groups.list()).toEqual([group]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).version).toBe(
      4
    );
  });

  it('guardar una captura antes de abrir los grupos no pierde los datos del formato antiguo', async () => {
    window.localStorage.setItem(
      'members-store',
      JSON.stringify({
        state: {
          members: { a: { id: 'a', name: 'Ana', picture: '' } },
          membersOrder: ['a'],
        },
        version: 0,
      })
    );
    const { groups, snapshots } = makeRepos();
    await snapshots.save(snapshot('x', T1));
    expect(await groups.list()).toHaveLength(1);
    expect(window.localStorage.getItem('members-store')).toBeNull();
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
      makeRepos(storage).snapshots.save(snapshot('g1', T1))
    ).rejects.toThrow();
  });

  describe('capturas inválidas (cuarentena)', () => {
    const good = snapshot('good', T1);
    const brokenInvariants = {
      ...snapshot('bad1', T1),
      expenses: [{ ...snapshot('bad1', T1).expenses[0], payerId: 'nadie' }],
    };
    const brokenShape = { sourceGroupId: 'bad2', name: 42 };

    it('carga las válidas y respalda cada inválida con su motivo', async () => {
      const raw = JSON.stringify({
        version: 4,
        groups: [],
        snapshots: [brokenInvariants, good, brokenShape],
      });
      window.localStorage.setItem(STORAGE_KEY, raw);
      const { snapshots } = makeRepos();

      expect(await snapshots.list()).toEqual([good]);
      expect(await snapshots.get('bad1')).toBeNull();

      const first = JSON.parse(
        window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}`)!
      );
      const second = JSON.parse(
        window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}#1`)!
      );
      expect(first.snapshot).toEqual(brokenInvariants);
      expect(first.reason).toEqual(expect.any(String));
      expect(second.snapshot).toEqual(brokenShape);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
    });

    it('una captura inválida no afecta a los grupos válidos', async () => {
      const group = makeGroup({ members: ['A', 'B'] });
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 4,
          groups: [group],
          snapshots: [brokenShape],
        })
      );
      const { groups } = makeRepos();
      expect(await groups.list()).toEqual([group]);
    });

    it('no repite el respaldo en cada lectura, aunque lean los dos repositorios', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 4, groups: [], snapshots: [brokenShape] })
      );
      const { groups, snapshots } = makeRepos();
      await snapshots.list();
      await groups.list();
      await snapshots.list();
      const backups = Object.keys(window.localStorage).filter((k) =>
        k.startsWith(CORRUPTED_KEY_PREFIX)
      );
      expect(backups).toHaveLength(1);
    });

    it('al guardar, el documento queda solo con capturas válidas y el respaldo permanece', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 4,
          groups: [],
          snapshots: [brokenShape, good],
        })
      );
      const { snapshots } = makeRepos();
      await snapshots.save(snapshot('other', '2026-02-01T00:00:00.000Z'));
      const doc = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
      expect(
        doc.snapshots.map((s: { sourceGroupId: string }) => s.sourceGroupId)
      ).toEqual(['good', 'other']);
      expect(
        window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}`)
      ).not.toBeNull();
    });
  });

  it('un documento corrupto se respalda y las capturas parten vacías', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{bad');
    expect(await makeRepos().snapshots.list()).toEqual([]);
    expect(window.localStorage.getItem(`${CORRUPTED_KEY_PREFIX}${NOW}`)).toBe(
      '{bad'
    );
  });
});
