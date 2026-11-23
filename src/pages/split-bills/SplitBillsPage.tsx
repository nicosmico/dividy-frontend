import { Outlet } from 'react-router';
import { NavigationStep } from '@/features/split-bills';
import { Container } from '@/shared';

export function SplitBillsPage() {
  return (
    <Container className='flex flex-col items-start gap-4 pt-2 pb-4 md:min-h-[calc(70dvh)] md:flex-row md:gap-20 md:pt-4'>
      <div className='sticky top-0 z-30 w-full bg-site-bg md:top-10 md:mt-24 md:w-auto'>
        <NavigationStep />
      </div>
      <Outlet />
    </Container>
  );
}

export default SplitBillsPage;
