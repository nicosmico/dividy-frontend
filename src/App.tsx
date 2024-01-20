import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './components/layout';
import { Bills, Members, Totals } from './pages';

function App() {
  return (
    <>
      <Routes>
        <Route
          path='/'
          element={<Navigate to='/split' replace={true} />}
        ></Route>

        <Route element={<RootLayout />}>
          <Route path='split'>
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
    </>
  );
}

export default App;
