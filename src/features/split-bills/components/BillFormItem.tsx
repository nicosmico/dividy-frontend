import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Input, Select } from 'src/components/form';
import { Divider, IconButton, RoundedButton } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { BillForm } from '../schemas/bills';
import ItemsList from './ItemsList';

interface Props {
  register: (name: keyof BillForm) => UseFormRegisterReturn<string>;
  value: BillForm;
  onDelete: () => void;
}
export function BillFormItem({ register, value, onDelete }: Props) {
  return (
    <>
      <div className='flex items-center justify-between gap-2'>
        <div className='aspect-square rounded-full bg-red-400 p-3 text-white'>
          <IconBottle />
        </div>
        <div className='w-full'>
          <h2 className='text-lg font-medium'>
            {formatToCurrency(value.total)}
          </h2>
          <h1 className='text-sm font-medium'>{value.name}</h1>
        </div>
        <IconButton className='p-0'>
          <IconChevronDown size={28}></IconChevronDown>
        </IconButton>
      </div>

      {/* Bill form */}
      <div className='space-y-2'>
        <div>
          <Input
            type='text'
            label='Nombre compra'
            register={register('name')}
            className='bg-neutral-100'
          />
        </div>
        <div>
          <Select
            label='Pagado por'
            register={register('paidBy')}
            className='bg-neutral-100'
          >
            <option value='1'>Nico</option>
            <option value='2'>Manuel</option>
            <option value='3'>Alejandra</option>
          </Select>
        </div>
      </div>
      <Divider />

      {/* Detail */}
      <div className='space-y-2'>
        <h3 className='font-medium'>Detalle</h3>
        <ItemsList />
      </div>
      <Divider />

      {/* Item form */}
      {/* <div className='space-y-2'>
        <h3 className='font-medium'>Agregar item</h3>
        <ItemForm className='flex gap-2'>
          <IconButton
            type='submit'
            className='mt-1 h-min bg-zinc-800 text-white'
          >
            <IconPlus />
          </IconButton>
        </ItemForm>
      </div>
      <Divider /> */}

      <RoundedButton
        className='mx-auto bg-red-400 px-4 py-1 text-sm text-white'
        onClick={() => onDelete()}
      >
        <IconX size={16}></IconX>
        Eliminar boleta
      </RoundedButton>
    </>
  );
}

export default BillFormItem;
