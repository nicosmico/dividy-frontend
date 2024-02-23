import { zodResolver } from '@hookform/resolvers/zod';
import { FieldErrors, useForm } from 'react-hook-form';
import { Input, Select } from 'src/components/form';
import { z } from 'zod';

const BILL_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  paidBy: z.string().min(1, 'Ingresa quién hizo esta compra'),
});
export type TBillForm = z.infer<typeof BILL_FORM_SCHEMA>;

interface Props {
  defaultValues?: TBillForm;
  onValid: (values: TBillForm) => void;
  onInvalid: (values: FieldErrors<TBillForm>) => void;
}
export function BillForm({ defaultValues, onValid, onInvalid }: Props) {
  const { register, handleSubmit } = useForm<TBillForm>({
    resolver: zodResolver(BILL_FORM_SCHEMA),
    defaultValues,
  });

  return (
    <form
      className='space-y-2'
      onChange={handleSubmit(onValid, onInvalid)}
      onSubmit={handleSubmit(onValid, onInvalid)}
    >
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
    </form>
  );
}
