import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/homepage/HomePage';
import ExpensesPage from './pages/debts/expenses/ExpensesPage';
import EditMemberPage from './pages/debts/group/EditMemberPage';
import MembersPage from './pages/debts/group/MembersPage';
import SimplifiedDebtsPage from './pages/debts/summary/SimplifiedDebtsPage';
import { DividyIcon, RootLayout } from './shared';

const SplitExpensesPage = lazy(() => import('./pages/debts/SplitExpensesPage'));

const AppRoutes = () => (
  <Suspense
    fallback={
      <div className='grid h-svh w-full animate-spin items-center justify-center'>
        <DividyIcon className='animate-pulse rounded-lg bg-zinc-800 p-1 text-amber-200' />
      </div>
    }
  >
    <Routes>
      <Route element={<RootLayout />}>
        <Route path='/' element={<Navigate to='/home' replace={true} />} />

        <Route path='home' element={<HomePage></HomePage>} />

        <Route path='/debts' element={<SplitExpensesPage />}>
          <Route
            path=''
            element={<Navigate to='new/members' replace={true} />}
          />

          <Route path=':debtId'>
            <Route path='members' element={<MembersPage />}>
              <Route path=':memberId/edit' element={<EditMemberPage />} />
            </Route>
            <Route path='expenses' element={<ExpensesPage />} />
            <Route path='simplified-debts' element={<SimplifiedDebtsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  </Suspense>
);

export default AppRoutes;
