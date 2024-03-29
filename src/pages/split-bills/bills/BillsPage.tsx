import { IconArrowNarrowLeft, IconArrowNarrowRight } from '@tabler/icons-react';
import { Outlet } from 'react-router-dom';
import { RoundedLink } from 'src/components/ui';
import { BillsFormList } from 'src/features/split-bills';

export function BillsPage() {
  return (
    <>
      <div className='space-y-4 md:flex md:gap-4'>
        <div className='w-full text-center md:pt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Boletas</h1>
          <p>
            Cada boleta que agregues contiene los items que fueron comprados por
            uno de los miembros y entre quienes se dividirá cada item.
          </p>
          <div className='flex gap-2'>
            <RoundedLink
              to='../members'
              className='mt-4 w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
            >
              <IconArrowNarrowLeft></IconArrowNarrowLeft>
              Miembros
            </RoundedLink>
            <RoundedLink
              to='../totals'
              className='mt-4 w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
            >
              Totales
              <IconArrowNarrowRight></IconArrowNarrowRight>
            </RoundedLink>
          </div>
        </div>

        <div className='w-full space-y-8'>
          <BillsFormList />
        </div>
      </div>
      <Outlet />
    </>
  );
}

export default BillsPage;
