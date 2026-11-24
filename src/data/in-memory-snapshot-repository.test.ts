import { InMemorySnapshotRepository } from './in-memory-snapshot-repository';
import { describeSnapshotRepositoryContract } from './snapshot-repository.contract';

describeSnapshotRepositoryContract(
  'InMemorySnapshotRepository',
  () => new InMemorySnapshotRepository()
);
