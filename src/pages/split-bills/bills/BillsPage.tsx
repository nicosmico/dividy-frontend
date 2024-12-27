import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconPlus,
  IconReceipt,
} from '@tabler/icons-react';
import { useState } from 'react';
import { BillCard } from 'src/features/split-bills';
import { BillFormValues } from 'src/features/split-bills/components/BillForm';
import useBills from 'src/features/split-bills/hooks/useBills';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { Bill } from 'src/features/split-bills/types/bill';
import { RoundedButton, RoundedLink, Status } from 'src/shared';

export function BillsPage() {
  const { bills, billsOrder, addBill, updateBill, deleteBill } = useBills();
  const { members, membersOrder } = useMembers();
  const [billsForms, setBillsForms] = useState<Partial<Bill>[]>(
    billsOrder.map((id) => bills[id])
  );
  const [lastEditedBill, setLastEditedBill] = useState<number | null>(
    billsForms.length > 1 ? null : 0
  );

  const handleAddBillForm = () => {
    setBillsForms([
      ...billsForms,
      {
        paidBy: members[membersOrder[0]].id,
        members: [],
      },
    ]);

    setLastEditedBill(() => billsForms.length);
  };

  const handleDeleteBill = (index: number) => {
    setBillsForms((prev) => prev.filter((_, i) => i !== index));
    const bill = billsForms[index];
    if (bill?.id) {
      deleteBill(bill.id);
    }
  };

  const handleUpdateBill = (index: number, values: BillFormValues) => {
    const billId = billsForms[index]?.id;
    const bill = billId ? updateBill(billId, values) : addBill(values);
    setBillsForms((prev) => prev.map((b, i) => (i === index ? bill : b)));
  };

  return (
    <>
      <div className='grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-[min-content_1fr]'>
        <div className='space-y-2 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Gastos</h1>
          <p>
            Agrega los gastos del grupo y Dividy se encargará de simplificar las
            deudas
          </p>
        </div>
        <div className='space-y-8 md:col-start-2 md:col-end-3 md:row-span-full'>
          <RoundedButton
            className='mx-auto bg-zinc-900 px-4 py-1 text-sm text-white'
            onClick={() => handleAddBillForm()}
          >
            <IconPlus size={16} />
            Agregar boleta
          </RoundedButton>
          {billsForms.length ? (
            <div>
              <ul className='space-y-2'>
                {billsForms.map((bill, index) => (
                  <li key={index}>
                    <BillCard
                      bill={bill}
                      members={membersOrder.map((id) => members[id])}
                      onDelete={() => handleDeleteBill(index)}
                      onValueChange={(values) =>
                        handleUpdateBill(index, values)
                      }
                      open={lastEditedBill === index}
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
        </div>

        <div className='bottom-2 grid grid-cols-2 gap-1 md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3 md:content-start'>
          <RoundedLink
            to='../members'
            className='w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
          >
            <IconArrowNarrowLeft></IconArrowNarrowLeft>
            Miembros
          </RoundedLink>
          <RoundedLink
            to='../simplified-debts'
            className='w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
          >
            Deudas
            <IconArrowNarrowRight></IconArrowNarrowRight>
          </RoundedLink>
        </div>
      </div>
    </>
  );
}

export default BillsPage;
