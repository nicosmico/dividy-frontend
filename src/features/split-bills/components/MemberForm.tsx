import { zodResolver } from '@hookform/resolvers/zod';
import { IconAt, IconAtOff, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { IconButton } from 'src/components/ui';
import { Member } from 'src/models/Member';
import { z } from 'zod';

const memberSchema = z.object({
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
type MemberForm = z.infer<typeof memberSchema>;

interface Props {
  onSubmit: (member: Member) => void;
}
export function MemberForm({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
  });
  const [showDetail, setShowDetail] = useState(false);

  const _onSubmit: () => void = handleSubmit(({ name, email, phone }) => {
    const member: Member = {
      id: crypto.randomUUID(),
      name,
      email: showDetail ? email : undefined,
      phone: showDetail ? phone : undefined,
    };
    onSubmit(member);
    reset();
  });

  const DetailIcon = showDetail ? IconAtOff : IconAt;

  return (
    <form onSubmit={_onSubmit} className='space-y-4'>
      <div className='flex gap-2'>
        <div className='w-full'>
          <Input
            type='text'
            label='Nombre'
            register={register('name')}
            icon={<DetailIcon className='text-zinc-900' />}
            onIconClick={() => setShowDetail(!showDetail)}
          />
          <InputError errors={errors.name}></InputError>
        </div>
        <IconButton type='submit' className='mt-1 h-min bg-zinc-800 text-white'>
          <IconPlus />
        </IconButton>
      </div>

      {showDetail && (
        <>
          <div>
            <Input
              label='Email'
              type='email'
              placeholder='Ej: nicolas@gmail.com'
              register={register('email')}
            />
            <InputError errors={errors.email}></InputError>
          </div>

          <div>
            <Input
              label='Teléfono'
              type='phone'
              placeholder='Ej: 989799157'
              register={register('phone')}
            />
            <InputError errors={errors.phone}></InputError>
          </div>
        </>
      )}
    </form>
  );
}
