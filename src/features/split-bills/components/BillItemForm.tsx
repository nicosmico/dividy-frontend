import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus } from '@tabler/icons-react';
import { DefaultValues, FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { IconButton, RoundedButton } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { z } from 'zod';
import { SubmitButton } from '../types/forms';
import { Member } from '../types/member';

const ITEM_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  price: z.coerce.number().min(1, 'Debe ser mayor que 0'),
  members: z
    .record(z.string(), z.boolean())
    .refine(
      (members) => Object.values(members).some((checked) => checked === true),
      { message: 'Debes seleccionar al menos un miembro' }
    ),
});
export type TBillItemForm = z.infer<typeof ITEM_FORM_SCHEMA>;

interface Props {
  defaultValues?: DefaultValues<TBillItemForm>;
  members: Member[];
  onValid: (values: TBillItemForm) => void;
  onInvalid?: (values: FieldErrors<TBillItemForm>) => void;
  submitButton?: SubmitButton;
  onCancel?: () => void;
}
export function BillItemForm({
  defaultValues,
  members,
  onValid,
  onInvalid,
  submitButton = SubmitButton.ASIDE_ROUNDED,
  onCancel,
}: Props) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
    watch,
  } = useForm<TBillItemForm>({
    resolver: zodResolver(ITEM_FORM_SCHEMA),
    defaultValues: {
      ...defaultValues,
      members: members.reduce(
        (acc, member) => ({
          ...acc,
          [member.id]: defaultValues?.members?.[member.id] ?? false,
        }),
        {} as Record<string, boolean>
      ),
    },
  });
  const watchMembers = watch('members');
  const watchPrice = watch('price');

  const handleValid = (values: TBillItemForm) => {
    onValid(values);
    reset();
  };

  const selectedMembers = Object.values(watchMembers).filter(
    (checked) => checked
  ).length;
  const totalByMember = selectedMembers ? watchPrice / selectedMembers : 0;

  return (
    <form className='space-y-4' onSubmit={handleSubmit(handleValid, onInvalid)}>
      <div className='flex gap-2'>
        <div className='w-full space-y-2'>
          <div>
            <Input
              type='text'
              label='Nombre'
              register={register('name')}
              className='bg-neutral-100'
            />
            <InputError error={errors.name}></InputError>
          </div>
          <div>
            <Input
              type='number'
              label='Precio'
              register={register('price')}
              className='bg-neutral-100'
            />
            <InputError error={errors.price}></InputError>
          </div>
        </div>
        {submitButton === SubmitButton.ASIDE_ROUNDED && (
          <IconButton
            type='submit'
            className='mt-1 h-min bg-zinc-800 text-white'
          >
            <IconPlus />
          </IconButton>
        )}
      </div>

      <fieldset>
        <legend className='mb-2 text-center text-sm'>
          Selecciona quienes deben dividirse este item:
        </legend>
        <div className='flex flex-wrap justify-center gap-1'>
          {members.map((member) => (
            <label
              className='relative select-none items-center rounded-full border-2 border-neutral-200 px-2 py-1 hover:cursor-pointer has-[:checked]:border-amber-200 has-[:checked]:bg-amber-200'
              key={member.id}
            >
              <input
                className='appearance-none'
                type='checkbox'
                {...register(`members.${member.id}`)}
              />
              {member.name}
            </label>
          ))}
        </div>
        {!selectedMembers && <InputError error={errors.members}></InputError>}
      </fieldset>

      <div className='flex justify-between text-xs font-medium'>
        <div>Dividido entre: {selectedMembers}</div>
        <div>Total a pagar C/U: {formatToCurrency(totalByMember)}</div>
      </div>

      {submitButton === SubmitButton.BOTTOM_SAVE_CANCEL && (
        <div className='mt-4 flex justify-end gap-2'>
          <RoundedButton
            className='w-full bg-neutral-100 hover:bg-red-400 hover:text-white md:w-fit'
            onClick={onCancel}
          >
            Cancelar
          </RoundedButton>
          <RoundedButton
            type='submit'
            className='w-full bg-zinc-900 text-white md:w-fit'
          >
            Guardar
          </RoundedButton>
        </div>
      )}
    </form>
  );
}
