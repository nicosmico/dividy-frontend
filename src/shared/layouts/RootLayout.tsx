import { Outlet } from 'react-router';
import Container from '../ui/Container';
import Header from './Header';

export function RootLayout() {
  return (
    <>
      <Container className='z-10 mt-4 mb-3'>
        <Header />
      </Container>

      <div>
        <Outlet />
      </div>
    </>
  );
}

export default RootLayout;
