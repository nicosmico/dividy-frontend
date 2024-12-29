import { useCallback, useMemo } from 'react';
import type { Debt, DebtId, Expense, NewExpense, Member, NewMember } from '../types/debts';
import { useDebtStore } from '../store/useDebtStore';

export function useDebt(debtId?: DebtId) {
  const debt = useDebtStore(useCallback(state => debtId ? state.debts[debtId] : undefined, [debtId]));
  const debts = useDebtStore(state => state.debts);
  const debtsOrder = useDebtStore(state => state.debtsOrder);

  // Store actions
  const addDebt = useDebtStore(state => state.addDebt);
  const updateDebt = useDebtStore(state => state.updateDebt);
  const removeDebt = useDebtStore(state => state.removeDebt);
  const addExpense = useDebtStore(state => state.addExpense);
  const updateExpense = useDebtStore(state => state.updateExpense);
  const removeExpense = useDebtStore(state => state.removeExpense);
  const addMember = useDebtStore(state => state.addMember);
  const updateMember = useDebtStore(state => state.updateMember);
  const removeMember = useDebtStore(state => state.removeMember);

  const allDebts = useMemo(() => 
    debtsOrder.map(id => debts[id]).filter(Boolean), 
    [debts, debtsOrder]
  );
  const globalActions = useMemo(() => ({
    allDebts,
    addDebt
  }), [addDebt, allDebts]);

  // Actions for the debtId
  const actions = useMemo(() => {
    if (!debtId) return null;

    return {
      // Debt
      update: (data: Partial<Debt>) => updateDebt(debtId, data),
      remove: () => removeDebt(debtId),

      // Expenses
      addExpense: (expense: NewExpense) => addExpense(debtId, expense),
      updateExpense: (expenseId: string, data: Partial<Expense>) =>
        updateExpense(debtId, expenseId, data),
      removeExpense: (expenseId: string) => removeExpense(debtId, expenseId),

      // Members
      addMember: (member: NewMember) => addMember(debtId, member),
      updateMember: (memberId: string, data: Partial<Member>) =>
        updateMember(debtId, memberId, data),
      removeMember: (memberId: string) => removeMember(debtId, memberId),
    };
  }, [debtId, debt, updateDebt, removeDebt, addExpense, updateExpense, removeExpense,
    addMember, updateMember, removeMember]);

  return {
    debt,
    ...globalActions,
    ...(actions ?? {}),
  };
}
