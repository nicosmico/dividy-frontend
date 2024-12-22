import { Bill } from 'src/features/split-bills/types/bill';
import { Member } from 'src/features/split-bills/types/member';
import { Transaction } from 'src/features/split-bills/types/transaction';
import { formatToCurrency } from 'src/shared/utils/format-to';

export function formatSplitBillSummary(
  bills: Record<string, Bill>,
  members: Record<string, Member>,
  transactions: Transaction[]
): string {
  let summary = '';

  // 1. Format members section
  summary += '*👥 Miembros*\n';
  Object.values(members).forEach((member) => {
    summary += `• ${member.name}\n`;
  });
  summary += '\n';

  // 2. Format bills section
  summary += '*🧾 Gastos*\n';
  Object.values(bills).forEach((bill) => {
    const paidByMember = members[bill.paidBy];
    const total = formatToCurrency(bill.total);
    const splitMembers = bill.members.map((id) => members[id].name).join(', ');

    summary += `• ${bill.name}\n`;
    summary += `  💰 ${total}\n`;
    summary += `  👤 Pagó: ${paidByMember.name}\n`;
    summary += `  👥 Dividido entre: ${splitMembers}\n`;
    summary += '\n';
  });

  // 3. Format simplified debts
  summary += '*💸 Deudas simplificadas*\n';
  transactions.forEach((transaction) => {
    const from = members[transaction.from];
    const to = members[transaction.to];
    const amount = formatToCurrency(transaction.amount);

    summary += `• ${from.name} debe a ${to.name}: ${amount}\n`;
  });

  return summary;
}
