import { IconPencil, IconUsersGroup, IconX } from '@tabler/icons-react';
import { IconButton, Status } from '../../../components/ui';
import { Member } from '../../../models/Member';

interface Props {
  members: Member[];
}
export function MemberList({ members }: Props) {
  if (!members.length) {
    return (
      <Status
        title='Agrega los miembros'
        description='Debes agregar al menos 2 miembros'
        icon={<IconUsersGroup size={48}></IconUsersGroup>}
      />
    );
  }

  return (
    <ul className='space-y-2'>
      {members.map((member) => (
        <li
          key={member.id}
          className='flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-2'
        >
          <div className='flex items-center gap-4'>
            <img
              className='max-w-[50px] rounded-full border-2 border-zinc-800 p-0.5'
              src={`https://doodleipsum.com/100x100/avatar-5?n=${member.id}`}
              alt={member.name}
            />
            <span>{member.name}</span>
          </div>
          <div className='flex items-center gap-1'>
            <IconButton className='bg-zinc-800 py-1 text-white'>
              <IconPencil></IconPencil>
            </IconButton>
            <IconButton className='bg-red-400 py-1 text-white'>
              <IconX></IconX>
            </IconButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
