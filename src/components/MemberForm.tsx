import { IconAt, IconAtOff, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from 'src/components';
import { RoundedButton } from 'src/components/ui';

export function MemberForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [showDetail, setShowDetail] = useState(false);

  const onSubmit: () => void = handleSubmit(({ name, email, phone }) => {
    const member = {
      name,
      email: showDetail ? email : undefined,
      phone: showDetail ? phone : undefined,
    };
    console.log(member);
  });

  return (
    <form onSubmit={onSubmit} className='flex gap-2'>
      <div className='flex-grow space-y-2'>
        <Input
          type='text'
          label='Nombre'
          register={register('name', {
            required: {
              value: true,
              message: 'Este campo es requerido',
            },
            minLength: {
              value: 2,
              message: 'Debe tener al menos 2 caracteres',
            },
          })}
          errors={errors}
          icon={
            showDetail ? (
              <IconAtOff className='text-gray-800'></IconAtOff>
            ) : (
              <IconAt className='text-gray-800'></IconAt>
            )
          }
          onIconClick={() => setShowDetail(!showDetail)}
        />

        {showDetail && (
          <>
            <Input
              label='Email'
              type='email'
              placeholder='Ej: nicolas@gmail.com'
              register={register('email', {
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: 'Email inválido',
                },
              })}
              errors={errors}
            />

            <Input
              label='Teléfono'
              type='phone'
              placeholder='Ej: 989799157'
              register={register('phone', {
                minLength: {
                  value: 9,
                  message: 'Debe tener al menos 9 caracteres',
                },
              })}
              errors={errors}
            />
          </>
        )}
      </div>

      <RoundedButton
        type='submit'
        className='mt-1 h-min bg-gray-900 text-white'
      >
        <IconPlus />
      </RoundedButton>
    </form>
  );
}

export default MemberForm;
