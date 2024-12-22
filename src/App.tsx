import AppRoutes from './routes';
import { SnackBarProvider } from './shared';
import { useUpdateBreakpoints } from './shared/breakpoints/useUpdateBreakpoints';

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
