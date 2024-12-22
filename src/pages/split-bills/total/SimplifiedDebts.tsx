import { IconArrowNarrowLeft, IconReceipt } from '@tabler/icons-react';
import { useMemo } from 'react';
import { RoundedLink, Status } from 'src/components/ui';
import { TransactionCard } from 'src/features/split-bills/components/TransactionCard';
import useBills from 'src/features/split-bills/hooks/useBills';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import {
  simplifyDebts,
  Transaction,
} from 'src/features/split-bills/types/transaction';

export function SimplifiedDebts() {
  const { members } = useMembers();
  const { billsOrder, bills } = useBills();

  const transactions = useMemo(() => {
    return simplifyDebts(billsOrder.map((id) => bills[id]));
  }, [bills, billsOrder]);

  const transactionsByDebtor = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (!acc[t.from]) {
          acc[t.from] = [];
        }
        acc[t.from].push(t);
        return acc;
      },
      {} as Record<string, Transaction[]>
    );
  }, [transactions]);

  return (
    <>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-[min-content_1fr]'>
        <div className='space-y-2 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Deudas simplificadas</h1>
          <p>
            Aquí puedes ver las deudas simplificadas de cada miembro, es decir,
            cuánto debe o le deben a cada uno.
          </p>
        </div>
        <div className='space-y-8 md:col-start-2 md:col-end-3 md:row-span-full'>
          {transactions.length ? (
            <div>
              <ul className='space-y-2'>
                {Object.entries(transactionsByDebtor).map(
                  ([id, debtorTransactions]) => (
                    <li key={id}>
                      <TransactionCard
                        member={members[id]}
                        transactions={debtorTransactions}
                        members={members}
                      />
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : (
            <Status
              title='No hay gastos'
              description='Agrega un gasto en el paso anterior para ver las deudas simplificadas.'
              icon={<IconReceipt size={48}></IconReceipt>}
              className='pt-8'
            />
          )}
        </div>

        <div className='sticky bottom-2 md:static md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3'>
          <RoundedLink
            to='../bills'
            className='w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
          >
            <IconArrowNarrowLeft></IconArrowNarrowLeft>
            Gastos
          </RoundedLink>
        </div>
      </div>
    </>
  );
}

export default SimplifiedDebts;
