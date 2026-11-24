import { Plus, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EntityIcon } from '@/features/icons';
import { AvatarButton } from '@/features/members';
import {
  MAX_GROUP_NAME_LENGTH,
  MAX_MEMBER_NAME_LENGTH,
  validateGroupName,
  nextAvatarColor,
  validateMemberName,
  type NewMemberInput,
} from '@/domain';
import { isInfrastructureError, useCreateGroup, useServices } from '../data';

const MIN_MEMBERS = 2;

/** A member of the form: the id exists from the start so the face can be shown. */
interface DraftMember {
  id: string;
  name: string;
  /** Starts as the id; "regenerate" replaces it with a new one. */
  seed: string;
}

/** `/groups/new`: group name and members in a single form. */
export function NewGroupPage() {
  const navigate = useNavigate();
  const { create, isPending } = useCreateGroup();
  const { newId } = useServices();
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [memberDraft, setMemberDraft] = useState('');
  const [memberError, setMemberError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ name: string }>({ defaultValues: { name: '' } });
  const groupName = useWatch({ control, name: 'name' });

  /** Validates `draft` against the current members; returns the new list or null. */
  function withDraft(
    current: DraftMember[],
    draft: string
  ): DraftMember[] | null {
    const result = validateMemberName({ members: current }, draft);
    if (!result.ok) {
      setMemberError(result.error.message);
      return null;
    }
    setMemberError(undefined);
    const id = newId();
    return [...current, { id, name: result.value, seed: id }];
  }

  function addMember() {
    const next = withDraft(members, memberDraft);
    if (!next) return;
    setMembers(next);
    setMemberDraft('');
  }

  function onMemberKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addMember();
    }
  }

  /** Same rule as `createGroup`: colors in order, first free one. */
  const avatarColors: number[] = [];
  for (let i = 0; i < members.length; i++) {
    avatarColors.push(
      nextAvatarColor(avatarColors.map((color) => ({ avatar: { color } })))
    );
  }

  function regenerateAvatar(id: string) {
    setMembers((current) =>
      current.map((m) => (m.id === id ? { ...m, seed: newId() } : m))
    );
  }

  const onSubmit = handleSubmit(async ({ name }) => {
    let finalMembers = members;
    if (memberDraft.trim()) {
      const next = withDraft(members, memberDraft);
      if (!next) return;
      finalMembers = next;
      setMembers(next);
      setMemberDraft('');
    }
    if (finalMembers.length < MIN_MEMBERS) {
      setMemberError('Agrega al menos 2 miembros para crear el grupo.');
      return;
    }
    const input: NewMemberInput[] = finalMembers.map((m) => ({
      id: m.id,
      name: m.name,
      avatarSeed: m.seed,
    }));
    const result = await create({ name, members: input });
    if (result.ok) {
      toast.success('Grupo creado');
      navigate(`/groups/${result.value.id}`);
    } else if (!isInfrastructureError(result.error)) {
      setError('name', { message: result.error.message });
    }
  });

  return (
    <div className='grid gap-4'>
      <h1 className='text-2xl font-bold tracking-tight'>Crear grupo</h1>
      <Card className='p-5'>
        <form onSubmit={onSubmit} className='grid gap-5' noValidate>
          <FormField
            label='Nombre del grupo'
            error={errors.name?.message}
            counter={{ length: groupName.length, max: MAX_GROUP_NAME_LENGTH }}
          >
            {(control) => (
              <div className='flex items-center gap-2.5'>
                <EntityIcon text={groupName} kind='group' size='header' />
                <Input
                  {...control}
                  placeholder='Viaje a Pucón'
                  autoComplete='off'
                  {...register('name', {
                    validate: (value) => {
                      const result = validateGroupName(value);
                      return result.ok || result.error.message;
                    },
                  })}
                />
              </div>
            )}
          </FormField>

          <div className='grid gap-3'>
            <FormField
              label='Miembros'
              error={memberError}
              hint='Escribe un nombre y presiona Enter. Mínimo 2 miembros.'
              counter={{
                length: memberDraft.length,
                max: MAX_MEMBER_NAME_LENGTH,
              }}
            >
              {(control) => (
                <div className='flex gap-2'>
                  <Input
                    {...control}
                    value={memberDraft}
                    placeholder='Nombre'
                    autoComplete='off'
                    enterKeyHint='done'
                    onChange={(event) => setMemberDraft(event.target.value)}
                    onKeyDown={onMemberKeyDown}
                  />
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={addMember}
                    className='shrink-0'
                  >
                    <Plus /> Agregar
                  </Button>
                </div>
              )}
            </FormField>

            {members.length > 0 && (
              <ul className='grid gap-2' aria-label='Miembros agregados'>
                {members.map((member, index) => (
                  <li
                    key={member.id}
                    className='flex items-center gap-2 rounded-xl bg-secondary py-1 pr-1 pl-1'
                  >
                    <AvatarButton
                      member={{
                        name: member.name,
                        avatar: {
                          color: avatarColors[index],
                          seed: member.seed,
                        },
                      }}
                      onRegenerate={() => regenerateAvatar(member.id)}
                    />
                    <span className='min-w-0 flex-1 break-words'>
                      {member.name}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      aria-label={`Quitar a ${member.name}`}
                      onClick={() =>
                        setMembers(members.filter((m) => m.id !== member.id))
                      }
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <Button asChild variant='outline'>
              <Link to='/'>Cancelar</Link>
            </Button>
            <Button type='submit' disabled={isPending}>
              Crear grupo
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
