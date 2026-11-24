import { memo, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import {
  getCachedAvatarUri,
  loadAvatarUri,
  type AvatarMood,
} from './avatar-uri';

interface MemberAvatarProps {
  member: { id: string; name: string };
  /** Happy mouth by default; `sad` for members who owe money. */
  mood?: AvatarMood;
  /** The name is already next to the avatar: hide it from assistive tech. */
  decorative?: boolean;
  className?: string;
}

const BASE = 'size-10 shrink-0 rounded-full bg-secondary';

/**
 * Round avatar seeded with the member id, so it never changes on rename. The
 * illustration is generated on demand; until it is ready (or if it fails) a
 * circle of the same size shows the member's initial, so nothing shifts.
 */
export const MemberAvatar = memo(function MemberAvatar({
  member,
  mood = 'happy',
  decorative = false,
  className,
}: MemberAvatarProps) {
  const key = `${mood}:${member.id}`;
  const [loaded, setLoaded] = useState<{ key: string; uri: string } | null>(
    null
  );
  const cached = getCachedAvatarUri(member.id, mood);
  const uri = cached ?? (loaded?.key === key ? loaded.uri : undefined);

  useEffect(() => {
    if (cached) return;
    let active = true;
    loadAvatarUri(member.id, mood).then(
      (next) => active && setLoaded({ key, uri: next }),
      () => {} // keeps the placeholder
    );
    return () => {
      active = false;
    };
  }, [cached, key, member.id, mood]);

  if (!uri) {
    return (
      <span
        {...(decorative
          ? { 'aria-hidden': true }
          : { role: 'img', 'aria-label': member.name })}
        data-mood={mood}
        className={cn(
          BASE,
          'flex items-center justify-center text-sm font-semibold text-muted-foreground uppercase',
          className
        )}
      >
        <span aria-hidden='true'>{Array.from(member.name)[0] ?? '?'}</span>
      </span>
    );
  }

  return (
    <img
      src={uri}
      alt={decorative ? '' : member.name}
      width={40}
      height={40}
      data-mood={mood}
      className={cn(BASE, 'object-cover', className)}
    />
  );
});
