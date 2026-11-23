import { Pencil, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getMemberRemovalImpact, removeMember, type Member } from '@/domain';
import {
  isInfrastructureError,
  toastUndoable,
  useCurrentGroup,
  useGroupOperation,
} from '@/features/groups/data';
import { restoreFocusIfLost } from '@/lib/focus';
import { AddMemberForm } from './AddMemberForm';
import { MemberAvatar } from './MemberAvatar';
import { RemoveMemberDialog } from './RemoveMemberDialog';
import { RenameMemberDialog } from './RenameMemberDialog';

/** Members tab: list, add, rename and remove. */
export function MembersTab() {
  const group = useCurrentGroup();
  const [renaming, setRenaming] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const operation = useGroupOperation(group.id);
  const heading = useRef<HTMLHeadingElement>(null);

  /**
   * A member without activity is removed right away, with "Deshacer". One with
   * activity opens the dialog where the user chooses what happens to it.
   */
  async function requestRemove(member: Member) {
    const impact = getMemberRemovalImpact(group, member.id);
    if (impact.ok && impact.value.requiresStrategy) {
      setRemoving(member);
      return;
    }
    const result = await operation.run((g) =>
      removeMember(g, member.id, { type: 'none' })
    );
    if (result.ok) {
      toastUndoable(`${member.name} fue eliminado del grupo`, result);
      // The delete button that had focus is gone.
      restoreFocusIfLost(heading.current);
    } else if (!isInfrastructureError(result.error))
      toast.error(result.error.message);
  }

  return (
    <div className='grid gap-4'>
      <Card className='p-5'>
        <h2 className='mb-3 font-semibold'>Agregar miembro</h2>
        <AddMemberForm group={group} />
      </Card>

      <section aria-labelledby='members-heading' className='grid gap-2'>
        <h2
          id='members-heading'
          ref={heading}
          tabIndex={-1}
          className='text-sm font-semibold outline-none'
        >
          {group.members.length}{' '}
          {group.members.length === 1 ? 'miembro' : 'miembros'}
        </h2>
        <ul className='grid gap-2'>
          {group.members.map((member) => (
            <li key={member.id}>
              <Card className='flex-row items-center gap-3 p-2 pl-3'>
                <MemberAvatar member={member} />
                <span className='min-w-0 flex-1 font-medium break-words'>
                  {member.name}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Renombrar a ${member.name}`}
                  onClick={() => setRenaming(member)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Eliminar a ${member.name}`}
                  disabled={operation.isPending}
                  onClick={() => void requestRemove(member)}
                >
                  <Trash2 />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <RenameMemberDialog
        group={group}
        member={renaming}
        onClose={() => setRenaming(null)}
      />
      <RemoveMemberDialog
        group={group}
        member={removing}
        onClose={() => {
          setRemoving(null);
          restoreFocusIfLost(heading.current);
        }}
      />
    </div>
  );
}
