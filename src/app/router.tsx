import { Navigate, Route, Routes } from 'react-router';

import { BalancesTab } from '@/features/balances';
import { ExpensesTab } from '@/features/expenses';
import { GroupLayout, GroupsPage, NewGroupPage } from '@/features/groups';
import { MembersTab } from '@/features/members';
import { AppLayout } from './AppLayout';
import { ErrorBoundary } from './ErrorBoundary';
import { NotFoundPage } from './NotFoundPage';

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
