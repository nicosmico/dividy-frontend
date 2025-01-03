import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowNarrowRight } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Outlet, useNavigate } from 'react-router-dom';
import { MemberList } from 'src/features/split-bills';
import {
  MemberForm,
  TMemberForm,
} from 'src/features/split-bills/components/MemberForm';
import { useDebt } from 'src/features/split-bills/hooks/useDebt';
import useUrlDebt from 'src/features/split-bills/hooks/useUrlDebt';
import { Avatar } from 'src/features/split-bills/services/avatar';
import { NewMember } from 'src/features/split-bills/types/debts';
import { Input, InputError, RoundedLink } from 'src/shared';
import { z } from 'zod';

const debtSchema = z.object({
  title: z.string().min(1, 'Debes ingresar un título'),
});
export type DebtSchema = z.infer<typeof debtSchema>;

export function MembersPage() {
  const navigate = useNavigate();

  const debt = useUrlDebt();

  const { addDebt, updateDebt, debts, addMember, removeMember } = useDebt();

  useEffect(() => {
    console.log(debts);
  }, [debts]);

  const { register, formState, handleSubmit } = useForm<DebtSchema>({
    resolver: zodResolver(debtSchema),
    defaultValues: { title: debt?.title },
  });

  const handleAddMember = (values: TMemberForm) => {
    const memberData: NewMember = {
      ...values,
      picture: {
        happy: Avatar.happy(values.name),
        sad: Avatar.sad(values.name),
      },
    };
    if (!debt) {
      const newDebt = handleAddDebt('Nuevo grupo');
      addMember(newDebt.id, memberData);
    } else {
      addMember(debt.id, memberData);
    }
  };

  const onValidDebtTitle = ({ title }: DebtSchema) => {
    if (debt?.id) {
      updateDebt(debt.id, { title });
    } else {
      handleAddDebt(title);
    }
  };

  const disableNextStep =
    !!formState.errors.title || !debt?.members || debt.members.length < 2;

  const handleAddDebt = (title: string) => {
    const debt = addDebt({
      title,
      expenses: [],
      members: [],
    });
    navigate(`../../${debt.id}/members`);
    return debt;
  };

  return (
    <>
      <Outlet /> {/* For EditMemberPage */}
      <div className='grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:grid-rows-[min-content_1fr] md:gap-3'>
        <div className='space-y-2 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Grupo de deudas</h1>
          <div className='space-y-2'>
            <p>Dale un título al grupo y agrega los miembros</p>
            <div className='space-y-2'>
              <Input
                register={register('title', {
                  onChange: handleSubmit(onValidDebtTitle, (e) =>
                    console.warn(e)
                  ),
                })}
                label='Título de grupo'
                placeholder='Ej: Viaje a Dichato'
              ></Input>
              <InputError error={formState.errors.title}></InputError>
            </div>
          </div>
        </div>

        <div className='space-y-4 md:col-start-2 md:col-end-3 md:row-span-full'>
          <div className='space-y-2'>
            <p className='text-center text-sm font-semibold md:text-left'>
              Miembros
            </p>
            <MemberForm onValid={handleAddMember} resetOnSubmit></MemberForm>
          </div>
          <MemberList
            members={debt?.members ?? []}
            onDelete={(memberId) => debt?.id && removeMember(debt.id, memberId)}
            onEdit={(member) => navigate(`${member.id}/edit`)}
          />
        </div>

        <div className='bottom-2 md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3'>
          <RoundedLink
            to='../expenses'
            disabled={disableNextStep}
            className='w-full bg-amber-200 px-6 shadow-sm'
          >
            Gastos
            <IconArrowNarrowRight></IconArrowNarrowRight>
          </RoundedLink>
        </div>
      </div>
    </>
  );
}

export default MembersPage;
