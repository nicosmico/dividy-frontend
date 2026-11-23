import { Plus, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { validateGroupName, validateMemberName } from '@/domain';
import { isInfrastructureError, useCreateGroup } from '../data';

const MIN_MEMBERS = 2;

/** `/groups/new`: group name and members in a single form. */
export function NewGroupPage() {
  const navigate = useNavigate();
  const { create, isPending } = useCreateGroup();
  const [members, setMembers] = useState<string[]>([]);
  const [memberDraft, setMemberDraft] = useState('');
  const [memberError, setMemberError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ name: string }>({ defaultValues: { name: '' } });

  /** Validates `draft` against the current members; returns the new list or null. */
  function withDraft(current: string[], draft: string): string[] | null {
    const result = validateMemberName(
      { members: current.map((name) => ({ id: name, name })) },
      draft
    );
    if (!result.ok) {
      setMemberError(result.error.message);
      return null;
    }
    setMemberError(undefined);
    return [...current, result.value];
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
    const result = await create({ name, memberNames: finalMembers });
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
          <FormField label='Nombre del grupo' error={errors.name?.message}>
            {(control) => (
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
            )}
          </FormField>

          <div className='grid gap-3'>
            <FormField
              label='Miembros'
              error={memberError}
              hint='Escribe un nombre y presiona Enter. Mínimo 2 miembros.'
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
                {members.map((name) => (
                  <li
                    key={name}
                    className='flex items-center justify-between gap-2 rounded-xl bg-secondary py-1 pr-1 pl-4'
                  >
                    <span className='min-w-0 break-words'>{name}</span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      aria-label={`Quitar a ${name}`}
                      onClick={() =>
                        setMembers(members.filter((m) => m !== name))
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
