import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './components/layout';
import { useUpdateBreakpoints } from './hooks/useUpdateBreakpoints';
import { Bills, Members, Totals } from './pages';
import SplitLayout from './pages/split-bills/SplitBillsLayout';
import EditMembers from './pages/split-bills/members/EditMembers';

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
          <Route path='split-bills' element={<SplitLayout />}>
            <Route
              path=''
              element={<Navigate to='members' replace={true} />}
            ></Route>
            <Route path='members' element={<Members />}>
              <Route path=':memberId/edit' element={<EditMembers />}></Route>
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
