import { zodResolver } from '@hookform/resolvers/zod';
import { IconAt, IconAtOff, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { IconButton, RoundedButton } from 'src/components/ui';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';
import { SubmitButton } from '../types/forms';

const formSchema = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  email: z
    .string()
    .email('Email con formato inválido')
    .optional()
    .or(z.literal(''))
    .transform((value) => (!value ? undefined : value)),
  phone: z
    .string()
    .min(9, 'Debe tener al menos 9 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((value) => (!value ? undefined : value)),
});
export type TMemberForm = z.infer<typeof formSchema>;

interface Props {
  onValid: (member: TMemberForm) => void;
  resetOnSubmit?: boolean;
  inputsClassName?: string;
  showDetail?: boolean;
  defaultValues?: TMemberForm;
  submitButton?: SubmitButton;
  onCancel?: () => void;
}
export function MemberForm({
  defaultValues,
  onValid,
  resetOnSubmit,
  showDetail: defaultShowDetail = false,
  inputsClassName,
  submitButton = SubmitButton.ASIDE_ROUNDED,
  onCancel,
}: Props) {
  const [showDetail, setShowDetail] = useState(defaultShowDetail);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TMemberForm>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleValid = (memberValues: TMemberForm) => {
    onValid(memberValues);
    resetOnSubmit && reset();
  };

  const handleInvalid = ({ email, phone }: FieldErrors<TMemberForm>) => {
    if (email || phone) {
      setShowDetail(true);
    }
  };

  const DetailIcon = showDetail ? IconAtOff : IconAt;
  const formClassNames = {
    [SubmitButton.ASIDE_ROUNDED]: 'flex gap-2',
    [SubmitButton.BOTTOM_SAVE_CANCEL]: 'space-y-4',
  };

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className={twMerge(formClassNames[submitButton])}
    >
      <div className='w-full space-y-2'>
        <div>
          <Input
            type='text'
            label='Nombre'
            register={register('name')}
            icon={<DetailIcon className='text-zinc-900' />}
            onIconClick={() => setShowDetail(!showDetail)}
            className={inputsClassName}
          />
          <InputError error={errors.name}></InputError>
        </div>
        {showDetail && (
          <>
            <div>
              <Input
                label='Email'
                type='email'
                placeholder='Ej: nicolas@gmail.com'
                register={register('email')}
                className={inputsClassName}
              />
              <InputError error={errors.email}></InputError>
            </div>

            <div>
              <Input
                label='Teléfono'
                type='phone'
                placeholder='Ej: 989799157'
                register={register('phone')}
                className={inputsClassName}
              />
              <InputError error={errors.phone}></InputError>
            </div>
          </>
        )}
      </div>

      {submitButton === SubmitButton.ASIDE_ROUNDED && (
        <IconButton type='submit' className='mt-1 h-min bg-zinc-800 text-white'>
          <IconPlus />
        </IconButton>
      )}

      {submitButton === SubmitButton.BOTTOM_SAVE_CANCEL && (
        <div className='flex justify-end gap-2'>
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
