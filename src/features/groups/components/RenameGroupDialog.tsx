import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { renameGroup, validateGroupName, type Group } from '@/domain';
import { isInfrastructureError, useGroupOperation } from '../data';

interface RenameGroupDialogProps {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameGroupDialog({
  group,
  open,
  onOpenChange,
}: RenameGroupDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Renombrar grupo'
    >
      <RenameGroupForm group={group} onDone={() => onOpenChange(false)} />
    </ResponsiveDialog>
  );
}

function RenameGroupForm({
  group,
  onDone,
}: {
  group: Group;
  onDone: () => void;
}) {
  const operation = useGroupOperation(group.id);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ name: string }>({ defaultValues: { name: group.name } });

  const onSubmit = handleSubmit(async ({ name }) => {
    const result = await operation.run((g) => renameGroup(g, name));
    if (result.ok) {
      toast.success('Grupo renombrado');
      onDone();
    } else if (!isInfrastructureError(result.error)) {
      setError('name', { message: result.error.message });
    }
  });

  return (
    <form onSubmit={onSubmit} className='grid gap-4' noValidate>
      <FormField label='Nombre del grupo' error={errors.name?.message}>
        {(control) => (
          <Input
            {...control}
            autoComplete='off'
            {...register('name', {
              validate: (value) => {
                const result = validateGroupName(value);
                return result.ok || result.error.message;
              },
            })}
          />
        )}
      </FormField>
      <ResponsiveDialogFooter>
        <Button type='button' variant='outline' onClick={onDone}>
          Cancelar
        </Button>
        <Button type='submit' disabled={operation.isPending}>
          Guardar
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}
