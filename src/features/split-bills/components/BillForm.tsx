import { zodResolver } from '@hookform/resolvers/zod';
import { DefaultValues, FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError, Select } from 'src/components/form';
import { debounce } from 'src/utils/debounce';
import { z } from 'zod';
import { Member } from '../types/member';

const BILL_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  total: z.number().min(1, 'Debe ser mayor que 0'),
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
  } = useForm<BillFormValues>({
    resolver: zodResolver(BILL_FORM_SCHEMA),
    defaultValues,
    shouldFocusError: false,
  });

  const handleChange = debounce(() => {
    console.log('Form change');
    handleSubmit(onValid, onInvalid)();
  }, 100);

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
          <legend className='mb-2 text-center text-sm'>
            Selecciona quienes deben dividirse este item:
          </legend>
          <div className='flex flex-wrap justify-center gap-1'>
            {members.map((member) => (
              <label
                // className='relative select-none items-center rounded-full border-2 border-neutral-200 px-2 py-1 hover:cursor-pointer has-[:checked]:border-amber-200 has-[:checked]:bg-amber-200'
                key={member.id}
              >
                <input
                  // className='appearance-none'
                  type='checkbox'
                  value={member.id}
                  {...register('members', { onChange: handleChange })}
                />
                {member.name}
              </label>
            ))}
          </div>
          {/* {!selectedMembers && <InputError error={errors.members}></InputError>} */}
        </fieldset>
      </form>
      {/* <div className='flex justify-between text-xs font-medium'>
        <div>Dividido entre: {selectedMembers}</div>
        <div>Total a pagar C/U: {formatToCurrency(totalByMember)}</div>
      </div> */}
    </>
  );
}
