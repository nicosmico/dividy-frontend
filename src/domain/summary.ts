import { computeBalances } from './balances';
import { formatAmount } from './money';
import { describeSplitValues, splitTypeLabel } from './split';
import { suggestTransfers } from './transfers';
import type { Group, MemberId } from './types';

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

export interface SummaryOptions {
  /** Formatted date of a snapshot: adds "Cuentas al <asOf>" under the title. */
  asOf?: string;
  /** Read-only link: adds "Ver el detalle: <link>" at the end. */
  link?: string;
}

/** WhatsApp-friendly Spanish summary of the group (uses the group's order). */
export function formatGroupSummary(
  group: Group,
  options: SummaryOptions = {}
): string {
  const nameOf = new Map<MemberId, string>(
    group.members.map((m) => [m.id, m.name])
  );
  const name = (id: MemberId) => nameOf.get(id) ?? '?';
  const lines: string[] = [`*${group.name}*`];
  if (options.asOf) lines.push(`Cuentas al ${options.asOf}`);
  lines.push('');

  lines.push('*Gastos*');
  if (group.expenses.length === 0) {
    lines.push('Aún no hay gastos.');
  } else {
    for (const e of group.expenses) {
      const participants = new Set(e.split.participantIds);
      const among = group.members
        .filter((m) => participants.has(m.id))
        .map((m) => m.name);
      const how =
        e.split.type === 'equal'
          ? `entre ${joinNames(among)}`
          : `${splitTypeLabel(e.split.type)} (${describeSplitValues(e.split, group.members)})`;
      lines.push(
        `• ${e.description}: ${formatAmount(e.amount)}, pagó ${name(e.payerId)}, ${how}`
      );
    }
  }

  lines.push('', '*Saldos*');
  for (const b of computeBalances(group)) {
    const who = name(b.memberId);
    if (b.balance > 0)
      lines.push(`• ${who}: le deben ${formatAmount(b.balance)}`);
    else if (b.balance < 0)
      lines.push(`• ${who}: debe ${formatAmount(-b.balance)}`);
    else lines.push(`• ${who}: está al día`);
  }

  lines.push('', '*Para quedar al día*');
  const transfers = suggestTransfers(group);
  if (transfers.length === 0) {
    lines.push('¡Están al día! 🎉');
  } else {
    for (const t of transfers) {
      lines.push(
        `• ${name(t.fromId)} le transfiere ${formatAmount(t.amount)} a ${name(t.toId)}`
      );
    }
  }
  if (options.link) lines.push('', `Ver el detalle: ${options.link}`);
  return lines.join('\n');
}
