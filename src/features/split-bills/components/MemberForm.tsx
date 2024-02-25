import { zodResolver } from '@hookform/resolvers/zod';
import { IconAt, IconAtOff } from '@tabler/icons-react';
import React, { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { z } from 'zod';

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

interface Props extends React.HTMLAttributes<HTMLFormElement> {
  onValid: (member: TMemberForm) => void;
  resetOnSubmit?: boolean;
  inputsClassName?: string;
  showDetail?: boolean;
  defaultValues?: TMemberForm;
}
export function MemberForm({
  children, // To pass button with submit type
  onValid,
  resetOnSubmit,
  inputsClassName,
  showDetail: defaultShowDetail = false,
  defaultValues,
  ...props
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

  return (
    <form onSubmit={handleSubmit(handleValid, handleInvalid)} {...props}>
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
      {children}
    </form>
  );
}
