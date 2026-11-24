import { useEffect, useRef, useState } from 'react';
import {
  Controller,
  useController,
  useForm,
  useWatch,
  type Resolver,
} from 'react-hook-form';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form-field';
import { ResponsiveDialogFooter } from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
  formatAmountInput,
  isExpenseCoveredByPayments,
  MAX_DESCRIPTION_LENGTH,
  previewBalanceChange,
  removeExpense,
  updateExpense,
  type BalanceChange,
  type Expense,
  type ExpenseFields,
  type Group,
  type SplitType,
  validateSplit,
} from '@/domain';
import {
  isInfrastructureError,
  toastUndoable,
  useGroupOperation,
  useServices,
} from '@/features/groups/data';
import { EntityIcon } from '@/features/icons';
import { MemberAvatar, useMemberMoods } from '@/features/members';
import { todayLocal } from '@/lib/dates';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';
import { AmountInput } from './AmountInput';
import {
  ConfirmCoveredChange,
  type CoveredChangeKind,
} from './ConfirmCoveredChange';
import {
  describeSplitStatus,
  parseAmount,
  parseSplitValue,
  presetValues,
  readSplit,
  splitToValues,
  startingValue,
  validateExpenseForm,
  type CustomSplitType,
  type ExpenseFormValues,
} from './expense-form';
import { SplitValueInput } from './SplitValueInput';

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
      amount: formatAmountInput(expense.amount, group.currency),
      payerId: expense.payerId,
      participantIds: [...expense.split.participantIds],
      date: expense.date,
      splitType: expense.split.type,
      splitValues: splitToValues(expense.split, group.currency),
    };
  }
  return {
    description: '',
    amount: '',
    payerId: group.members[0]?.id ?? '',
    participantIds: group.members.map((m) => m.id),
    date: todayLocal(),
    splitType: 'equal',
    splitValues: {},
  };
}

const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Iguales' },
  { value: 'exact', label: 'Montos' },
  { value: 'percent', label: '%' },
  { value: 'shares', label: 'Partes' },
];

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
  // Set when the change touches an expense already covered by payments.
  const [warning, setWarning] = useState<{
    kind: CoveredChangeKind;
    changes: BalanceChange[];
    confirm: () => Promise<void>;
  } | null>(null);

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
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<ExpenseFormValues>({
    defaultValues: initialValues(group, expense),
    resolver,
  });

  const values = useWatch({ control });
  const splitTypeField = useController({ control, name: 'splitType' }).field;
  const splitValuesField = useController({
    control,
    name: 'splitValues',
  }).field;
  const moods = useMemberMoods(group);
  const { currency } = group;
  const amount = parseAmount(values.amount ?? '', currency);
  const splitType = (values.splitType ?? 'equal') as SplitType;
  const custom = splitType !== 'equal';
  const typed = (values.splitValues ?? {}) as Record<string, string>;
  const chosenIds = (values.participantIds ?? []) as string[];

  // What each participant owes, live. Equal always; a custom split only once
  // it adds up (otherwise the numbers would be a guess).
  const read = readSplit(
    group.members,
    {
      participantIds: chosenIds,
      splitType,
      splitValues: typed,
    },
    currency
  );
  const liveSplit = 'split' in read ? read.split : null;
  const shares =
    liveSplit &&
    Number.isInteger(amount) &&
    amount > 0 &&
    (!custom || validateSplit(amount, liveSplit, group.members, currency).ok)
      ? computeShares({ amount, split: liveSplit }, group.members)
      : new Map<string, number>();
  // Equal parts differ by at most 1 unit: the smallest one is what everyone gets.
  const base = shares.size > 0 ? Math.min(...shares.values()) : Number.NaN;
  const roundedUp = custom
    ? []
    : group.members.filter((m) => (shares.get(m.id) ?? 0) > base);
  const chosenMembers = group.members.filter((m) => chosenIds.includes(m.id));
  const status = custom
    ? describeSplitStatus(
        splitType as CustomSplitType,
        amount,
        chosenMembers.map((m) =>
          parseSplitValue(splitType, typed[m.id] ?? '', currency)
        ),
        currency
      )
    : null;

  // Whether the split adds up depends on the amount, who takes part and every
  // field, but its message hangs on "Dividir entre": once the user has tried
  // to save, keep that message in step with all of them.
  const splitKey = JSON.stringify([
    values.amount,
    values.splitType,
    values.splitValues,
    values.participantIds,
  ]);
  useEffect(() => {
    if (isSubmitted) void trigger('participantIds');
  }, [splitKey, isSubmitted, trigger]);

  function changeSplitType(next: SplitType) {
    splitTypeField.onChange(next);
    splitValuesField.onChange(
      presetValues(next, amount, chosenIds, group.members, currency)
    );
  }

  function toggleParticipant(
    onChange: (ids: string[]) => void,
    memberId: string,
    on: boolean
  ) {
    onChange(
      on ? [...chosenIds, memberId] : chosenIds.filter((x) => x !== memberId)
    );
    if (!custom) return;
    const next = { ...typed };
    if (on) next[memberId] = startingValue(splitType);
    else delete next[memberId];
    splitValuesField.onChange(next);
  }

  /** "Todos" / "Ninguno": the new participants start empty, as when checked one by one. */
  function setParticipants(ids: string[]) {
    setValue('participantIds', ids, { shouldValidate: isSubmitted });
    if (!custom) return;
    splitValuesField.onChange(
      Object.fromEntries(
        ids.map((id) => [id, typed[id] ?? startingValue(splitType)])
      )
    );
  }

  /**
   * Balance changes the user should confirm first: only when the expense was
   * already considered in registered payments AND the balances really change.
   * The next group comes from the domain operation itself (no duplicated rules).
   */
  function coveredChanges(
    next: (g: Group) => ReturnType<typeof removeExpense>
  ) {
    if (!expense || !isExpenseCoveredByPayments(group, expense.id)) return [];
    const result = next(group);
    return result.ok ? previewBalanceChange(group, result.value) : [];
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    return handleSubmit(async (formValues) => {
      if (submitted.current) return;
      const checked = validateExpenseForm(group, formValues);
      if (!('fields' in checked)) return;
      const { fields } = checked;
      if (expense) {
        const changes = coveredChanges((g) =>
          updateExpense(g, expense.id, fields)
        );
        if (changes.length > 0) {
          setWarning({ kind: 'save', changes, confirm: () => save(fields) });
          return;
        }
      }
      await save(fields);
    })(event);
  }

  async function save(fields: ExpenseFields) {
    if (submitted.current) return;
    submitted.current = true;
    setFormError(undefined);
    const result = await operation.run((g) =>
      expense
        ? updateExpense(g, expense.id, fields)
        : addExpense(g, { ...fields, id: newExpenseId, createdAt: now() })
    );
    if (result.ok) {
      toast.success(expense ? 'Gasto actualizado' : 'Gasto agregado');
      onDone();
      return;
    }
    submitted.current = false;
    setWarning(null);
    if (!isInfrastructureError(result.error))
      setFormError(result.error.message);
  }

  function requestDelete() {
    if (!expense) return;
    const changes = coveredChanges((g) => removeExpense(g, expense.id));
    if (changes.length > 0)
      setWarning({ kind: 'delete', changes, confirm: deleteExpense });
    else void deleteExpense();
  }

  /** The toast offers "Deshacer" (decision 64), also after confirming a warning. */
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
    setWarning(null);
    if (!isInfrastructureError(result.error))
      setFormError(result.error.message);
  }

  const busy = operation.isPending;

  return (
    <>
      <form
        onSubmit={onSubmit}
        noValidate
        className='grid grid-cols-[minmax(0,1fr)] gap-4'
      >
        <FormField
          label='Descripción'
          error={errors.description?.message}
          counter={{
            length: (values.description ?? '').length,
            max: MAX_DESCRIPTION_LENGTH,
          }}
        >
          {(c) => (
            <div className='flex items-center gap-2.5'>
              <EntityIcon
                text={values.description ?? ''}
                kind='expense'
                size='header'
              />
              <Input
                {...c}
                autoComplete='off'
                placeholder='Ej: Supermercado'
                {...register('description')}
              />
            </div>
          )}
        </FormField>

        <FormField label='Monto' error={errors.amount?.message}>
          {(c) => (
            <Controller
              control={control}
              name='amount'
              render={({ field }) => (
                <AmountInput
                  {...c}
                  ref={field.ref}
                  currency={currency}
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

        <fieldset className='grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2'>
          <div className='flex items-center justify-between gap-2'>
            <legend className='text-sm font-medium'>Dividir entre</legend>
            <div className='flex gap-1'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='-my-1 h-9 text-primary'
                onClick={() => setParticipants(group.members.map((m) => m.id))}
              >
                Todos
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='-my-1 h-9 text-primary'
                onClick={() => setParticipants([])}
              >
                Ninguno
              </Button>
            </div>
          </div>
          <SegmentedControl
            label='Cómo se divide'
            value={splitType}
            onValueChange={changeSplitType}
            options={SPLIT_OPTIONS}
          />
          <Controller
            control={control}
            name='participantIds'
            render={({ field }) => (
              <ul className='grid grid-cols-[minmax(0,1fr)] gap-1 rounded-xl border bg-card p-1'>
                {group.members.map((member) => {
                  const checked = field.value.includes(member.id);
                  const share = shares.get(member.id);
                  const id = `participant-${member.id}`;
                  const text = typed[member.id] ?? '';
                  const parts = parseSplitValue(splitType, text, currency);
                  return (
                    <li
                      key={member.id}
                      className='flex min-h-11 items-center gap-3 rounded-lg px-2'
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(next) =>
                          toggleParticipant(
                            field.onChange,
                            member.id,
                            next === true
                          )
                        }
                      />
                      <MemberAvatar
                        member={member}
                        mood={moods.get(member.id)}
                        className='size-7'
                      />
                      <div className='min-w-0 flex-1'>
                        <Label
                          htmlFor={id}
                          className='block cursor-pointer py-2 [overflow-wrap:anywhere]'
                        >
                          {member.name}
                        </Label>
                        {checked && splitType === 'shares' && parts >= 1 && (
                          <p className='-mt-1.5 pb-1.5 text-xs text-muted-foreground tabular-nums'>
                            {plural(parts, 'parte', 'partes')}
                            {share !== undefined &&
                              ` · ${formatAmount(share, currency)}`}
                          </p>
                        )}
                        {checked &&
                          splitType === 'percent' &&
                          share !== undefined && (
                            <p className='-mt-1.5 pb-1.5 text-xs text-muted-foreground tabular-nums'>
                              {formatAmount(share, currency)}
                            </p>
                          )}
                      </div>
                      {checked && !custom && share !== undefined && (
                        <span className='shrink-0 text-sm font-medium tabular-nums'>
                          {formatAmount(share, currency)}
                        </span>
                      )}
                      {checked && custom && (
                        <SplitValueInput
                          type={splitType as CustomSplitType}
                          currency={currency}
                          memberName={member.name}
                          value={text}
                          invalid={Number.isNaN(parts)}
                          onValueChange={(next) =>
                            splitValuesField.onChange({
                              ...typed,
                              [member.id]: next,
                            })
                          }
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          />
          {status && (
            <p
              aria-live='polite'
              className={cn(
                'text-sm',
                status.tone === 'ok'
                  ? 'text-positive'
                  : status.tone === 'warn'
                    ? 'text-negative'
                    : 'text-muted-foreground'
              )}
            >
              {status.tone === 'ok' && (
                <Check
                  aria-hidden='true'
                  className='mr-1 inline size-4 align-text-bottom'
                />
              )}
              {status.lead}
              {status.lead && status.tail && ' · '}
              {status.tail}
            </p>
          )}
          {roundedUp.length > 0 && (
            <p className='text-sm text-muted-foreground'>
              Por redondeo, a {joinNames(roundedUp.map((m) => m.name))}{' '}
              {roundedUp.length === 1 ? 'le toca' : 'les toca'}{' '}
              {formatAmount(1, currency)} más.
            </p>
          )}
          {errors.participantIds?.message && (
            <p role='alert' className='text-sm text-negative'>
              {errors.participantIds.message}
            </p>
          )}
        </fieldset>

        <FormField label='Fecha' error={errors.date?.message}>
          {(c) => <Input {...c} type='date' {...register('date')} />}
        </FormField>

        {formError && (
          <p role='alert' className='text-sm text-negative'>
            {formError}
          </p>
        )}

        <ResponsiveDialogFooter className='grid grid-cols-2 md:flex md:items-center'>
          {expense && (
            <Button
              type='button'
              variant='ghost'
              disabled={busy}
              className='order-last col-span-2 text-negative hover:text-negative md:order-none md:col-span-1 md:mr-auto'
              onClick={requestDelete}
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
      {warning && (
        <ConfirmCoveredChange
          kind={warning.kind}
          changes={warning.changes}
          members={group.members}
          currency={currency}
          pending={busy}
          onCancel={() => setWarning(null)}
          onConfirm={() => void warning.confirm()}
        />
      )}
    </>
  );
}

/** `Ana`, `Ana y Beto`, `Ana, Beto y Caro`. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}
