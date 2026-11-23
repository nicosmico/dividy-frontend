import { useRef, useState } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import { ResponsiveDialogFooter } from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addExpense,
  computeShares,
  formatAmount,
  removeExpense,
  updateExpense,
  type Expense,
  type Group,
} from '@/domain';
import {
  isInfrastructureError,
  toastUndoable,
  useGroupOperation,
  useServices,
} from '@/features/groups/data';
import { MemberAvatar } from '@/features/members';
import { todayLocal } from '@/lib/dates';
import { AmountInput } from './AmountInput';
import {
  parseAmount,
  validateExpenseForm,
  type ExpenseFormValues,
} from './expense-form';

interface ExpenseFormProps {
  group: Group;
  /** The expense being edited; omit to create a new one. */
  expense?: Expense;
  /** Called after saving, deleting or cancelling. */
  onDone: () => void;
}

function initialValues(group: Group, expense?: Expense): ExpenseFormValues {
  if (expense) {
    return {
      description: expense.description,
      amount: String(expense.amount),
      payerId: expense.payerId,
      participantIds: [...expense.split.participantIds],
      date: expense.date,
    };
  }
  return {
    description: '',
    amount: '',
    payerId: group.members[0]?.id ?? '',
    participantIds: group.members.map((m) => m.id),
    date: todayLocal(),
  };
}

/**
 * Create / edit form. Mount it with `key={expense?.id ?? 'new'}` so it never
 * carries the values of another expense (finding 1). Nothing is saved until
 * the user presses "Guardar".
 */
export function ExpenseForm({ group, expense, onDone }: ExpenseFormProps) {
  const { now, newId } = useServices();
  const operation = useGroupOperation(group.id);
  const [newExpenseId] = useState(() => newId());
  // Closed after the first submit: a double click can never save twice (finding 2).
  const submitted = useRef(false);
  const [formError, setFormError] = useState<string>();

  const resolver: Resolver<ExpenseFormValues> = (values) => {
    const result = validateExpenseForm(group, values);
    if ('fields' in result) return { values, errors: {} };
    return {
      values: {},
      errors: Object.fromEntries(
        Object.entries(result.errors).map(([name, message]) => [
          name,
          { type: 'validate', message },
        ])
      ),
    };
  };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<ExpenseFormValues>({
    defaultValues: initialValues(group, expense),
    resolver,
  });

  const values = useWatch({ control });
  const amount = parseAmount(values.amount ?? '');
  const shares =
    Number.isInteger(amount) && amount > 0
      ? computeShares(
          {
            id: 'preview',
            description: '',
            amount,
            payerId: values.payerId ?? '',
            split: {
              type: 'equal',
              participantIds: (values.participantIds ?? []) as string[],
            },
            date: values.date ?? '',
            createdAt: '',
          },
          group.members
        )
      : new Map<string, number>();
  const base = shares.size > 0 ? Math.floor(amount / shares.size) : Number.NaN;
  const roundedUp = group.members.filter((m) => (shares.get(m.id) ?? 0) > base);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    return handleSubmit(async (formValues) => {
      if (submitted.current) return;
      const checked = validateExpenseForm(group, formValues);
      if (!('fields' in checked)) return;
      submitted.current = true;
      setFormError(undefined);
      const result = await operation.run((g) =>
        expense
          ? updateExpense(g, expense.id, checked.fields)
          : addExpense(g, {
              ...checked.fields,
              id: newExpenseId,
              createdAt: now(),
            })
      );
      if (result.ok) {
        toast.success(expense ? 'Gasto actualizado' : 'Gasto agregado');
        onDone();
        return;
      }
      submitted.current = false;
      if (!isInfrastructureError(result.error))
        setFormError(result.error.message);
    })(event);
  }

  /** No confirmation: the toast offers "Deshacer" (decision 64). */
  async function deleteExpense() {
    if (!expense || submitted.current) return;
    submitted.current = true;
    const result = await operation.run((g) => removeExpense(g, expense.id));
    if (result.ok) {
      toastUndoable('Gasto eliminado', result);
      onDone();
      return;
    }
    submitted.current = false;
    if (!isInfrastructureError(result.error))
      setFormError(result.error.message);
  }

  const busy = operation.isPending;

  return (
    <form onSubmit={onSubmit} noValidate className='grid gap-4'>
      <FormField label='Descripción' error={errors.description?.message}>
        {(c) => (
          <Input
            {...c}
            autoComplete='off'
            placeholder='Ej: Supermercado'
            {...register('description')}
          />
        )}
      </FormField>

      <FormField label='Monto en pesos' error={errors.amount?.message}>
        {(c) => (
          <Controller
            control={control}
            name='amount'
            render={({ field }) => (
              <AmountInput
                {...c}
                ref={field.ref}
                name={field.name}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        )}
      </FormField>

      <FormField label='Pagado por' error={errors.payerId?.message}>
        {(c) => (
          <Controller
            control={control}
            name='payerId'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...c}>
                  <SelectValue placeholder='Elige quién pagó' />
                </SelectTrigger>
                <SelectContent>
                  {group.members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>

      <fieldset className='grid gap-2'>
        <div className='flex items-center justify-between gap-2'>
          <legend className='text-sm font-medium'>Dividir entre</legend>
          <div className='flex gap-1'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='-my-1 h-9'
              onClick={() =>
                setValue(
                  'participantIds',
                  group.members.map((m) => m.id),
                  { shouldValidate: isSubmitted }
                )
              }
            >
              Todos
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='-my-1 h-9'
              onClick={() =>
                setValue('participantIds', [], {
                  shouldValidate: isSubmitted,
                })
              }
            >
              Ninguno
            </Button>
          </div>
        </div>
        <Controller
          control={control}
          name='participantIds'
          render={({ field }) => (
            <ul className='grid gap-1 rounded-xl border bg-card p-1'>
              {group.members.map((member) => {
                const checked = field.value.includes(member.id);
                const share = shares.get(member.id);
                const id = `participant-${member.id}`;
                return (
                  <li
                    key={member.id}
                    className='flex min-h-11 items-center gap-3 rounded-lg px-2'
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(next) =>
                        field.onChange(
                          next
                            ? [...field.value, member.id]
                            : field.value.filter((x) => x !== member.id)
                        )
                      }
                    />
                    <MemberAvatar member={member} className='size-7' />
                    <Label
                      htmlFor={id}
                      className='min-w-0 flex-1 cursor-pointer py-2 break-words'
                    >
                      {member.name}
                    </Label>
                    {checked && share !== undefined && (
                      <span className='shrink-0 text-sm font-medium tabular-nums'>
                        {formatAmount(share)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        />
        {roundedUp.length > 0 && (
          <p className='text-sm text-muted-foreground'>
            Por redondeo, a {joinNames(roundedUp.map((m) => m.name))}{' '}
            {roundedUp.length === 1 ? 'le toca' : 'les toca'} $1 más.
          </p>
        )}
        {errors.participantIds?.message && (
          <p role='alert' className='text-sm text-destructive'>
            {errors.participantIds.message}
          </p>
        )}
      </fieldset>

      <FormField label='Fecha' error={errors.date?.message}>
        {(c) => <Input {...c} type='date' {...register('date')} />}
      </FormField>

      {formError && (
        <p role='alert' className='text-sm text-destructive'>
          {formError}
        </p>
      )}

      <ResponsiveDialogFooter className='grid grid-cols-2 md:flex md:items-center'>
        {expense && (
          <Button
            type='button'
            variant='ghost'
            disabled={busy}
            className='order-last col-span-2 text-destructive hover:text-destructive md:order-none md:col-span-1 md:mr-auto'
            onClick={() => void deleteExpense()}
          >
            Eliminar gasto
          </Button>
        )}
        <Button type='button' variant='outline' onClick={onDone}>
          Cancelar
        </Button>
        <Button type='submit' disabled={busy}>
          Guardar
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}

/** `Ana`, `Ana y Beto`, `Ana, Beto y Caro`. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}
