import { IconPencil, IconUser, IconX } from '@tabler/icons-react';
import { IconButton } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { BillItem } from '../types/bill';

interface Props {
  items: BillItem[];
  onRemoveItem: (id: string) => void;
  onEditItem: (id: string) => void;
}
export function ItemsList({ items, onRemoveItem, onEditItem }: Props) {
  return (
    <ul className='ml-2 space-y-2 divide-y divide-dotted'>
      {items.map((item) => (
        <li key={item.id} className='flex justify-between gap-4'>
          <div>
            <span>{item.name}</span>
            <div className='flex gap-1 text-xs font-medium'>
              <div className='flex items-center'>
                <IconUser size={12} stroke={3} /> {item.members.length}
              </div>
              <span>-</span>
              <span>
                {formatToCurrency(item.price / item.members.length)} c/u
              </span>
            </div>
          </div>

          <div className='flex items-center gap-1'>
            <span className='text-sm'>{formatToCurrency(item.price)}</span>
            <IconButton
              className='h-fit px-1 py-1 text-zinc-900 md:hover:bg-zinc-900 md:hover:text-white'
              type='button'
              onClick={() => onEditItem(item.id)}
            >
              <IconPencil></IconPencil>
            </IconButton>
            <IconButton
              className='h-fit px-1 py-1 text-red-400 md:hover:bg-red-400 md:hover:text-white'
              type='button'
              onClick={() => onRemoveItem(item.id)}
            >
              <IconX></IconX>
            </IconButton>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default ItemsList;
