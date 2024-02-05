import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomSheet, RoundedButton } from 'src/components/ui';
import { MemberForm } from 'src/features/split-bills';
import useMembers from 'src/hooks/useMembers';
import { Member } from 'src/models/Member';

export function EditMembers() {
  const { memberId } = useParams();
  const { getMemberByID } = useMembers();
  const [member, setMember] = useState<Member | undefined>();

  const navigate = useNavigate();

  useEffect(() => {
    if (!memberId) return;
    setMember(getMemberByID(memberId));
  }, []);

  const handleClose = () => {
    navigate('..');
  };

  return (
    <BottomSheet isOpen onClose={handleClose} className='space-y-8'>
      <div>
        {member && (
          <img
            className='mx-auto max-w-[50px] rounded-full border-2 border-zinc-800 p-0.5'
            src={`https://doodleipsum.com/100x100/avatar-4?n=${member.id}`}
            alt={member.name}
          />
        )}
        <h1 className='text-center'>Editar miembro</h1>
      </div>

      <MemberForm onSubmit={() => console.log('submit')} />

      <div className='flex justify-end gap-2'>
        <RoundedButton
          className='w-full bg-red-400 text-white md:w-fit'
          onClick={handleClose}
        >
          Cancelar
        </RoundedButton>
        <RoundedButton className='w-full bg-zinc-900 text-white md:w-fit'>
          Guardar
        </RoundedButton>
      </div>
    </BottomSheet>
  );
}

export default EditMembers;
