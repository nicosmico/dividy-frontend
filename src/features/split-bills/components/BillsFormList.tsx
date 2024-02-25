import { IconPlus, IconReceipt } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { RoundedButton, Status } from 'src/components/ui';
import useBills from '../hooks/useBills';
import useMembers from '../hooks/useMembers';
import { BillCard } from './BillCard';
import { TBillForm } from './BillForm';
import { TBillItemForm } from './BillItemForm';

let billsAdded = 1;

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
  const { members, membersOrder } = useMembers();

  const [invalidForms, setInvalidForms] = useState<string[]>([]);

  useEffect(() => {
    console.log(billsOrder.length);
  }, [bills, billsOrder]);

  const handleAddBill = () => {
    addBill({
      uuid: crypto.randomUUID(),
      name: `Boleta ${billsAdded}`,
      paidBy: membersOrder[0],
      total: 0,
      items: [],
    });
    billsAdded++;
  };

  const handleRemoveBill = (uuid: string) => {
    removeFromInvalidForms(uuid);
    deleteBill(uuid);
  };

  const handleBillChange = (uuid: string, values: TBillForm) => {
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
    const members = Object.entries(item.members)
      .filter(([, checked]) => checked)
      .map(([uuid]) => uuid);
    addItemToBill(uuid, {
      uuid: crypto.randomUUID(),
      ...item,
      members,
    });
  };

  const handleRemoveItem = (uuid: string, itemUuid: string) => {
    removeItemFromBill(uuid, itemUuid);
  };

  const removeFromInvalidForms = (uuid: string) => {
    setInvalidForms([...invalidForms].filter((b) => b !== uuid));
  };

  return (
    <>
      {billsOrder.length ? (
        <div>
          <ul className='space-y-2'>
            {billsOrder.map((uuid) => (
              <li key={uuid}>
                <BillCard
                  uuid={uuid}
                  bill={bills[uuid]}
                  members={membersOrder.map((uuid) => members[uuid])}
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
      ) : (
        <Status
          title='Agrega una boleta'
          description='Debes agregar al menos una boleta'
          icon={<IconReceipt size={48}></IconReceipt>}
          className='pt-8'
        />
      )}
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
