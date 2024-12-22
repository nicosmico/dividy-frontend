import { useUpdateBreakpoints } from './hooks/useUpdateBreakpoints';
import AppRoutes from './routes';

function App() {
  useUpdateBreakpoints();

  return <AppRoutes />;
}

export default App;
