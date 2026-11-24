import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAX_MEMBER_NAME_LENGTH,
  regenerateMemberAvatar,
  renameMember,
  validateMemberName,
  type Group,
  type Member,
} from '@/domain';
import {
  isInfrastructureError,
  useGroupOperation,
  useServices,
} from '@/features/groups/data';
import { useMemberMoods } from './member-moods';
import { MemberAvatar } from './MemberAvatar';

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
      title='Editar miembro'
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
  const { newId } = useServices();
  const mood = useMemberMoods(group).get(member.id);
  // Preview only: the new face is saved with "Guardar" and dropped on cancel.
  const [previewSeed, setPreviewSeed] = useState<string | null>(null);
  const previewMember = previewSeed
    ? { ...member, avatar: { ...member.avatar, seed: previewSeed } }
    : member;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ name: string }>({ defaultValues: { name: member.name } });
  const draftName = useWatch({ control, name: 'name' });

  const onSubmit = handleSubmit(async ({ name }) => {
    const result = await operation.run((g) => {
      const renamed = renameMember(g, member.id, name);
      if (!renamed.ok || previewSeed === null) return renamed;
      return regenerateMemberAvatar(renamed.value, member.id, previewSeed);
    });
    if (result.ok) {
      toast.success('Miembro actualizado');
      onDone();
    } else if (!isInfrastructureError(result.error)) {
      setError('name', { message: result.error.message });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className='grid grid-cols-[minmax(0,1fr)] gap-4'
      noValidate
    >
      <div className='relative mx-auto size-24'>
        <MemberAvatar
          member={previewMember}
          mood={mood}
          decorative
          className='size-24'
        />
        <Button
          type='button'
          variant='secondary'
          size='icon'
          aria-label='Generar otra cara'
          onClick={() => setPreviewSeed(newId())}
          className='absolute -right-1 -bottom-1 size-11 border border-border shadow-soft'
        >
          <RefreshCw />
        </Button>
      </div>
      <FormField
        label='Nombre'
        error={errors.name?.message}
        counter={{ length: draftName.length, max: MAX_MEMBER_NAME_LENGTH }}
      >
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
