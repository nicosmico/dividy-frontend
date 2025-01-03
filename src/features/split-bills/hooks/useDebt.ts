import { useMemo } from 'react';
import { useDebtStore } from '../store/useDebtStore';

export function useDebt() {
  const indexedDebts = useDebtStore(state => state.debts);
  const debtsOrder = useDebtStore(state => state.debtsOrder);
  const debts = useMemo(() => debtsOrder.map(id => indexedDebts[id]), [debtsOrder, indexedDebts]);

  const addDebt = useDebtStore(state => state.addDebt);
  const updateDebt = useDebtStore(state => state.updateDebt);
  const removeDebt = useDebtStore(state => state.removeDebt);
  const addExpense = useDebtStore(state => state.addExpense);
  const updateExpense = useDebtStore(state => state.updateExpense);
  const removeExpense = useDebtStore(state => state.removeExpense);
  const addMember = useDebtStore(state => state.addMember);
  const updateMember = useDebtStore(state => state.updateMember);
  const removeMember = useDebtStore(state => state.removeMember);

  return {
    debts,
    debtsOrder,
    indexedDebts,
    addDebt,
    updateDebt,
    removeDebt,
    addExpense,
    updateExpense,
    removeExpense,
    addMember,
    updateMember,
    removeMember
  };
}
