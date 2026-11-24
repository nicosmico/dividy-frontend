import { memo, useEffect, useState } from 'react';

import type { Member } from '@/domain';
import { cn } from '@/lib/utils';
import { AVATAR_INK, avatarBackground } from './avatar-palette';
import {
  avatarKey,
  getCachedAvatarUri,
  loadAvatarUri,
  type AvatarMood,
} from './avatar-uri';

interface MemberAvatarProps {
  member: Pick<Member, 'name' | 'avatar'>;
  /** Happy mouth by default; `sad` for members who owe money. */
  mood?: AvatarMood;
  /** The name is already next to the avatar: hide it from assistive tech. */
  decorative?: boolean;
  className?: string;
}

const BASE = 'size-10 shrink-0 rounded-full';

/**
 * Round avatar drawn from `member.avatar` (face = seed, background = color)
 * and the mood. The illustration is generated on demand; until it is ready
 * (or if it fails) a circle of the same size and color shows the member's
 * initial, so nothing shifts. `data-avatar-color` exposes the palette index.
 */
export const MemberAvatar = memo(function MemberAvatar({
  member,
  mood = 'happy',
  decorative = false,
  className,
}: MemberAvatarProps) {
  const { seed, color } = member.avatar;
  const spec = { seed, color, mood };
  const key = avatarKey(spec);
  const [loaded, setLoaded] = useState<{ key: string; uri: string } | null>(
    null
  );
  const cached = getCachedAvatarUri(spec);
  const uri = cached ?? (loaded?.key === key ? loaded.uri : undefined);

  useEffect(() => {
    if (cached) return;
    let active = true;
    loadAvatarUri({ seed, color, mood }).then(
      (next) => active && setLoaded({ key, uri: next }),
      () => {} // keeps the placeholder
    );
    return () => {
      active = false;
    };
  }, [cached, key, seed, color, mood]);

  if (!uri) {
    return (
      <span
        {...(decorative
          ? { 'aria-hidden': true }
          : { role: 'img', 'aria-label': member.name })}
        data-mood={mood}
        data-avatar-color={color}
        style={{ backgroundColor: avatarBackground(color), color: AVATAR_INK }}
        className={cn(
          BASE,
          'flex items-center justify-center text-sm font-semibold uppercase',
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
      data-avatar-color={color}
      className={cn(BASE, 'object-cover', className)}
    />
  );
});
