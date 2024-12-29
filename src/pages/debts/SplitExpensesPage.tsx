import { Outlet } from 'react-router-dom';
import { NavigationStep } from 'src/features/split-bills';
import { Container } from 'src/shared';

export function SplitExpensesPage() {
  return (
    <Container className='flex flex-col items-start gap-4 pb-4 pt-2 md:min-h-[calc(70dvh)] md:flex-row md:gap-20 md:pt-4'>
      <div className='bg-site-bg sticky top-0 z-30 w-full md:top-10 md:mt-24 md:w-auto'>
        <NavigationStep />
      </div>
      <Outlet />
    </Container>
  );
}

export default SplitExpensesPage;
