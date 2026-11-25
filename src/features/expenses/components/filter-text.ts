import {
  formatAmount,
  type ExpenseFilter,
  type ExpensesSummary,
  type Group,
  type MemberId,
} from '@/domain';

function nameOf(group: Pick<Group, 'members'>, memberId: MemberId): string {
  return group.members.find((m) => m.id === memberId)?.name ?? 'alguien';
}

/** What the filter shows, as a title for the total: "Donde participas", "Gastos de Carla". */
export function filterTitle(
  filter: ExpenseFilter,
  group: Pick<Group, 'members'>
): string {
  switch (filter.kind) {
    case 'mine':
      return 'Donde participas';
    case 'paid':
      return 'Lo que pagaste';
    case 'member':
      return `Gastos de ${nameOf(group, filter.memberId)}`;
    case 'paidby':
      return `Lo que pagó ${nameOf(group, filter.memberId)}`;
  }
}

/** The text of the "Persona" chip: "Persona", "Carla" or "Carla pagó". */
export function personChipText(
  filter: ExpenseFilter | null,
  group: Pick<Group, 'members'>
): string {
  if (filter?.kind === 'member') return nameOf(group, filter.memberId);
  if (filter?.kind === 'paidby')
    return `${nameOf(group, filter.memberId)} pagó`;
  return 'Persona';
}

/** A search as it reads in the total: trimmed, with single spaces. */
export function tidyQuery(query: string): string {
  return query.trim().replace(/\s+/gu, ' ');
}

export function totalLabel(
  filter: ExpenseFilter | null,
  query: string,
  group: Pick<Group, 'members'>
): string {
  const tidy = tidyQuery(query);
  if (tidy) return `Coinciden con "${tidy}"`;
  return filter ? filterTitle(filter, group) : 'Total del grupo';
}

/**
 * The small line under the total while something is filtered:
 * "2 de 23 gastos · tu parte $6.000". With a search and a chip the chip is
 * named too; in "Gastos de Carla" Carla's share is added.
 */
export function totalDetail({
  summary,
  groupCount,
  filter,
  hasQuery,
  group,
  viewerId,
}: {
  summary: ExpensesSummary;
  groupCount: number;
  filter: ExpenseFilter | null;
  hasQuery: boolean;
  group: Pick<Group, 'members' | 'currency'>;
  viewerId: MemberId | null;
}): string {
  const parts = [
    `${summary.count} de ${groupCount} ${groupCount === 1 ? 'gasto' : 'gastos'}`,
  ];
  if (hasQuery && filter) parts.push(filterTitle(filter, group));
  if (summary.viewerShare !== null) {
    parts.push(`tu parte ${formatAmount(summary.viewerShare, group.currency)}`);
  }
  if (
    filter?.kind === 'member' &&
    summary.memberShare !== null &&
    filter.memberId !== viewerId
  ) {
    parts.push(
      `parte de ${nameOf(group, filter.memberId)} ${formatAmount(summary.memberShare, group.currency)}`
    );
  }
  return parts.join(' · ');
}
