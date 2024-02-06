import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './components/layout';
import { useUpdateBreakpoints } from './hooks/useUpdateBreakpoints';
import { Bills, Members, Totals } from './pages';
import { SplitBillsLayout } from './pages/split-bills/SplitBillsLayout';
import { EditMember } from './pages/split-bills/members/EditMember';

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
          <Route path='split-bills' element={<SplitBillsLayout />}>
            <Route
              path=''
              element={<Navigate to='members' replace={true} />}
            ></Route>
            <Route path='members' element={<Members />}>
              <Route path=':memberId/edit' element={<EditMember />}></Route>
            </Route>
            <Route path='bills' element={<Bills />}></Route>
            <Route path='totals' element={<Totals />}></Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
