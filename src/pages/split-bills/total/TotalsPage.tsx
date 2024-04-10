import { IconArrowNarrowLeft } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { RoundedLink } from 'src/components/ui';
import { TotalSummary } from 'src/features/split-bills/components/TotalSummary';
import useBills from 'src/features/split-bills/hooks/useBills';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { Bill } from 'src/features/split-bills/types/bill';
import { Summary } from 'src/features/split-bills/types/totals';

export function TotalsPage() {
  const { membersOrder, members } = useMembers();
  const { billsOrder, bills } = useBills();
  const [totalsSummary, setTotalsSummary] = useState<Summary[]>([]);

  useEffect(() => {
    // Group bills with items to pay by every member
    const billsToPayByMember: {
      [memberUuid: string]: { [billUuid: string]: Bill };
    } = {};
    billsOrder.forEach((billUuid) => {
      const bill = bills[billUuid];
      bill.items.forEach((item) => {
        item.members.forEach((memberUuid) => {
          billsToPayByMember[memberUuid] ??= {};
          billsToPayByMember[memberUuid][billUuid] ??= { ...bill, items: [] };
          billsToPayByMember[memberUuid][billUuid].items.push(item);
        });
      });
    });

    // Format as Summary object
    const summary = Object.entries(billsToPayByMember).map(
      ([memberUuid, billsToPay]) => ({
        uuid: crypto.randomUUID(),
        member: memberUuid,
        bills: Object.values(billsToPay),
      })
    );
    setTotalsSummary(summary);
  }, [billsOrder, bills, members]);

  return (
    <>
      <div className='space-y-4 md:flex md:gap-4'>
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

          <ul className='w-full space-y-4'>
            {totalsSummary.map((summary) => (
              <li key={summary.uuid}>
                <TotalSummary
                  summary={summary}
                  members={members}
                ></TotalSummary>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export default TotalsPage;
