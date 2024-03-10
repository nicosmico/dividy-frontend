import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Card, IconButton, RoundedButton } from 'src/components/ui';
import { debounce } from 'src/utils/debounce';
import { formatToCurrency } from 'src/utils/format-to';
import { BillForm } from '..';
import { Bill } from '../types/bill';
import { Member } from '../types/member';
import { TBillForm } from './BillForm';
import { BillItemForm, TBillItemForm } from './BillItemForm';
import { ItemsList } from './ItemsList';

interface Props {
  uuid: string;
  bill?: Bill;
  members: Member[];
  onRemoveBill: (uuid: string) => void;
  onBillChange: (uuid: string, bill: TBillForm) => void;
  onInvalidBill: (uuid: string) => void;
  onAddItem: (uuid: string, item: TBillItemForm) => void;
  onRemoveItem: (uuid: string, itemUUID: string) => void;
  onEditItem: (uuid: string, itemUUID: string) => void;
}
export function BillCard({
  uuid,
  bill,
  members,
  onRemoveBill,
  onBillChange,
  onInvalidBill,
  onAddItem,
  onRemoveItem,
  onEditItem,
}: Props) {
  const [name, setName] = useState<string>(bill?.name ?? 'Boleta');

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
    <Card className='space-y-4 divide-y *:pt-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='aspect-square rounded-full bg-red-400 p-3 text-white'>
          <IconBottle />
        </div>
        <div className='w-full'>
          {bill?.total !== undefined && (
            <h2 className='text-lg font-medium'>
              {formatToCurrency(bill.total)}
            </h2>
          )}
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
        members={members}
        onValid={handleValidBill}
        onInvalid={() => onInvalidBill(uuid)}
      ></BillForm>

      {/* Detail */}
      {!!bill?.items.length && (
        <>
          <div className='space-y-2'>
            <h3 className='font-medium'>Detalle</h3>
            <ItemsList
              items={bill.items}
              onRemoveItem={(itemUUID) => onRemoveItem(uuid, itemUUID)}
              onEditItem={(itemUUID) => onEditItem(uuid, itemUUID)}
            ></ItemsList>
          </div>
        </>
      )}

      {/* Item form */}
      <div className='space-y-2'>
        <h3 className='font-medium'>Agregar item</h3>
        <BillItemForm
          members={members}
          onValid={(item) => onAddItem(uuid, item)}
          onInvalid={() => onInvalidBill(uuid)}
        ></BillItemForm>
      </div>

      <div>
        <RoundedButton
          className='mx-auto bg-red-400 px-4 py-1 text-sm text-white'
          onClick={() => onRemoveBill(uuid)}
        >
          <IconX size={16}></IconX>
          Eliminar boleta
        </RoundedButton>
      </div>
    </Card>
  );
}
