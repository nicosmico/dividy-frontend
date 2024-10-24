import { IconArrowNarrowLeft } from '@tabler/icons-react';
import { RoundedLink } from 'src/components/ui';

export function TotalsPage() {
  return (
    <>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-[min-content_1fr]'>
        <div className='space-y-4 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Totales</h1>
          <p>
            Considerando todas las deudas este es el total que debe pagar cada
            miembro del grupo.
          </p>
        </div>
        <div className='space-y-8 md:col-start-2 md:col-end-3 md:row-span-full'></div>
        <div className='sticky bottom-2 md:static md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3 md:content-start'>
          <RoundedLink
            to='../bills'
            className='mt-4 w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
          >
            <IconArrowNarrowLeft></IconArrowNarrowLeft>
            Boletas
          </RoundedLink>
        </div>
      </div>
    </>
  );
}

export default TotalsPage;
