import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BillsPage from './pages/split-bills/bills/BillsPage';
import EditMemberPage from './pages/split-bills/members/EditMemberPage';
import MembersPage from './pages/split-bills/members/MembersPage';
import SimplifiedDebts from './pages/split-bills/total/SimplifiedDebts';
import { DividyIcon, RootLayout } from './shared';

const SplitBillsPage = lazy(() => import('./pages/split-bills/SplitBillsPage'));

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
        <Route
          path='/'
          element={<Navigate to='/split-bills' replace={true} />}
        />
        <Route path='/split-bills' element={<SplitBillsPage />}>
          <Route path='' element={<Navigate to='members' replace={true} />} />
          <Route path='members' element={<MembersPage />}>
            <Route path=':memberId/edit' element={<EditMemberPage />} />
          </Route>
          <Route path='bills' element={<BillsPage />} />
          <Route path='simplified-debts' element={<SimplifiedDebts />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
);

export default AppRoutes;
