import type { SuggestedTransfer } from '../transfers';

/**
 * The greedy settlement of ADR 0004, kept only as a reference: the biggest
 * debtor pays the biggest creditor, repeatedly (ties: members' order). The new
 * algorithm (ADR 0011) must never need more transfers than this one.
 */
export function greedyTransfers(
  balances: { id: string; balance: number }[]
): SuggestedTransfer[] {
  type Entry = { id: string; left: number };
  const debtors: Entry[] = [];
  const creditors: Entry[] = [];
  for (const { id, balance } of balances) {
    if (balance < 0) debtors.push({ id, left: -balance });
    else if (balance > 0) creditors.push({ id, left: balance });
  }
  const biggest = (list: Entry[]) => {
    let best = -1;
    list.forEach((entry, i) => {
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
