import { memo } from 'react';

import { cn } from '@/lib/utils';
import { getAvatarUri, type AvatarMood } from './avatar-uri';

interface MemberAvatarProps {
  member: { id: string; name: string };
  /** Happy mouth by default; `sad` for members who owe money. */
  mood?: AvatarMood;
  className?: string;
}

/** Round avatar seeded with the member id, so it never changes on rename. */
export const MemberAvatar = memo(function MemberAvatar({
  member,
  mood = 'happy',
  className,
}: MemberAvatarProps) {
  return (
    <img
      src={getAvatarUri(member.id, mood)}
      alt={member.name}
      width={40}
      height={40}
      loading='lazy'
      className={cn(
        'size-10 shrink-0 rounded-full bg-secondary object-cover',
        className
      )}
    />
  );
});
