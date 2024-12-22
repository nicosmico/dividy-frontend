import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import { Card, RoundedButton } from 'src/shared';
import { formatToCurrency } from 'src/shared/utils/format-to';
import { Bill } from '../types/bill';
import { Member } from '../types/member';
import { BillForm, BillFormValues } from './BillForm';

interface Props {
  id: string;
  bill?: Bill;
  members: Member[];
  onValueChange: (billId: string, values: Partial<Bill>) => void;
  onDelete: (billId: string) => void;
  open?: boolean;
}
export function BillCard({
  id,
  bill,
  members,
  onValueChange,
  onDelete,
  open,
}: Props) {
  const handleValidBill = (values: BillFormValues) => {
    onValueChange(id, values);
  };

  const defaultFormValues = useMemo(() => {
    if (!bill) return undefined;

    return {
      name: bill.name,
      paidBy: bill.paidBy,
      total: bill.total,
      members: bill.members,
    };
  }, [bill]);

  return (
    <Card className='p-4 shadow-sm'>
      <details className='group space-y-4' open={open}>
        <summary className='select-none'>
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
              <h1 className='text-sm font-medium'>{bill?.name}</h1>
            </div>
            <div className='transform transition-transform duration-300 group-open:rotate-180'>
              <IconChevronDown size={28}></IconChevronDown>
            </div>
          </div>
        </summary>

        <BillForm
          defaultValues={defaultFormValues}
          members={members}
          onValid={handleValidBill}
          onInvalid={console.warn}
        ></BillForm>

        <div>
          {bill && (
            <RoundedButton
              className='mx-auto bg-red-400 px-4 py-1 text-sm text-white'
              onClick={() => onDelete(bill.id)}
            >
              <IconX size={16}></IconX>
              Eliminar boleta
            </RoundedButton>
          )}
        </div>
      </details>
    </Card>
  );
}
