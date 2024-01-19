import { Link, Outlet } from 'react-router-dom';
import { Container, DividyIcon } from 'src/components/ui';
import { useBreakpoint } from 'src/hooks/useBreakpoint';
import Navbar from './components/Navbar';

export function RootLayout() {
  const { md } = useBreakpoint();

  return (
    <>
      {/* Header */}
      <Container>
        <header className='flex items-center justify-center py-2 md:justify-between md:py-4'>
          <Link to='/' className='flex items-center gap-2'>
            <DividyIcon size={md ? 24 : 18} className='rounded-lg p-1' />
            <p className='font-semibold md:text-lg'>Dividy</p>
          </Link>

          {md && <Navbar />}

          {/* <BorderButton className='font-bold'>
            Compartir
            <IconShare></IconShare>
          </BorderButton> */}
        </header>
      </Container>

      <Outlet />
    </>
  );
}

export default RootLayout;
