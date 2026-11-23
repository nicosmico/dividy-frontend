import { describe, expect, it } from 'vitest';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { describeGroupRepositoryContract } from './group-repository.contract';
import { InMemoryGroupRepository } from './in-memory-group-repository';

describeGroupRepositoryContract(
  'InMemoryGroupRepository',
  () => new InMemoryGroupRepository()
);

describe('InMemoryGroupRepository', () => {
  it('puede iniciarse con grupos y los copia', async () => {
    const initial = makeGroup({ members: ['A'] });
    const repo = new InMemoryGroupRepository([initial]);
    initial.name = 'mutado';
    expect((await repo.get('g1'))!.name).toBe('Grupo');
  });
});
