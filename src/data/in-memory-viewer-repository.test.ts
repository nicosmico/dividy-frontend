import { InMemoryViewerRepository } from './in-memory-viewer-repository';
import { describeViewerRepositoryContract } from './viewer-repository.contract';

describeViewerRepositoryContract(
  'InMemoryViewerRepository',
  () => new InMemoryViewerRepository()
);
