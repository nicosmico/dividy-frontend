import { Outlet } from 'react-router-dom';
import Container from '../ui/Container';
import Header from './Header';

export function RootLayout() {
  return (
    <>
      <Container className='z-10 mb-3 mt-4'>
        <Header />
      </Container>

      <div>
        <Outlet />
      </div>
    </>
  );
}

export default RootLayout;
