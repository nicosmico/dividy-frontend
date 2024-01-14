import { Navigate, Route, Routes } from "react-router-dom";
import Members from "./pages/Members";
import Bills from "./pages/Bills";
import Totals from "./pages/Totals";

function App() {
  return (
    <>
      <h1 className='text-5xl text-orange-600'>Dividy</h1>
    
      <Routes>
        <Route path="/" element={<Navigate to='/members' replace={true}/>}></Route>
        <Route path="/members" element={<Members/>}></Route>
        <Route path="/bills" element={<Bills/>}></Route>
        <Route path="/totals" element={<Totals/>}></Route>
      </Routes>
    </>
  );
}

export default App;
