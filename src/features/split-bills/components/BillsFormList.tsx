import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { RoundedButton } from 'src/components/ui';
import useBills from '../hooks/useBills';
import { BillCard } from './BillCard';
import { TBillForm } from './BillForm';
import { TBillItemForm } from './BillItemForm';

export function BillsFormList() {
  const {
    bills,
    billsOrder,
    addBill,
    updateBill,
    deleteBill,
    addItemToBill,
    removeItemFromBill,
  } = useBills();

  const [billsList, setBillsList] = useState<string[]>(() => {
    return billsOrder.length ? billsOrder : [crypto.randomUUID()];
  });
  const [invalidForms, setInvalidForms] = useState<string[]>([]);

  useEffect(() => {
    console.log(bills);
  }, [bills, billsOrder]);

  const handleAddBill = () => {
    setBillsList([...billsList, crypto.randomUUID()]);
  };

  const handleRemoveBill = (uuid: string) => {
    setBillsList([...billsList].filter((id) => id !== uuid));
    removeFromInvalidForms(uuid);
    deleteBill(uuid);
  };

  const handleBillChange = (uuid: string, values: TBillForm) => {
    console.log(uuid, values);
    removeFromInvalidForms(uuid);
    if (bills[uuid]) {
      updateBill(uuid, values);
    } else {
      addBill({
        uuid,
        name: values.name,
        paidBy: values.paidBy,
        total: 0,
        items: [],
      });
    }
  };

  const handleInvalidBill = (uuid: string) => {
    setInvalidForms([...invalidForms, uuid]);
  };

  const handleAddItem = (uuid: string, item: TBillItemForm) => {
    addItemToBill(uuid, {
      uuid: crypto.randomUUID(),
      ...item,
    });
  };

  const handleRemoveItem = (uuid: string, itemUuid: string) => {
    removeItemFromBill(uuid, itemUuid);
  };

  const removeFromInvalidForms = (uuid: string) => {
    setInvalidForms([...invalidForms].filter((id) => id !== uuid));
  };

  return (
    <>
      <div>
        <ul className='space-y-2'>
          {billsList.map((uuid) => (
            <li key={uuid}>
              <BillCard
                uuid={uuid}
                bill={bills[uuid]}
                onRemoveBill={handleRemoveBill}
                onBillChange={handleBillChange}
                onInvalidBill={handleInvalidBill}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
              ></BillCard>
            </li>
          ))}
        </ul>
      </div>
      <RoundedButton
        className='mx-auto bg-zinc-900 px-4 py-1 text-sm text-white'
        onClick={handleAddBill}
      >
        <IconPlus size={16} />
        Agregar boleta
      </RoundedButton>
    </>
  );
}
