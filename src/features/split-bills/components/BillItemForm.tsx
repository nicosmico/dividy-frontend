import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus } from '@tabler/icons-react';
import { FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { IconButton } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { z } from 'zod';
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
  members: Member[];
  onValid: (values: TBillItemForm) => void;
  onInvalid: (values: FieldErrors<TBillItemForm>) => void;
}
export function BillItemForm({ members, onValid, onInvalid }: Props) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
    watch,
  } = useForm<TBillItemForm>({
    resolver: zodResolver(ITEM_FORM_SCHEMA),
    defaultValues: {
      members: members.reduce(
        // TODO: Modify this when use form to edit
        (acc, member) => ({ ...acc, [member.uuid]: false }),
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
    <div className='space-y-4'>
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

      {/* TODO: Move this to a component */}
      <fieldset>
        <legend className='mb-2 text-center text-sm'>
          Selecciona quienes deben dividirse este item:
        </legend>
        <div className='flex flex-wrap justify-center gap-2'>
          {members.map((member) => (
            <label
              className='relative select-none items-center rounded-full border-2 border-zinc-900 px-2 py-1 has-[:checked]:border-amber-200 has-[:checked]:bg-amber-200'
              key={member.uuid}
            >
              <input
                className='appearance-none'
                type='checkbox'
                {...register(`members.${member.uuid}`)}
              />
              {member.name}
            </label>
          ))}
        </div>
        {!selectedMembers && <InputError errors={errors.members}></InputError>}
      </fieldset>

      <div className='flex justify-between text-xs font-medium'>
        <div>Dividido entre: {selectedMembers}</div>
        <div>Total a pagar C/U: {formatToCurrency(totalByMember)}</div>
      </div>
    </div>
  );
}
