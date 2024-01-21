import { Outlet } from 'react-router-dom';
import { Container } from 'src/components/ui';
import { useBreakpoint } from 'src/hooks/useBreakpoint';
import { Header } from '.';

export function RootLayout() {
  const { md } = useBreakpoint();

  return (
    <>
      {/* Header */}
      {md && (
        <Container className='sticky top-4 z-10 mt-4 flex justify-center'>
          <Header />
        </Container>
      )}

      <Outlet />
    </>
  );
}

export default RootLayout;
