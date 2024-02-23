import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Divider, IconButton, RoundedButton } from 'src/components/ui';
import { debounce } from 'src/utils/debounce';
import { formatToCurrency } from 'src/utils/format-to';
import { BillForm } from '..';
import { Bill } from '../types/bill';
import { TBillForm } from './BillForm';
import { ItemsList } from './ItemsList';

interface Props {
  uuid: string;
  bill?: Bill;
  onRemoveBill: (uuid: string) => void;
  onBillChange: (uuid: string, bill: TBillForm) => void;
  onInvalidBill: (uuid: string) => void;
}
export function BillCard({
  uuid,
  bill,
  onRemoveBill,
  onBillChange,
  onInvalidBill,
}: Props) {
  const [name, setName] = useState<string>(bill?.name ?? 'Boleta 1');
  const [total] = useState<number>(0);

  useEffect(() => {
    console.log(bill);
  }, [bill]);

  const handleValidBill = (values: TBillForm) => {
    setName(values.name);
    debounceOnBillChange(uuid, values);
  };

  const debounceOnBillChange = useMemo(
    () =>
      debounce((uuid: string, values: TBillForm) => {
        onBillChange(uuid, values);
      }, 300),
    [onBillChange]
  );

  return (
    <Card className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='aspect-square rounded-full bg-red-400 p-3 text-white'>
          <IconBottle />
        </div>
        <div className='w-full'>
          <h2 className='text-lg font-medium'>{formatToCurrency(total)}</h2>
          <h1 className='text-sm font-medium'>{name}</h1>
        </div>
        <IconButton className='p-0'>
          <IconChevronDown size={28}></IconChevronDown>
        </IconButton>
      </div>

      {/* Bill form */}
      <BillForm
        onValid={handleValidBill}
        onInvalid={() => onInvalidBill(uuid)}
      ></BillForm>
      <Divider />

      {/* Detail */}
      <div className='space-y-2'>
        <h3 className='font-medium'>Detalle</h3>
        <ItemsList />
      </div>
      <Divider />

      {/* Item form */}
      <div className='space-y-2'>
        <h3 className='font-medium'>Agregar item</h3>
        {/* <BillItemForm onSubmit={console.log}></BillItemForm> */}
      </div>
      <Divider />

      <RoundedButton
        className='mx-auto bg-red-400 px-4 py-1 text-sm text-white'
        onClick={() => onRemoveBill(uuid)}
      >
        <IconX size={16}></IconX>
        Eliminar boleta
      </RoundedButton>
    </Card>
  );
}
