import { Outlet } from 'react-router-dom';
import { Container } from 'src/components/ui';

export function SplitBillsPage() {
  return (
    <Container className='flex flex-col gap-4 pb-4 pt-2 md:flex-row md:pt-4'>
      {/* <NavigationStep /> */}
      <Outlet />
    </Container>
  );
}

export default SplitBillsPage;
