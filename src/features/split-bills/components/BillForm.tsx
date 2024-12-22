import { zodResolver } from '@hookform/resolvers/zod';
import {
  DefaultValues,
  FieldError,
  FieldErrors,
  useForm,
} from 'react-hook-form';
import { formatToCurrency, Input, InputError, Select } from 'src/shared';
import { debounce } from 'src/shared/utils/debounce';
import { z } from 'zod';
import { Member } from '../types/member';

const BILL_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  total: z
    .number({ invalid_type_error: 'Debe ser mayor que 0' })
    .positive('Debe ser mayor que 0'),
  paidBy: z.string().min(1, 'Ingresa quién hizo esta compra'),
  members: z.array(z.string()).min(1, 'Debes seleccionar al menos un miembro'),
});
export type BillFormValues = z.infer<typeof BILL_FORM_SCHEMA>;

interface Props {
  defaultValues?: DefaultValues<BillFormValues>;
  members: Member[];
  onValid: (values: BillFormValues) => void;
  onInvalid: (errors: FieldErrors<BillFormValues>) => void;
}
export function BillForm({
  members,
  onValid,
  onInvalid,
  defaultValues,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<BillFormValues>({
    resolver: zodResolver(BILL_FORM_SCHEMA),
    defaultValues,
    shouldFocusError: false,
  });

  const handleChange = debounce(() => {
    handleSubmit(onValid, onInvalid)();
  }, 100);

  const selectedMembers = watch('members');
  const totalByMember = watch('total') / selectedMembers.length;

  return (
    <>
      <form className='space-y-2'>
        <div>
          <Input
            type='text'
            label='Nombre compra'
            register={register('name', { onChange: handleChange })}
            className='bg-neutral-100'
          />
          <InputError error={errors.name}></InputError>
        </div>
        <div>
          <Input
            type='number'
            label='Precio'
            inputMode='numeric'
            register={register('total', {
              onChange: handleChange,
              valueAsNumber: true,
            })}
            className='bg-neutral-100'
          />
          <InputError error={errors.total}></InputError>
        </div>
        <div>
          <Select
            label='Pagado por'
            register={register('paidBy', { onChange: handleChange })}
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

        <fieldset>
          <legend className='mb-2 ml-3 text-sm'>Dividir entre:</legend>
          <div className='flex flex-wrap justify-center gap-1'>
            {members.map((member) => (
              <label
                className='flex w-full select-none justify-between gap-1 rounded-full border-2 border-neutral-200 px-3 py-3 hover:cursor-pointer has-[:checked]:border-amber-200 has-[:checked]:bg-amber-200 md:px-2 md:py-1'
                key={member.id}
              >
                <span>
                  <input
                    className='mr-1 accent-zinc-800'
                    type='checkbox'
                    value={member.id}
                    {...register('members', { onChange: handleChange })}
                  />
                  {member.name}
                </span>

                {selectedMembers.includes(member.id) &&
                  formatToCurrency(totalByMember)}
              </label>
            ))}
          </div>
          {<InputError error={errors.members as FieldError}></InputError>}
        </fieldset>
      </form>
    </>
  );
}
