import { IconArrowNarrowRight } from '@tabler/icons-react';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { BottomSheet, RoundedButton } from 'src/components/ui';
import { MemberForm, MemberList } from 'src/features/split-bills';
import useMembers from 'src/hooks/useMembers';

export function Members() {
  const { members, addMember, deleteMember } = useMembers();
  const navigate = useNavigate();
  const [open, setopen] = useState(false);

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
            <MemberForm onSubmit={addMember} />
            <MemberList
              members={members}
              onDelete={deleteMember}
              onEdit={(member) => navigate(`${member.id}/edit`)}
            />
          </div>
        </div>

        <button onClick={() => setopen(true)}>open</button>
      </div>

      <Outlet />
      <BottomSheet
        className='space-y-8'
        isOpen={open}
        onClose={() => setopen(false)}
      >
        <h1>content here!</h1>
        <p>
          Al cerrar haciendo click afuera hace la animacion, pero usando el
          boton no :(
        </p>
        <button onClick={() => setopen(false)}>close</button>
      </BottomSheet>
    </>
  );
}

export default Members;
