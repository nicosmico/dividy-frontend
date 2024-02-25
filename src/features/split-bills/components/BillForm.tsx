import { zodResolver } from '@hookform/resolvers/zod';
import { DefaultValues, FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError, Select } from 'src/components/form';
import { z } from 'zod';
import { Member } from '../types/member';

const BILL_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  paidBy: z.string().min(1, 'Ingresa quién hizo esta compra'),
});
export type TBillForm = z.infer<typeof BILL_FORM_SCHEMA>;

interface Props {
  defaultValues?: DefaultValues<TBillForm>;
  members: Member[];
  onValid: (values: TBillForm) => void;
  onInvalid: (values: FieldErrors<TBillForm>) => void;
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
  } = useForm<TBillForm>({
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
        <InputError errors={errors.name}></InputError>
      </div>
      <div>
        <Select
          label='Pagado por'
          register={register('paidBy')}
          className='bg-neutral-100'
        >
          {members.map((member) => (
            <option key={member.uuid} value={member.uuid}>
              {member.name}
            </option>
          ))}
        </Select>
        <InputError errors={errors.paidBy}></InputError>
      </div>
    </form>
  );
}
