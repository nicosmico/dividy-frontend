import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Divider, IconButton, RoundedButton } from 'src/components/ui';
import { debounce } from 'src/utils/debounce';
import { formatToCurrency } from 'src/utils/format-to';
import { BillForm } from '..';
import { Bill } from '../types/bill';
import { TBillForm } from './BillForm';
import { BillItemForm, TBillItemForm } from './BillItemForm';
import { ItemsList } from './ItemsList';

interface Props {
  uuid: string;
  bill?: Bill;
  onRemoveBill: (uuid: string) => void;
  onBillChange: (uuid: string, bill: TBillForm) => void;
  onInvalidBill: (uuid: string) => void;
  onAddItem: (uuid: string, item: TBillItemForm) => void;
  onRemoveItem: (uuid: string, itemUuid: string) => void;
}
export function BillCard({
  uuid,
  bill,
  onRemoveBill,
  onBillChange,
  onInvalidBill,
  onAddItem,
  onRemoveItem,
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
        defaultValues={{
          name: bill?.name,
          paidBy: bill?.paidBy,
        }}
        onValid={handleValidBill}
        onInvalid={() => onInvalidBill(uuid)}
      ></BillForm>
      <Divider />

      {/* Detail */}
      {bill?.items && (
        <>
          <div className='space-y-2'>
            <h3 className='font-medium'>Detalle</h3>
            <ItemsList
              items={bill.items}
              onRemoveItem={(itemUuid) => onRemoveItem(uuid, itemUuid)}
            ></ItemsList>
          </div>
          <Divider />
        </>
      )}

      {/* Item form */}
      <div className='space-y-2'>
        <h3 className='font-medium'>Agregar item</h3>
        <BillItemForm
          onValid={(item) => onAddItem(uuid, item)}
          onInvalid={() => onInvalidBill(uuid)}
        ></BillItemForm>
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
