import { IconBottle, IconChevronDown, IconX } from '@tabler/icons-react';
import { UseFormRegister } from 'react-hook-form';
import { Input, Select } from 'src/components/form';
import { Divider, IconButton, RoundedButton } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { BillForm, BillForms } from '../schemas/bills';
import { BillItemForm, ItemForm } from './BillItemForm';
import ItemsList from './ItemsList';

interface Props {
  index: number;
  register: UseFormRegister<BillForms>;
  value: BillForm;
  onDelete: () => void;
}
export function BillFormItem({ index, register, value, onDelete }: Props) {
  const onAddItem = (item: ItemForm) => {
    console.log(item);
  };

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
            register={register(`bills.${index}.name`)}
            className='bg-neutral-100'
          />
        </div>
        <div>
          <Select
            label='Pagado por'
            register={register(`bills.${index}.paidBy`)}
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
      <div className='space-y-2'>
        <h3 className='font-medium'>Agregar item</h3>
        <BillItemForm onSubmit={onAddItem}></BillItemForm>
      </div>
      <Divider />

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
