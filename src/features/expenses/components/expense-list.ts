import type { Expense } from '@/domain';
import { formatDate, todayLocal } from '@/lib/dates';

/** Newest date first; on the same date, the most recently created first. */
export function sortExpenses(expenses: readonly Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );
}

export function dateLabel(date: string, today = new Date()): string {
  if (date === todayLocal(today)) return 'Hoy';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date === todayLocal(yesterday)) return 'Ayer';
  return formatDate(date);
}

export function groupByDate(expenses: Expense[]) {
  const days: { date: string; expenses: Expense[] }[] = [];
  for (const expense of expenses) {
    const last = days[days.length - 1];
    if (last && last.date === expense.date) last.expenses.push(expense);
    else days.push({ date: expense.date, expenses: [expense] });
  }
  return days;
}
