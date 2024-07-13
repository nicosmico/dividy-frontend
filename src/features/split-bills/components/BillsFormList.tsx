import { IconPlus, IconReceipt } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [invalidForms, setInvalidForms] = useState<string[]>([]);

  useEffect(() => {
    console.log(bills);
  }, [bills, billsOrder]);

  const handleAddBill = () => {
    addBill({
      name: `Boleta ${billsAdded}`,
      paidBy: membersOrder[0],
      total: 0,
      items: [],
    });
    billsAdded++;
  };

  const handleRemoveBill = (id: string) => {
    removeFromInvalidForms(id);
    deleteBill(id);
  };

  const handleBillChange = (id: string, values: TBillForm) => {
    removeFromInvalidForms(id);
    if (bills[id]) {
      updateBill(id, values);
    } else {
      addBill({
        name: values.name,
        paidBy: values.paidBy,
        total: 0,
        items: [],
      });
    }
  };

  const handleInvalidBill = (id: string) => {
    setInvalidForms([...invalidForms, id]);
  };

  const handleAddItem = (id: string, item: TBillItemForm) => {
    const members = Object.entries(item.members)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    addItemToBill(id, {
      id: crypto.randomUUID(),
      ...item,
      members,
    });
  };

  const handleRemoveItem = (id: string, itemUuid: string) => {
    removeItemFromBill(id, itemUuid);
  };

  const removeFromInvalidForms = (id: string) => {
    setInvalidForms([...invalidForms].filter((b) => b !== id));
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
                  onRemoveBill={handleRemoveBill}
                  onBillChange={handleBillChange}
                  onInvalidBill={handleInvalidBill}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                  onEditItem={(billId, itemId) =>
                    navigate(`${billId}/item/${itemId}/edit`)
                  }
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
