import { zodResolver } from '@hookform/resolvers/zod';
import {
  IconBottle,
  IconChevronDown,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { Card, Divider, IconButton, RoundedButton } from 'src/components/ui';
import { z } from 'zod';
import ItemForm from './ItemForm';
import ItemsList from './ItemsList';

const formSchema = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  paidBy: z.string().min(1, 'Debes ingresar un nombre'),
});

export function BillCard() {
  const {
    register,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
  });

  return (
    <Card className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='aspect-square rounded-full bg-red-400 p-3 text-white'>
          <IconBottle />
        </div>
        <div className='w-full'>
          <h2 className='text-lg font-medium'>$32.594</h2>
          <h1 className='text-sm font-medium'>Boleta 1</h1>
        </div>
        <IconButton className='bg-zinc-900 px-2 py-0 text-white'>
          <IconChevronDown></IconChevronDown>
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
          <InputError errors={errors.name}></InputError>
        </div>
        <div>
          <Input
            type='text'
            label='Pagado por'
            register={register('paidBy')}
            className='bg-neutral-100'
          />
          <InputError errors={errors.paidBy}></InputError>
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
        <ItemForm className='flex gap-2'>
          <IconButton
            type='submit'
            className='mt-1 h-min bg-zinc-800 text-white'
          >
            <IconPlus />
          </IconButton>
        </ItemForm>
      </div>
      <Divider />

      <RoundedButton className='mx-auto bg-red-400 px-4 py-1 text-sm text-white'>
        <IconX size={16}></IconX>
        Eliminar boleta
      </RoundedButton>
    </Card>
  );
}

export default BillCard;
