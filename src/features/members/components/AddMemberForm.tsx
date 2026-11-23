import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addMember, validateMemberName, type Group } from '@/domain';
import {
  isInfrastructureError,
  useGroupOperation,
  useServices,
} from '@/features/groups/data';

export function AddMemberForm({ group }: { group: Group }) {
  const { newId } = useServices();
  const operation = useGroupOperation(group.id);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<{ name: string }>({ defaultValues: { name: '' } });

  const onSubmit = handleSubmit(async ({ name }) => {
    const result = await operation.run((g) =>
      addMember(g, { id: newId(), name })
    );
    if (result.ok) {
      toast.success('Miembro agregado');
      reset();
      setFocus('name');
    } else if (!isInfrastructureError(result.error)) {
      setError('name', { message: result.error.message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormField label='Nombre' error={errors.name?.message}>
        {(control) => (
          <div className='flex gap-2'>
            <Input
              {...control}
              placeholder='Nombre'
              autoComplete='off'
              {...register('name', {
                validate: (value) => {
                  const result = validateMemberName(group, value);
                  return result.ok || result.error.message;
                },
              })}
            />
            <Button
              type='submit'
              variant='secondary'
              disabled={operation.isPending}
              className='shrink-0'
            >
              <Plus /> Agregar
            </Button>
          </div>
        )}
      </FormField>
    </form>
  );
}
