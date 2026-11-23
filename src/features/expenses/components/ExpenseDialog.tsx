import { ResponsiveDialog } from '@/components/responsive-dialog';
import type { Expense, Group } from '@/domain';
import { ExpenseForm } from './ExpenseForm';

interface ExpenseDialogProps {
  group: Group;
  /** `'new'` creates, an expense edits, `null` keeps the dialog closed. */
  target: Expense | 'new' | null;
  onClose: () => void;
}

export function ExpenseDialog({ group, target, onClose }: ExpenseDialogProps) {
  if (target === null) return null;
  const expense = target === 'new' ? undefined : target;
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={expense ? 'Editar gasto' : 'Nuevo gasto'}
      description={
        expense
          ? 'Los cambios se guardan cuando presionas Guardar.'
          : 'Anota quién pagó y entre quiénes se divide.'
      }
    >
      <ExpenseForm
        key={expense?.id ?? 'new'}
        group={group}
        expense={expense}
        onDone={onClose}
      />
    </ResponsiveDialog>
  );
}
