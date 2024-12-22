import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MemberForm } from 'src/features/split-bills';
import { TMemberForm } from 'src/features/split-bills/components/MemberForm';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { SubmitButton } from 'src/features/split-bills/types/forms';
import { Member } from 'src/features/split-bills/types/member';
import { Dialog, useSnackBar } from 'src/shared';

export function EditMemberPage() {
  const { memberId } = useParams();
  const { members, updateMember } = useMembers();
  const [member, setMember] = useState<Member | undefined>();
  const [open, setOpen] = useState(true);
  const { showMessage } = useSnackBar();

  const navigate = useNavigate();

  useEffect(() => {
    if (!memberId) return;
    setMember(members[memberId]);
  }, [setMember, members, memberId]);

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
            className='mx-auto max-w-[50px] rounded-full bg-amber-200 p-0.5 shadow-sm'
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
