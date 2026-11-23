import { computeBalances } from './balances';
import type { Amount, Group, MemberId } from './types';

export interface SuggestedTransfer {
  fromId: MemberId;
  toId: MemberId;
  amount: Amount;
}

/**
 * Greedy settlement (ADR 0004): the biggest debtor pays the biggest creditor,
 * repeatedly. Ties are broken by member order. At most n - 1 transfers, all of
 * them positive integers between different members.
 */
export function suggestTransfers(group: Group): SuggestedTransfer[] {
  const debtors: { id: MemberId; left: Amount }[] = [];
  const creditors: { id: MemberId; left: Amount }[] = [];
  for (const { memberId, balance } of computeBalances(group)) {
    if (balance < 0) debtors.push({ id: memberId, left: -balance });
    else if (balance > 0) creditors.push({ id: memberId, left: balance });
  }

  type Entry = { id: MemberId; left: Amount };
  const biggest = (list: Entry[]) => {
    let best = -1;
    list.forEach((entry, i) => {
      // strict ">" keeps the earliest member on ties
      if (entry.left > 0 && (best === -1 || entry.left > list[best].left)) {
        best = i;
      }
    });
    return best === -1 ? null : list[best];
  };

  const transfers: SuggestedTransfer[] = [];
  for (;;) {
    const debtor = biggest(debtors);
    const creditor = biggest(creditors);
    if (!debtor || !creditor) break;
    const amount = Math.min(debtor.left, creditor.left);
    transfers.push({ fromId: debtor.id, toId: creditor.id, amount });
    debtor.left -= amount;
    creditor.left -= amount;
  }
  return transfers;
}

/**
 * Total money still to be moved to settle the group: the sum of the suggested
 * transfers. 0 when the group is settled.
 */
export function getPendingAmount(group: Group): Amount {
  return suggestTransfers(group).reduce((sum, t) => sum + t.amount, 0);
}
