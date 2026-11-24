import { BrowserRouter } from 'react-router';

import {
  LocalStorageGroupRepository,
  LocalStorageSnapshotRepository,
  LocalStorageStore,
} from '@/data';
import { AppProviders } from './providers';
import { AppRoutes } from './router';

// One store: groups and snapshots live in the same document.
const store = new LocalStorageStore();
const repository = new LocalStorageGroupRepository({ store });
const snapshotRepository = new LocalStorageSnapshotRepository({ store });

export function App() {
  return (
    <AppProviders
      repository={repository}
      snapshotRepository={snapshotRepository}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
