import { IconArrowNarrowRight } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { RoundedLink } from 'src/components/ui';
import { MemberList } from 'src/features/split-bills';
import {
  MemberForm,
  TMemberForm,
} from 'src/features/split-bills/components/MemberForm';
import useMembers from 'src/features/split-bills/hooks/useMembers';

export function MembersPage() {
  const { members, membersOrder, addMember, deleteMember } = useMembers();
  const navigate = useNavigate();

  const handleAddMember = (values: TMemberForm) => {
    addMember({
      ...values,
      picture: `https://doodleipsum.com/100x100/avatar-4?n=${crypto.randomUUID()}`,
    });
  };

  return (
    <>
      <Outlet /> {/* For EditMemberPage */}
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-[min-content_1fr]'>
        <div className='space-y-2 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Miembros</h1>
          <p>
            Agrega a los miembros del grupo con quienes dividirás los gastos. En
            el siguiente paso podrás agregar las deudas.
          </p>
        </div>

        <div className='space-y-8 md:col-start-2 md:col-end-3 md:row-span-full'>
          <MemberForm onValid={handleAddMember} resetOnSubmit></MemberForm>

          <MemberList
            members={membersOrder.map((id) => members[id])}
            onDelete={deleteMember}
            onEdit={(member) => navigate(`${member.id}/edit`)}
          />
        </div>

        <div className='sticky bottom-2 md:static md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3'>
          <RoundedLink
            to='../bills'
            disabled={membersOrder.length < 2}
            className='w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
          >
            Deudas
            <IconArrowNarrowRight></IconArrowNarrowRight>
          </RoundedLink>
        </div>
      </div>
    </>
  );
}

export default MembersPage;
