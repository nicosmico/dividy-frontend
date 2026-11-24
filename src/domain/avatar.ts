import { fail, ok } from './result';
import type { Group, Member, MemberAvatar, MemberId, Result } from './types';

/** Number of background colors of the avatar palette (indexes 0 to 7). */
export const AVATAR_COLOR_COUNT = 8;

/**
 * Color for a new member: the first one no other member uses. When all of
 * them are taken it starts over in order (the least used one, lowest index
 * first), so the 9th member gets color 0, the 10th color 1, and so on.
 * Stored on the member, so deleting someone never changes the others' colors.
 */
export function nextAvatarColor(
  members: ReadonlyArray<{ avatar: Pick<MemberAvatar, 'color'> }>
): number {
  const uses = new Array<number>(AVATAR_COLOR_COUNT).fill(0);
  for (const { avatar } of members) {
    if (isValidAvatarColor(avatar.color)) uses[avatar.color]++;
  }
  let best = 0;
  for (let color = 1; color < AVATAR_COLOR_COUNT; color++) {
    if (uses[color] < uses[best]) best = color;
  }
  return best;
}

export function isValidAvatarColor(color: unknown): color is number {
  return (
    typeof color === 'number' &&
    Number.isInteger(color) &&
    color >= 0 &&
    color < AVATAR_COLOR_COUNT
  );
}

/** A color from 0 to 7 and a non-empty seed. */
export function validateAvatar(avatar: MemberAvatar): Result<MemberAvatar> {
  if (!isValidAvatarColor(avatar.color)) {
    return fail(
      'invalid_avatar',
      `No se pudo cambiar la cara: el color debe ser un número entero entre 0 y ${AVATAR_COLOR_COUNT - 1}.`
    );
  }
  if (typeof avatar.seed !== 'string' || avatar.seed.trim().length === 0) {
    return fail(
      'invalid_avatar',
      'No se pudo cambiar la cara. Inténtalo de nuevo.'
    );
  }
  return ok({ color: avatar.color, seed: avatar.seed });
}

/**
 * Gives a member a new face (same color). The seed is injected by the caller
 * (`newId()` in the UI) so the domain stays deterministic. Other members are
 * never touched.
 */
export function regenerateMemberAvatar(
  group: Group,
  memberId: MemberId,
  seed: string
): Result<Group> {
  const member = group.members.find((m) => m.id === memberId);
  if (!member) {
    return fail(
      'member_not_found',
      'Ese miembro ya no está en el grupo. Vuelve a la lista de miembros.'
    );
  }
  const avatar = validateAvatar({ color: member.avatar.color, seed });
  if (!avatar.ok) return avatar;
  return ok({
    ...group,
    members: group.members.map((m): Member =>
      m.id === memberId ? { ...m, avatar: avatar.value } : m
    ),
  });
}
