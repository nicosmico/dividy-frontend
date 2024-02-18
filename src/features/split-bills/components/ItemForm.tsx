import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input, InputError } from 'src/components/form';
import { BillItem } from 'src/features/split-bills/types/bill';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(1, 'Debes ingresar un nombre'),
  price: z.number().min(1, 'Debes ingresar un precio'),
});
type ItemForm = z.infer<typeof formSchema>;

interface Props extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmitForm: (member: BillItem) => void;
  resetOnSubmit?: boolean;
  defaultValues?: ItemForm;
}
export function ItemForm({
  children, // To pass button with submit type
  onSubmitForm,
  resetOnSubmit,
  defaultValues,
  ...props
}: Props) {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))} {...props}>
      <div className='space-y-2'>
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
      {children}
    </form>
  );
}

export default ItemForm;
