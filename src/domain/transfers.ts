import { computeBalances } from './balances';
import type { Amount, Group, MemberId } from './types';

export interface SuggestedTransfer {
  fromId: MemberId;
  toId: MemberId;
  amount: Amount;
}

/** Above this many people with a balance, step 1 (self-settling groups) is skipped. */
export const MAX_PEOPLE_FOR_SPLITTING = 15;

export interface Party {
  id: MemberId;
  /** Signed balance in minor units: positive is owed to them, negative is owed by them. */
  balance: Amount;
}

/**
 * Splits people with a balance into the largest possible number of subgroups
 * whose balances sum to 0 (DP over bitmasks, O(2^n * n)). Each subgroup can be
 * settled on its own, so the minimum number of transfers is people - subgroups.
 * Over the limit it returns a single group. Keeps the members' order.
 */
function partitionIntoSelfSettling(parties: Party[]): Party[][] {
  const n = parties.length;
  if (n === 0) return [];
  if (n > MAX_PEOPLE_FOR_SPLITTING) return [parties];
  const size = 1 << n;
  const sums = new Float64Array(size);
  const best = new Int8Array(size);
  for (let mask = 1; mask < size; mask++) {
    const low = 31 - Math.clz32(mask & -mask);
    sums[mask] = sums[mask & (mask - 1)] + parties[low].balance;
    let top = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) top = Math.max(top, best[mask ^ (1 << i)]);
    }
    best[mask] = top + (sums[mask] === 0 ? 1 : 0);
  }
  // Walk down from everyone removing the first person that keeps the optimum;
  // each zero-sum mask on the way closes a subgroup.
  const groups: Party[][] = [];
  let mask = size - 1;
  let closed = 0;
  while (mask) {
    const gain = sums[mask] === 0 ? 1 : 0;
    let next = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i) && best[mask ^ (1 << i)] + gain === best[mask]) {
        next = mask ^ (1 << i);
        break;
      }
    }
    if (gain === 1) {
      if (closed)
        groups.push(
          parties.filter(
            (_, i) => (closed & (1 << i)) !== 0 && (mask & (1 << i)) === 0
          )
        );
      closed = mask;
    }
    mask = next;
  }
  groups.push(parties.filter((_, i) => (closed & (1 << i)) !== 0));
  return groups;
}

/**
 * Settles one self-settling subgroup. Debtors go from the smallest debt to the
 * biggest; each pays whole to the creditor with the most pending balance that
 * can take it whole. If none can, the debtor splits the payment among the
 * creditors with the most pending balance first. Every transfer clears a
 * debtor or a creditor, so a subgroup of k people needs at most k - 1.
 */
function settleGroup(parties: Party[]): SuggestedTransfer[] {
  const debtors = parties
    .filter((p) => p.balance < 0)
    .map((p) => ({ id: p.id, debt: -p.balance }))
    // stable sort: ties keep the members' order
    .sort((a, b) => a.debt - b.debt);
  const creditors = parties
    .filter((p) => p.balance > 0)
    .map((p) => ({ id: p.id, left: p.balance }));

  const transfers: SuggestedTransfer[] = [];
  for (const debtor of debtors) {
    let whole: (typeof creditors)[number] | null = null;
    for (const c of creditors) {
      if (c.left >= debtor.debt && (!whole || c.left > whole.left)) whole = c;
    }
    const targets = whole
      ? [whole]
      : creditors.filter((c) => c.left > 0).sort((a, b) => b.left - a.left);
    let owed = debtor.debt;
    for (const c of targets) {
      if (owed === 0) break;
      const amount = Math.min(owed, c.left);
      transfers.push({ fromId: debtor.id, toId: c.id, amount });
      c.left -= amount;
      owed -= amount;
    }
  }
  return transfers;
}

/**
 * Suggested transfers (ADR 0011), in two steps:
 * 1. split the people with a balance into the most subgroups that settle among
 *    themselves, which gives the minimum number of transfers;
 * 2. inside each subgroup, every debtor pays whole to a single creditor when
 *    possible, so only the ones who owe the most split their payment.
 * All integers in minor units; nothing is divided. Deterministic: ties follow
 * the members' order. The list goes from the biggest debtor to the smallest.
 */
export function suggestTransfers(group: Group): SuggestedTransfer[] {
  return settleBalances(
    computeBalances(group).map((b) => ({ id: b.memberId, balance: b.balance }))
  );
}

/**
 * The algorithm over plain balances (in members' order, summing 0). Exported
 * for tests that generate balances directly; not part of the public API.
 */
export function settleBalances(balances: Party[]): SuggestedTransfer[] {
  const parties = balances.filter((b) => b.balance !== 0);
  const debt = new Map(parties.map((p) => [p.id, -p.balance]));
  return partitionIntoSelfSettling(parties)
    .flatMap(settleGroup)
    .sort((a, b) => debt.get(b.fromId)! - debt.get(a.fromId)!);
}

/**
 * Total money still to be moved to settle the group: the sum of the suggested
 * transfers. 0 when the group is settled.
 */
export function getPendingAmount(group: Group): Amount {
  return suggestTransfers(group).reduce((sum, t) => sum + t.amount, 0);
}
