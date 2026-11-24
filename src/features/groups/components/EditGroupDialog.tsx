import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntityIcon } from '@/features/icons';
import {
  canChangeCurrency,
  changeCurrency,
  MAX_GROUP_NAME_LENGTH,
  renameGroup,
  validateGroupName,
  type CurrencyCode,
  type Group,
} from '@/domain';
import { isInfrastructureError, useGroupOperation } from '../data';
import { CurrencyField } from './CurrencyField';

interface EditGroupDialogProps {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGroupDialog({
  group,
  open,
  onOpenChange,
}: EditGroupDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Editar grupo'
    >
      <EditGroupForm group={group} onDone={() => onOpenChange(false)} />
    </ResponsiveDialog>
  );
}

function EditGroupForm({
  group,
  onDone,
}: {
  group: Group;
  onDone: () => void;
}) {
  const operation = useGroupOperation(group.id);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ name: string; currency: CurrencyCode }>({
    defaultValues: { name: group.name, currency: group.currency },
  });
  const draftName = useWatch({ control, name: 'name' });

  const locked = !canChangeCurrency(group);

  const onSubmit = handleSubmit(async ({ name, currency }) => {
    const result = await operation.run((g) => {
      const renamed = renameGroup(g, name);
      return renamed.ok ? changeCurrency(renamed.value, currency) : renamed;
    });
    if (result.ok) {
      toast.success('Grupo actualizado');
      onDone();
    } else if (!isInfrastructureError(result.error)) {
      setError(result.error.code === 'currency_locked' ? 'currency' : 'name', {
        message: result.error.message,
      });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className='grid grid-cols-[minmax(0,1fr)] gap-4'
      noValidate
    >
      <FormField
        label='Nombre del grupo'
        error={errors.name?.message}
        counter={{ length: draftName.length, max: MAX_GROUP_NAME_LENGTH }}
      >
        {(control) => (
          <div className='flex items-center gap-2.5'>
            <EntityIcon text={draftName} kind='group' size='header' />
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
          </div>
        )}
      </FormField>
      <Controller
        control={control}
        name='currency'
        render={({ field }) => (
          <CurrencyField
            value={field.value}
            onValueChange={field.onChange}
            locked={locked}
            error={errors.currency?.message}
          />
        )}
      />
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
