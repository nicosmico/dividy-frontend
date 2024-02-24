import { IconUser, IconX } from '@tabler/icons-react';
import { IconButton } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { BillItem } from '../types/bill';

interface Props {
  items: BillItem[];
  onRemoveItem: (uuid: string) => void;
}
export function ItemsList({ items, onRemoveItem }: Props) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.uuid} className='flex justify-between gap-4'>
          <div>
            <span>{item.name}</span>
            <div className='flex gap-1 text-sm font-medium'>
              <div className='flex items-center'>
                3 <IconUser size={16} stroke={3} />
              </div>
              <span>-</span>
              <span>{formatToCurrency(item.price)}</span>
            </div>
          </div>

          <IconButton
            className='h-fit px-1 py-1 text-red-400 md:hover:bg-red-400 md:hover:text-white'
            type='submit'
            onClick={() => onRemoveItem(item.uuid)}
          >
            <IconX></IconX>
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

export default ItemsList;
