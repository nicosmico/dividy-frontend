import { IconArrowNarrowRight } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoundedLink } from 'src/components/ui';
import { MemberForm, MemberList } from 'src/features/split-bills';
import { TMemberForm } from 'src/features/split-bills/components/MemberForm';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import EditMemberPage from './EditMemberPage';

export function MembersPage() {
  const { members, membersOrder, addMember, deleteMember } = useMembers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [memberDetailId, setMemberDetailId] = useState(
    searchParams.get('memberDetail')
  );

  useEffect(() => {
    setMemberDetailId(searchParams.get('memberDetail'));
  }, [searchParams]);

  const handleAddMember = (values: TMemberForm) => {
    const uuid = crypto.randomUUID();
    addMember({
      uuid,
      ...values,
      picture: `https://doodleipsum.com/100x100/avatar-4?n=${uuid}`,
    });
  };

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
            <RoundedLink
              to='../bills'
              disabled={membersOrder.length < 2}
              className='mt-4 w-full bg-amber-200 px-6 shadow-sm md:max-w-lg'
            >
              Deudas
              <IconArrowNarrowRight></IconArrowNarrowRight>
            </RoundedLink>
          </div>

          <div className='w-full space-y-8'>
            <MemberForm onValid={handleAddMember} resetOnSubmit></MemberForm>

            <MemberList
              members={membersOrder.map((uuid) => members[uuid])}
              onDelete={deleteMember}
              onEdit={(member) =>
                setSearchParams({ memberDetail: member.uuid })
              }
            />
          </div>
        </div>
      </div>

      {memberDetailId && (
        <EditMemberPage
          memberId={memberDetailId}
          onClose={() => setSearchParams()}
        ></EditMemberPage>
      )}
    </>
  );
}

export default MembersPage;
