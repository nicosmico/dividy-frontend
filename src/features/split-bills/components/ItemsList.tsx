import { IconUser, IconX } from '@tabler/icons-react';
import { IconButton } from 'src/components/ui';

export function ItemsList() {
  return (
    <ul>
      <li className='flex justify-between gap-4'>
        <div>
          <span>Coca-Cola 2L</span>
          <div className='flex gap-1 text-sm font-medium'>
            <div className='flex items-center'>
              3 <IconUser size={16} stroke={3} />
            </div>
            <span>-</span>
            <span>$2.300</span>
          </div>
        </div>

        <IconButton className='h-fit px-1 py-1 text-red-400 md:hover:bg-red-400 md:hover:text-white'>
          <IconX></IconX>
        </IconButton>
      </li>
    </ul>
  );
}

export default ItemsList;
