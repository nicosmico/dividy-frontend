import { useEffect, useState } from 'react';
import { Dialog } from 'src/components/ui';
import { MemberForm } from 'src/features/split-bills';
import { TMemberForm } from 'src/features/split-bills/components/MemberForm';
import useMembers from 'src/features/split-bills/hooks/useMembers';
import { SubmitButton } from 'src/features/split-bills/types/forms';
import { Member } from 'src/features/split-bills/types/member';

interface Props {
  memberId: string;
  onClose?: () => void;
}
export function EditMemberPage({ memberId, onClose }: Props) {
  const { members, updateMember } = useMembers();
  const [member, setMember] = useState<Member | undefined>();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    setMember(members[memberId]);
  }, [setMember, members, memberId]);

  const handleEditMember = (values: TMemberForm) => {
    updateMember(memberId!, values);
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} className='space-y-8'>
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
