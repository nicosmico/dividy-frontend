import type { Member } from '@/domain';
import { cn } from '@/lib/utils';
import type { AvatarMood } from './avatar-uri';
import { MemberAvatar } from './MemberAvatar';

interface AvatarButtonProps {
  member: Pick<Member, 'name' | 'avatar'>;
  mood?: AvatarMood;
  /** Called when the avatar is tapped: the caller gives the member a new face. */
  onRegenerate: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The member avatar as a 44 px touch target that asks for another face.
 * The button carries the name ("Cambiar avatar de Ana"), so the picture inside
 * is decorative.
 */
export function AvatarButton({
  member,
  mood,
  onRegenerate,
  disabled,
  className,
}: AvatarButtonProps) {
  return (
    <button
      type='button'
      aria-label={`Cambiar avatar de ${member.name}`}
      disabled={disabled}
      onClick={onRegenerate}
      className={cn(
        'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50',
        'active:scale-95 motion-reduce:active:scale-100',
        className
      )}
    >
      <MemberAvatar member={member} mood={mood} decorative />
    </button>
  );
}
