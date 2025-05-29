import AppRoutes from './routes';
import { DialogMessageProvider, SnackBarProvider } from './shared';
import { useUpdateBreakpoints } from './shared/breakpoints/useUpdateBreakpoints';

function App() {
  useUpdateBreakpoints();

  return (
    <>
      <DialogMessageProvider>
        <SnackBarProvider>
          <AppRoutes />
        </SnackBarProvider>
      </DialogMessageProvider>
    </>
  );
}

export default App;
