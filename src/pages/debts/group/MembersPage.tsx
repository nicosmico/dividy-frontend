import { IconArrowNarrowRight } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { MemberList } from 'src/features/split-bills';
import {
  MemberForm,
  TMemberForm,
} from 'src/features/split-bills/components/MemberForm';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { Avatar } from 'src/features/split-bills/services/avatar';
import { Input, RoundedLink } from 'src/shared';

export function MembersPage() {
  const { members, membersOrder, addMember, deleteMember } = useMembers();
  const navigate = useNavigate();

  const handleAddMember = (values: TMemberForm) => {
    addMember({
      ...values,
      picture: {
        happy: Avatar.happy(values.name),
        sad: Avatar.sad(values.name),
      },
    });
  };

  return (
    <>
      <Outlet /> {/* For EditMemberPage */}
      <div className='grid w-full grid-cols-1 gap-6 md:gap-3 md:grid-cols-2 md:grid-rows-[min-content_1fr]'>
        <div className='space-y-2 text-center md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-2 md:mt-20 md:text-left'>
          <h1 className='text-xl font-bold'>Grupo</h1>
          <div className='space-y-2'>
            <p>
              Dale un nombre al grupo y agrega los miembros
            </p>
            <div className='space-y-2'>
              <Input label='Nombre de grupo' placeholder='Ej: Viaje a Dichato'></Input>
              {/* <InputError error={}></InputError> */}
            </div>
          </div>
        </div>

        <div className='space-y-4 md:col-start-2 md:col-end-3 md:row-span-full'>
          <div className='space-y-2'>
            <p className='text-center md:text-left text-sm font-semibold'>Miembros</p>
            <MemberForm onValid={handleAddMember} resetOnSubmit></MemberForm>
          </div>
          <MemberList
            members={membersOrder.map((id) => members[id])}
            onDelete={deleteMember}
            onEdit={(member) => navigate(`${member.id}/edit`)}
          />
        </div>

        <div className='bottom-2 md:col-start-1 md:col-end-2 md:row-start-2 md:row-end-3'>
          <RoundedLink
            to='../expenses'
            disabled={membersOrder.length < 2}
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
