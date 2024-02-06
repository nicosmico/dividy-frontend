import { zodResolver } from '@hookform/resolvers/zod';
import { IconAt, IconAtOff } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
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

interface Props extends React.HTMLAttributes<HTMLFormElement> {
  onSubmitForm: (member: Member) => void;
  resetOnSubmit?: boolean;
  inputsClassName?: string;
  showDetail?: boolean;
  defaultValues?: MemberForm;
}
export function MemberForm({
  children, // To pass button with submit type
  onSubmitForm,
  resetOnSubmit,
  inputsClassName,
  showDetail: defaultShowDetail = false,
  defaultValues,
  ...props
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: defaultValues
      ? memberSchema.parse(defaultValues)
      : undefined,
  });

  const [showDetail, setShowDetail] = useState(defaultShowDetail);

  // useEffect(() => {
  //   if (!showDetail) {
  //     reset({
  //       email: '',
  //       phone: '',
  //     });
  //   }
  // }, [showDetail]);

  const onSubmit: () => void = handleSubmit(({ name, email, phone }) => {
    const id = crypto.randomUUID();
    const member: Member = {
      id,
      name,
      email,
      phone,
      picture: `https://doodleipsum.com/100x100/avatar-4?n=${id}`,
    };
    onSubmitForm(member);
    resetOnSubmit && reset();
  });

  const DetailIcon = showDetail ? IconAtOff : IconAt;

  return (
    <form onSubmit={onSubmit} {...props}>
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
          <InputError errors={errors.name}></InputError>
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
              <InputError errors={errors.email}></InputError>
            </div>

            <div>
              <Input
                label='Teléfono'
                type='phone'
                placeholder='Ej: 989799157'
                register={register('phone')}
                className={inputsClassName}
              />
              <InputError errors={errors.phone}></InputError>
            </div>
          </>
        )}
      </div>
      {children}
    </form>
  );
}
