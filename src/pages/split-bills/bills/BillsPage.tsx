import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconPlus,
  IconReceipt,
} from '@tabler/icons-react';
import { RoundedButton, RoundedLink, Status } from 'src/components/ui';
import { BillCard } from 'src/features/split-bills';
import useBills from 'src/features/split-bills/hooks/useBills';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { Bill } from 'src/features/split-bills/types/bill';

export function BillsPage() {
  const { bills, billsOrder, addBill, deleteBill, updateBill } = useBills();
  const { members, membersOrder } = useMembers();

  const handleAddBill = () => {
    addBill({
      name: 'Nuevo gasto',
      total: 0,
      paidBy: members[membersOrder[0]].id,
      members: [],
      totalByMember: 0,
    });
  };

  const handleDeleteBill = (billId: string) => {
    deleteBill(billId);
  };

  const handleEditBill = (billId: string, values: Partial<Bill>) => {
    updateBill(billId, values);
  };

  return (
    <>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-[min-content_1fr]'>
        <div className='space-y-4 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Gastos</h1>
          <p>
            Agrega a los miembros del grupo con quienes dividirás los gastos. En
            el siguiente paso podrás agregar las deudas.
          </p>
        </div>
        <div className='space-y-8 md:col-start-2 md:col-end-3 md:row-span-full'>
          {billsOrder.length ? (
            <div>
              <ul className='space-y-2'>
                {billsOrder.map((id) => (
                  <li key={id}>
                    <BillCard
                      id={id}
                      bill={bills[id]}
                      members={membersOrder.map((id) => members[id])}
                      onDelete={handleDeleteBill}
                      onValueChange={handleEditBill}
                    ></BillCard>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Status
              title='Agrega una gasto'
              description='Debes agregar al menos una gasto'
              icon={<IconReceipt size={48}></IconReceipt>}
              className='pt-8'
            />
          )}

          <RoundedButton
            className='mx-auto bg-zinc-900 px-4 py-1 text-sm text-white'
            onClick={() => handleAddBill()}
          >
            <IconPlus size={16} />
            Agregar boleta
          </RoundedButton>
        </div>

        <div className='sticky bottom-2 grid grid-cols-2 gap-1 md:static md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3 md:content-start'>
          <RoundedLink
            to='../members'
            className='w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
          >
            <IconArrowNarrowLeft></IconArrowNarrowLeft>
            Miembros
          </RoundedLink>
          <RoundedLink
            to='../totals'
            className='w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
          >
            Totales
            <IconArrowNarrowRight></IconArrowNarrowRight>
          </RoundedLink>
        </div>
      </div>
    </>
  );
}
