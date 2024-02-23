import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus } from '@tabler/icons-react';
import { FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { IconButton } from 'src/components/ui';
import { z } from 'zod';

const ITEM_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  price: z.coerce.number().min(1, 'Debe ser mayor que 0'),
});
export type TBillItemForm = z.infer<typeof ITEM_FORM_SCHEMA>;

interface Props {
  onValid: (values: TBillItemForm) => void;
  onInvalid: (values: FieldErrors<TBillItemForm>) => void;
}
export function BillItemForm({ onValid, onInvalid }: Props) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<TBillItemForm>({
    resolver: zodResolver(ITEM_FORM_SCHEMA),
  });

  const handleValid = (values: TBillItemForm) => {
    onValid(values);
    reset();
  };

  return (
    <form
      className='flex gap-2'
      onSubmit={handleSubmit(handleValid, onInvalid)}
    >
      <div className='w-full space-y-2'>
        <div>
          <Input
            type='text'
            label='Nombre'
            register={register('name')}
            className='bg-neutral-100'
          />
          <InputError errors={errors.name}></InputError>
        </div>
        <div>
          <Input
            type='number'
            label='Precio'
            register={register('price')}
            className='bg-neutral-100'
          />
          <InputError errors={errors.price}></InputError>
        </div>
      </div>
      <IconButton type='submit' className='mt-1 h-min bg-zinc-800 text-white'>
        <IconPlus />
      </IconButton>
    </form>
  );
}
