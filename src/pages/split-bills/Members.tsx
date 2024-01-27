import { IconArrowNarrowRight } from '@tabler/icons-react';
import { RoundedButton } from 'src/components/ui';
import { MemberForm, MemberList } from 'src/features/split-bills';
import useBreakpoint from 'src/hooks/useBreakpoint';
import useMembers from 'src/hooks/useMembers';
import { Member } from 'src/models/Member';

export function Members() {
  const { md } = useBreakpoint();
  const { members, addMember, deleteMember } = useMembers();

  const onEdit = (member: Member) => {
    console.log(member);
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-4 md:flex md:gap-4'>
        <div className='w-full text-center md:pt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Miembros</h1>
          <p>
            Agrega a los miembros del grupo con quienes dividirás los gastos. En
            el siguiente paso podrás agregar las deudas.
          </p>
          {md && (
            <RoundedButton className='mt-4 w-full min-w-full bg-amber-200 px-8 shadow-sm md:w-min'>
              Deudas
              <IconArrowNarrowRight></IconArrowNarrowRight>
            </RoundedButton>
          )}
        </div>

        <div className='w-full space-y-8'>
          <MemberForm onSubmit={addMember} />
          <MemberList
            members={members}
            onEdit={onEdit}
            onDelete={deleteMember}
          />
        </div>
      </div>

      {!md && (
        <RoundedButton className='sticky bottom-2 w-full min-w-full bg-amber-200 px-8 shadow-sm md:w-min'>
          Deudas
          <IconArrowNarrowRight></IconArrowNarrowRight>
        </RoundedButton>
      )}
    </div>
  );
}

export default Members;
