import { computeBalances } from './balances';
import { getPendingAmount, suggestTransfers } from './transfers';
import type { Amount, Group, GroupId, Member, MemberId } from './types';

/**
 * Who "you" are on this device (CONTEXT.md, Viewer): a member of a group or of
 * a snapshot, or nobody (`none`: "No soy parte de este grupo" / "Solo estoy
 * mirando"). It is a preference of the device, never part of a group or of a
 * link (ADR 0007).
 */
export type ViewerChoice = { memberId: MemberId } | { none: true };

/**
 * What a choice is about. A group of your own and a snapshot are different
 * things even when they share an id (a snapshot's `sourceGroupId` is the id of
 * the group it was taken from, and its members are `m0`, `m1`...).
 */
export interface ViewerScope {
  kind: 'group' | 'snapshot';
  /** The `groupId` of an own group, the `sourceGroupId` of a snapshot. */
  id: GroupId;
}

/** What the app knows about the viewer of a group, given what was saved. */
export type ViewerResolution =
  /** Nothing saved, or the saved member does not exist anymore: ask. */
  | { kind: 'unasked' }
  /** The viewer chose "none". */
  | { kind: 'none' }
  | { kind: 'member'; memberId: MemberId };

/** `true` for a saved member choice whose member is not in `members`. */
export function isStaleViewerChoice(
  members: readonly Pick<Member, 'id'>[],
  choice: ViewerChoice | null
): boolean {
  return (
    choice !== null &&
    'memberId' in choice &&
    !members.some((m) => m.id === choice.memberId)
  );
}

/** A choice that points to a missing member counts as "not asked yet". */
export function resolveViewer(
  members: readonly Pick<Member, 'id'>[],
  choice: ViewerChoice | null
): ViewerResolution {
  if (choice === null || isStaleViewerChoice(members, choice)) {
    return { kind: 'unasked' };
  }
  return 'memberId' in choice
    ? { kind: 'member', memberId: choice.memberId }
    : { kind: 'none' };
}

/**
 * Puts the items that involve the viewer first, keeping the relative order of
 * both parts. Without a viewer, or when no item involves them, the list comes
 * back in the same order. Never adds, drops or repeats an item.
 */
export function viewerFirst<T>(
  items: readonly T[],
  viewerId: MemberId | null,
  involvesViewer: (item: T) => boolean
): T[] {
  if (viewerId === null) return [...items];
  const mine: T[] = [];
  const others: T[] = [];
  for (const item of items) (involvesViewer(item) ? mine : others).push(item);
  return [...mine, ...others];
}

/** What the Saldos headline says. */
export type ViewerStatus =
  /** No viewer (or not a member of this group): the usual "Pendiente: $X por saldar". */
  | { kind: 'general'; pending: Amount }
  /** Everybody is even. */
  | { kind: 'group-settled' }
  /** The viewer owes `amount`, paid with one transfer per name in `payTo`. */
  | { kind: 'owes'; amount: Amount; payTo: string[] }
  | { kind: 'owed'; amount: Amount }
  /** The viewer is even but the group is not. */
  | { kind: 'even'; groupPending: Amount };

/** The headline for `viewerId` (`null` = no viewer). Amounts come from the same balances as the rest of Saldos. */
export function describeViewerStatus(
  group: Group,
  viewerId: MemberId | null
): ViewerStatus {
  const pending = getPendingAmount(group);
  if (pending === 0) return { kind: 'group-settled' };
  const mine = computeBalances(group).find((b) => b.memberId === viewerId);
  if (viewerId === null || !mine) return { kind: 'general', pending };
  if (mine.balance < 0) {
    const names = suggestTransfers(group)
      .filter((t) => t.fromId === viewerId)
      .map((t) => group.members.find((m) => m.id === t.toId)?.name ?? '');
    return { kind: 'owes', amount: -mine.balance, payTo: names };
  }
  if (mine.balance > 0) return { kind: 'owed', amount: mine.balance };
  return { kind: 'even', groupPending: pending };
}
