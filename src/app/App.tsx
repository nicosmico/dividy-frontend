import { BrowserRouter } from 'react-router';

import {
  LocalStorageGroupRepository,
  LocalStorageSnapshotRepository,
  LocalStorageStore,
  LocalStorageViewerRepository,
} from '@/data';
import { AppProviders } from './providers';
import { AppRoutes } from './router';

// One store: groups and snapshots live in the same document.
const store = new LocalStorageStore();
const repository = new LocalStorageGroupRepository({ store });
const snapshotRepository = new LocalStorageSnapshotRepository({ store });
// Who "you" are is a preference of the device: its own key, outside the store (ADR 0007).
const viewerRepository = new LocalStorageViewerRepository();

export function App() {
  return (
    <AppProviders
      repository={repository}
      snapshotRepository={snapshotRepository}
      viewerRepository={viewerRepository}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
