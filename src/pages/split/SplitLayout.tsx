import { Outlet } from 'react-router-dom';
import { Container } from 'src/components/ui';
import NavigationStep from '../../features/split/components/NavigationStep';

export function SplitLayout() {
  return (
    <Container className='flex flex-col gap-4 pb-4 pt-2 md:flex-row'>
      <NavigationStep />
      <Outlet />
    </Container>
  );
}

export default SplitLayout;
