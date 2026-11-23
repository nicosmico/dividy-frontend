import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { AppLayout } from './AppLayout';
import { ErrorBoundary } from './ErrorBoundary';
import { NotFoundPage } from './NotFoundPage';

// Each screen is its own chunk (AppLayout and GroupLayout hold the Suspense) so the first load only downloads what it shows.
const GroupsPage = lazy(() =>
  import('@/features/groups').then((m) => ({ default: m.GroupsPage }))
);
const NewGroupPage = lazy(() =>
  import('@/features/groups').then((m) => ({ default: m.NewGroupPage }))
);
const GroupLayout = lazy(() =>
  import('@/features/groups').then((m) => ({ default: m.GroupLayout }))
);
const ExpensesTab = lazy(() =>
  import('@/features/expenses').then((m) => ({ default: m.ExpensesTab }))
);
const BalancesTab = lazy(() =>
  import('@/features/balances').then((m) => ({ default: m.BalancesTab }))
);
const MembersTab = lazy(() =>
  import('@/features/members').then((m) => ({ default: m.MembersTab }))
);

/** Declarative route table. Tests render it inside a `MemoryRouter`. */
export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<GroupsPage />} />
          <Route path='groups/new' element={<NewGroupPage />} />
          <Route path='groups/:groupId' element={<GroupLayout />}>
            <Route index element={<Navigate to='expenses' replace />} />
            <Route path='expenses' element={<ExpensesTab />} />
            <Route path='balances' element={<BalancesTab />} />
            <Route path='members' element={<MembersTab />} />
          </Route>
          <Route path='*' element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
