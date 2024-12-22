import { SnackBarProvider } from './components/ui/snack-bar/SnackBarProvider';
import { useUpdateBreakpoints } from './hooks/useUpdateBreakpoints';
import AppRoutes from './routes';

function App() {
  useUpdateBreakpoints();

  return (
    <>
      <SnackBarProvider>
        <AppRoutes />
      </SnackBarProvider>
    </>
  );
}

export default App;
