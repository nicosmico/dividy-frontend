import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog } from 'src/components/ui';
import { MemberForm } from 'src/features/split-bills';
import { TMemberForm } from 'src/features/split-bills/components/MemberForm';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { SubmitButton } from 'src/features/split-bills/types/forms';
import { Member } from 'src/features/split-bills/types/member';

export function EditMemberPage() {
  const { memberUUID } = useParams();
  const { members, updateMember } = useMembers();
  const [member, setMember] = useState<Member | undefined>();
  const [open, setOpen] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!memberUUID) return;
    setMember(members[memberUUID]);
  }, [setMember, members, memberUUID]);

  const handleClose = () => {
    navigate('..');
  };

  const handleEditMember = (values: TMemberForm) => {
    updateMember(memberUUID!, values);
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
          onValid={handleEditMember}
          defaultValues={member}
          inputsClassName='bg-neutral-100'
          showDetail
          submitButton={SubmitButton.BOTTOM_SAVE_CANCEL}
          onCancel={() => setOpen(false)}
        ></MemberForm>
      )}
    </Dialog>
  );
}

export default EditMemberPage;
