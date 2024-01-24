import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './components/layout';
import BreakpointProvider from './context/BreakpointProvider';
import { Bills, Members, Totals } from './pages';
import SplitLayout from './pages/split/SplitLayout';

function App() {
  return (
    <>
      <BreakpointProvider>
        <Routes>
          <Route element={<RootLayout />}>
            <Route
              path='/'
              element={<Navigate to='/split' replace={true} />}
            ></Route>
            <Route path='split' element={<SplitLayout />}>
              <Route
                path=''
                element={<Navigate to='members' replace={true} />}
              ></Route>
              <Route path='members' element={<Members />}></Route>
              <Route path='bills' element={<Bills />}></Route>
              <Route path='totals' element={<Totals />}></Route>
            </Route>
          </Route>
        </Routes>
      </BreakpointProvider>
    </>
  );
}

export default App;
