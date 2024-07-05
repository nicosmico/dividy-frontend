import { IconArrowNarrowLeft } from '@tabler/icons-react';
import { useEffect } from 'react';
import { RoundedLink } from 'src/components/ui';
import useBills from 'src/features/split-bills/hooks/useBills';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { Summary } from 'src/features/split-bills/types/totals';

export function TotalsPage() {
  const { members } = useMembers();
  const { bills } = useBills();

  useEffect(() => {
    const summary = new Summary(Object.values(bills));
    // Get summary here
  }, [bills]);

  return (
    <>
      <div className='w-full space-y-4 md:flex md:gap-4'>
        <div className='w-full text-center md:pt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Totales</h1>
          <p>
            Considerando todas las deudas este es el total que debe pagar cada
            miembro del grupo.
          </p>
          <div className='flex gap-2'>
            <RoundedLink
              to='../bills'
              className='mt-4 w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
            >
              <IconArrowNarrowLeft></IconArrowNarrowLeft>
              Boletas
            </RoundedLink>
          </div>
        </div>
        {/* <ul className='w-full space-y-4'>
          {membersDebts.map((memberDebts) => (
            <li key={memberDebts.uuid}>
              <MemberDebtsCard
                memberDebts={memberDebts}
                members={members}
              ></MemberDebtsCard>
            </li>
          ))}
        </ul> */}
      </div>
    </>
  );
}

export default TotalsPage;
