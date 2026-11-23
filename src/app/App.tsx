import { BrowserRouter } from 'react-router';

import { LocalStorageGroupRepository } from '@/data';
import { AppProviders } from './providers';
import { AppRoutes } from './router';

const repository = new LocalStorageGroupRepository();

export function App() {
  return (
    <AppProviders repository={repository}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
