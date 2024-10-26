import { IconPlus, IconReceipt } from '@tabler/icons-react';
import { RoundedButton, Status } from 'src/components/ui';
import useBills from '../hooks/useBills';
import useMembers from '../hooks/useMembers';
import { BillCard } from './BillCard';

export function BillsList() {
  const { bills, billsOrder, addBill, deleteBill } = useBills();
  const { members, membersOrder } = useMembers();

  const handleAddBill = () => {
    console.log(members);
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

  return (
    <>
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
    </>
  );
}
