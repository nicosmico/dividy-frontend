import { IconArrowNarrowRight, IconPlus } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { IconButton, RoundedButton } from 'src/components/ui';
import { MemberForm, MemberList } from 'src/features/split-bills';
import useMembers from 'src/hooks/useMembers';

export function MembersPage() {
  const { members, addMember, deleteMember } = useMembers();
  const navigate = useNavigate();

  return (
    <>
      <div className='space-y-4'>
        <div className='space-y-4 md:flex md:gap-4'>
          <div className='w-full text-center md:pt-20 md:text-left'>
            <h1 className='text-xl font-bold'>Miembros</h1>
            <p>
              Agrega a los miembros del grupo con quienes dividirás los gastos.
              En el siguiente paso podrás agregar las deudas.
            </p>
            <RoundedButton
              disabled={members.length < 2}
              className='mt-4 w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
            >
              Deudas
              <IconArrowNarrowRight></IconArrowNarrowRight>
            </RoundedButton>
          </div>

          <div className='w-full space-y-8'>
            <MemberForm
              onSubmitForm={addMember}
              className='flex gap-2'
              resetOnSubmit
            >
              <IconButton
                type='submit'
                className='mt-1 h-min bg-zinc-800 text-white'
              >
                <IconPlus />
              </IconButton>
            </MemberForm>

            <MemberList
              members={members}
              onDelete={deleteMember}
              onEdit={(member) => navigate(`${member.id}/edit`)}
            />
          </div>
        </div>
      </div>

      <Outlet />
    </>
  );
}

export default MembersPage;
