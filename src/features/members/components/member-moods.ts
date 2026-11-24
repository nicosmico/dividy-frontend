import { useMemo } from 'react';

import { computeBalances, type Group, type MemberId } from '@/domain';
import type { AvatarMood } from './avatar-uri';

/**
 * Decision 93: sad while the member has money pending (owes or is owed, any
 * balance other than zero), happy once they are even.
 */
export function moodForBalance(balance: number): AvatarMood {
  return balance === 0 ? 'happy' : 'sad';
}

/** Mood of every member of the group, from the domain balances. */
export function computeMemberMoods(group: Group): Map<MemberId, AvatarMood> {
  return new Map(
    computeBalances(group).map((b) => [b.memberId, moodForBalance(b.balance)])
  );
}

/**
 * `Map<MemberId, mood>` for the group, recalculated only when it changes.
 * Use it wherever a member avatar is shown: `mood={moods.get(member.id)}`.
 */
export function useMemberMoods(group: Group): Map<MemberId, AvatarMood> {
  return useMemo(() => computeMemberMoods(group), [group]);
}
