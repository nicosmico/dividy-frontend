import { IconUsersGroup, IconX } from '@tabler/icons-react';
import { Card, IconButton, Status } from '../../../components/ui';
import { Member } from '../../../models/Member';

interface Props {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}
export function MemberList({ members, onEdit, onDelete }: Props) {
  if (!members.length) {
    return (
      <Status
        title='Agrega los miembros'
        description='Debes agregar al menos 2 miembros'
        icon={<IconUsersGroup size={48}></IconUsersGroup>}
        className='py-8'
      />
    );
  }

  return (
    <ul className='space-y-2'>
      {members.map((member) => (
        <li key={member.id}>
          <Card
            className='flex items-center justify-between'
            onClick={() => onEdit(member)}
          >
            <div className='flex min-w-0 items-center gap-4'>
              <img
                className='max-w-[50px] rounded-full border-2 border-zinc-800 p-0.5'
                src={`https://doodleipsum.com/100x100/avatar-4?n=${member.id}`}
                alt={member.name}
              />
              <span className='truncate'>{member.name}</span>
            </div>

            <IconButton
              className='px-1 py-1 text-red-400 md:hover:bg-red-400 md:hover:text-white'
              onClick={(event) => {
                event.stopPropagation();
                onDelete(member);
              }}
            >
              <IconX></IconX>
            </IconButton>
          </Card>
        </li>
      ))}
    </ul>
  );
}
