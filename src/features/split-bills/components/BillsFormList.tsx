import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { RoundedButton } from 'src/components/ui';
import { BillCard } from './BillCard';
import { TBillForm } from './BillForm';

export function BillsFormList() {
  // const { bills, setBills, deleteBill } = useBills();
  const [billsList, setBillsList] = useState<string[]>([crypto.randomUUID()]);
  const [invalidForms, setInvalidForms] = useState<string[]>([]);

  const handleAddBill = () => {
    setBillsList([...billsList, crypto.randomUUID()]);
  };

  const handleRemoveBill = (uuid: string) => {
    setBillsList([...billsList].filter((id) => id !== uuid));
    removeFromInvalidForms(uuid);
  };

  const handleBillChange = (uuid: string, values: TBillForm) => {
    console.log(uuid, values);
    removeFromInvalidForms(uuid);
  };

  const handleInvalidBill = (uuid: string) => {
    setInvalidForms([...invalidForms, uuid]);
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
                onRemoveBill={handleRemoveBill}
                onBillChange={handleBillChange}
                onInvalidBill={handleInvalidBill}
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
