import { Outlet } from 'react-router-dom';

export function RootLayout() {
  return (
    <>
      {/* <Container className='top-3 z-10 flex justify-center px-0 md:mt-4 md:justify-start'>
        <Header />
      </Container> */}
      <Outlet />
    </>
  );
}

export default RootLayout;
