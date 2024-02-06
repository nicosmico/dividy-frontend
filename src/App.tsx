import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './components/layout';
import { useUpdateBreakpoints } from './hooks/useUpdateBreakpoints';
import { BillsPage, MembersPage, TotalsPage } from './pages';
import { SplitBillsPage } from './pages/split-bills/SplitBillsPage';
import { EditMemberPage } from './pages/split-bills/members/EditMemberPage';

function App() {
  useUpdateBreakpoints();

  return (
    <>
      <Routes>
        <Route element={<RootLayout />}>
          <Route
            path='/'
            element={<Navigate to='/split-bills' replace={true} />}
          ></Route>
          <Route path='split-bills' element={<SplitBillsPage />}>
            <Route
              path=''
              element={<Navigate to='members' replace={true} />}
            ></Route>
            <Route path='members' element={<MembersPage />}>
              <Route path=':memberId/edit' element={<EditMemberPage />}></Route>
            </Route>
            <Route path='bills' element={<BillsPage />}></Route>
            <Route path='totals' element={<TotalsPage />}></Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
