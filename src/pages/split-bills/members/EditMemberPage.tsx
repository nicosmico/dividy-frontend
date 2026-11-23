import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MemberForm } from '@/features/split-bills';
import { TMemberForm } from '@/features/split-bills/components/MemberForm';
import useMembers from '@/features/split-bills/hooks/useMembers';
import { SubmitButton } from '@/features/split-bills/types/forms';
import { Member } from '@/features/split-bills/types/member';
import { Dialog, useSnackBar } from '@/shared';

export function EditMemberPage() {
  const { memberId } = useParams();
  const { members, updateMember } = useMembers();
  const [open, setOpen] = useState(true);
  const { showMessage } = useSnackBar();

  const navigate = useNavigate();

  const member: Member | undefined = memberId ? members[memberId] : undefined;

  const handleClose = () => {
    navigate('..');
  };

  const handleEditMember = (values: TMemberForm) => {
    updateMember(memberId!, values);
    setOpen(false);
    showMessage('Miembro editado ✨');
  };

  return (
    <Dialog open={open} onClose={handleClose} className='space-y-8'>
      <div>
        {member && (
          <img
            className='mx-auto max-w-[50px] rounded-full bg-amber-200 p-0.5 shadow-xs'
            src={member.picture.happy}
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
