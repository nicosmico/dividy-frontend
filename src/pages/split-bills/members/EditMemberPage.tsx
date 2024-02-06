import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog, RoundedButton } from 'src/components/ui';
import { MemberForm } from 'src/features/split-bills';
import useMembers from 'src/hooks/useMembers';
import { Member } from 'src/models/Member';

export function EditMemberPage() {
  const { memberId } = useParams();
  const { getMember, updateMember } = useMembers();
  const [member, setMember] = useState<Member | undefined>();
  const [open, setOpen] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!memberId) return;
    setMember(getMember(memberId));
  }, []);

  const handleClose = () => {
    navigate('..');
  };

  const onSubmit = (memberData: Member) => {
    console.log(member);
    updateMember(member!.id, memberData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} className='space-y-8'>
      <div>
        {member && (
          <img
            className='mx-auto max-w-[50px] rounded-full border-2 border-zinc-800 p-0.5'
            src={member.picture}
            alt={member.name}
          />
        )}
        <h1 className='text-center'>Editar miembro</h1>
      </div>

      {member && (
        <MemberForm
          onSubmitForm={onSubmit}
          defaultValues={member}
          className='space-y-4'
          inputsClassName='bg-neutral-100'
          showDetail
        >
          <div className='flex justify-end gap-2'>
            <RoundedButton
              className='w-full bg-red-400 text-white md:w-fit'
              onClick={() => setOpen(false)}
            >
              Cancelar
            </RoundedButton>
            <RoundedButton
              type='submit'
              className='w-full bg-zinc-900 text-white md:w-fit'
            >
              Guardar
            </RoundedButton>
          </div>
        </MemberForm>
      )}
    </Dialog>
  );
}

export default EditMemberPage;
