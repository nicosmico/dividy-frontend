import { zodResolver } from '@hookform/resolvers/zod';
import { DefaultValues, FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError, Select } from 'src/components/form';
import { z } from 'zod';
import { Member } from '../types/member';

const BILL_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  total: z.coerce.number().min(1, 'Debe ser mayor que 0'),
  paidBy: z.string().min(1, 'Ingresa quién hizo esta compra'),
  // members: z.array(z.string()),
});
export type BillFormValues = z.infer<typeof BILL_FORM_SCHEMA>;

interface Props {
  defaultValues?: DefaultValues<BillFormValues>;
  members: Member[];
  onValid: (values: BillFormValues) => void;
  onInvalid: (values: FieldErrors<BillFormValues>) => void;
}
export function BillForm({
  defaultValues,
  members,
  onValid,
  onInvalid,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BillFormValues>({
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
        <InputError error={errors.name}></InputError>
      </div>
      <div>
        <Input
          type='text'
          label='Precio'
          register={register('total')}
          className='bg-neutral-100'
        />
        <InputError error={errors.total}></InputError>
      </div>
      <div>
        <Select
          label='Pagado por'
          register={register('paidBy')}
          className='bg-neutral-100'
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
        <InputError error={errors.paidBy}></InputError>
      </div>
    </form>
  );
}
