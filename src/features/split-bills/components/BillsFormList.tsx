import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Card, RoundedButton } from 'src/components/ui';
import { debounce } from 'src/utils/debounce';
import { BillFormItem } from '..';
import useBills from '../hooks/useBills';
import { BILL_FORMS_SCHEMA, BillForm, BillForms } from '../schemas/bills';

export function BillsFormList() {
  const { bills, setBills, deleteBill } = useBills();

  const { control, register, watch, handleSubmit } = useForm<BillForms>({
    resolver: zodResolver(BILL_FORMS_SCHEMA),
    shouldFocusError: false,
    defaultValues: { bills },
  });
  const { fields, append, remove } = useFieldArray<BillForms>({
    control,
    name: 'bills',
  });
  const watchItems = watch('bills');

  const handleAdd = () => {
    append({
      id: crypto.randomUUID(),
      name: `Nueva boleta ${fields.length + 1}`,
      paidBy: '1', // TODO: Add ID of the first memeber
      total: 0,
    });
  };

  const getRegisterByIndex = (index: number) => (name: keyof BillForm) =>
    register(`bills.${index}.${name}`);

  const onValid = ({ bills }: BillForms) => {
    saveBills(bills);
  };

  const saveBills = useMemo(
    () =>
      debounce((bills: BillForm[]) => {
        console.log(bills);
        setBills(bills);
      }, 300),
    [setBills]
  );

  const onDelete = (id: string, index: number) => {
    remove(index);
    deleteBill(id);
  };

  return (
    <>
      <form onChange={handleSubmit(onValid)} onSubmit={handleSubmit(onValid)}>
        <ul className='space-y-2'>
          {fields.map((field, index) => (
            <li key={field.id}>
              <Card className='space-y-4'>
                <BillFormItem
                  register={getRegisterByIndex(index)}
                  value={watchItems[index]}
                  onDelete={() => onDelete(field.id, index)}
                />
              </Card>
            </li>
          ))}
        </ul>
      </form>
      <RoundedButton
        className='mx-auto bg-zinc-900 px-4 py-1 text-sm text-white'
        onClick={handleAdd}
      >
        <IconPlus size={16} />
        Agregar boleta
      </RoundedButton>
    </>
  );
}

export default BillsFormList;
