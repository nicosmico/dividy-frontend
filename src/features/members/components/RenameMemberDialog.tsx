import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  renameMember,
  validateMemberName,
  type Group,
  type Member,
} from '@/domain';
import {
  isInfrastructureError,
  useGroupOperation,
} from '@/features/groups/data';

interface RenameMemberDialogProps {
  group: Group;
  /** The member being renamed; `null` keeps the dialog closed. */
  member: Member | null;
  onClose: () => void;
}

export function RenameMemberDialog({
  group,
  member,
  onClose,
}: RenameMemberDialogProps) {
  return (
    <ResponsiveDialog
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
      title='Renombrar miembro'
    >
      {member && (
        <RenameMemberForm
          key={member.id}
          group={group}
          member={member}
          onDone={onClose}
        />
      )}
    </ResponsiveDialog>
  );
}

function RenameMemberForm({
  group,
  member,
  onDone,
}: {
  group: Group;
  member: Member;
  onDone: () => void;
}) {
  const operation = useGroupOperation(group.id);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ name: string }>({ defaultValues: { name: member.name } });

  const onSubmit = handleSubmit(async ({ name }) => {
    const result = await operation.run((g) => renameMember(g, member.id, name));
    if (result.ok) {
      toast.success('Miembro renombrado');
      onDone();
    } else if (!isInfrastructureError(result.error)) {
      setError('name', { message: result.error.message });
    }
  });

  return (
    <form onSubmit={onSubmit} className='grid gap-4' noValidate>
      <FormField label='Nombre' error={errors.name?.message}>
        {(control) => (
          <Input
            {...control}
            autoComplete='off'
            {...register('name', {
              validate: (value) => {
                const result = validateMemberName(group, value, member.id);
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
