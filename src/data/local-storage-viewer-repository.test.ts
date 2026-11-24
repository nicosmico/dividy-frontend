import { beforeEach, describe, expect, it } from 'vitest';
import {
  LocalStorageViewerRepository,
  VIEWERS_STORAGE_KEY,
} from './local-storage-viewer-repository';
import { STORAGE_KEY } from './local-storage-store';
import { describeViewerRepositoryContract } from './viewer-repository.contract';

const group = { kind: 'group', id: 'g1' } as const;

beforeEach(() => {
  window.localStorage.clear();
});

describeViewerRepositoryContract('LocalStorageViewerRepository', () => {
  window.localStorage.clear();
  return new LocalStorageViewerRepository();
});

describe('LocalStorageViewerRepository', () => {
  it('guarda en su propia clave, aparte del documento de grupos', async () => {
    await new LocalStorageViewerRepository().set(group, { memberId: 'm1' });
    expect(
      JSON.parse(window.localStorage.getItem(VIEWERS_STORAGE_KEY)!)
    ).toEqual({ version: 1, choices: { 'group:g1': { memberId: 'm1' } } });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('persiste entre instancias', async () => {
    await new LocalStorageViewerRepository().set(group, { none: true });
    expect(await new LocalStorageViewerRepository().get(group)).toEqual({
      none: true,
    });
  });

  it('un texto ilegible cuenta como "nadie preguntó" y el próximo guardado lo reemplaza', async () => {
    window.localStorage.setItem(VIEWERS_STORAGE_KEY, '{no es json');
    const repo = new LocalStorageViewerRepository();
    expect(await repo.get(group)).toBeNull();
    await repo.set(group, { memberId: 'm1' });
    expect(await repo.get(group)).toEqual({ memberId: 'm1' });
  });

  it('una versión desconocida o una forma equivocada se ignora', async () => {
    const repo = new LocalStorageViewerRepository();
    window.localStorage.setItem(
      VIEWERS_STORAGE_KEY,
      JSON.stringify({ version: 2, choices: { 'group:g1': { none: true } } })
    );
    expect(await repo.get(group)).toBeNull();
    window.localStorage.setItem(VIEWERS_STORAGE_KEY, JSON.stringify([1, 2]));
    expect(await repo.get(group)).toBeNull();
  });

  it('descarta solo las entradas inválidas y conserva las buenas', async () => {
    window.localStorage.setItem(
      VIEWERS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        choices: {
          'group:g1': { memberId: 'm1' },
          'group:g2': { memberId: 3 },
          'group:g3': { none: false },
          'group:g4': { memberId: 'm1', none: true },
          'group:g5': 'x',
        },
      })
    );
    const repo = new LocalStorageViewerRepository();
    expect(await repo.get(group)).toEqual({ memberId: 'm1' });
    for (const id of ['g2', 'g3', 'g4', 'g5']) {
      expect(await repo.get({ kind: 'group', id })).toBeNull();
    }
  });

  it('si el almacenamiento falla al guardar, set rechaza', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    } as unknown as Storage;
    await expect(
      new LocalStorageViewerRepository({ storage }).set(group, { none: true })
    ).rejects.toThrow('quota');
  });
});
