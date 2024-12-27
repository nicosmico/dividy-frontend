import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import { Card, RoundedButton } from 'src/shared';
import { formatToCurrency } from 'src/shared/utils/format-to';
import { Bill } from '../types/bill';
import { Member } from '../types/member';
import { BillForm, BillFormValues } from './BillForm';

interface Props {
  bill: Partial<Bill>;
  members: Member[];
  onValueChange: (values: BillFormValues) => void;
  onDelete: () => void;
  open?: boolean;
}
export function BillCard({
  bill,
  members,
  onValueChange,
  onDelete,
  open,
}: Props) {
  const handleValidBill = (values: BillFormValues) => {
    onValueChange(values);
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

  const paidBy = members.find((m) => m.id === bill.paidBy);

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
                <span className='text-lg font-medium'>
                  {formatToCurrency(bill.total)}
                </span>
              )}
              <div className='flex items-center gap-1'>
                {!!bill?.members?.length && (
                  <span className='rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-white'>
                    {paidBy?.name}
                  </span>
                )}
                <span className='text-sm font-medium'>
                  {bill?.name ?? 'Nuevo gasto'}
                </span>
              </div>
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

        <RoundedButton
          className='mx-auto bg-red-400 px-4 py-1 text-sm text-white'
          onClick={() => onDelete()}
        >
          <IconX size={16}></IconX>
          Eliminar
        </RoundedButton>
      </details>
    </Card>
  );
}
