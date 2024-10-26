import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { Card, IconButton, RoundedButton } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { Bill } from '../types/bill';
import { Member } from '../types/member';

interface Props {
  id: string;
  bill?: Bill;
  members: Member[];
  onDelete: (billId: string) => void;
}
export function BillCard({ id, bill, members, onDelete }: Props) {
  // const [name, setName] = useState<string>(bill?.name ?? 'Boleta');

  // const debounceOnBillChange = useMemo(
  //   () =>
  //     debounce((id: string, values: TBillForm) => {
  //       onBillChange(id, values);
  //     }, 300),
  //   [onBillChange]
  // );

  return (
    <Card className='space-y-4 *:pt-4'>
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
          <h1 className='text-sm font-medium'>Name here</h1>
        </div>
        <IconButton className='p-0'>
          <IconChevronDown size={28}></IconChevronDown>
        </IconButton>
      </div>

      {/* Bill form */}
      {/* <BillForm
        defaultValues={{
          name: bill?.name,
          paidBy: bill?.paidBy,
        }}
        members={members}
        onValid={handleValidBill}
        onInvalid={() => onInvalidBill(id)}
      ></BillForm> */}

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
    </Card>
  );
}
