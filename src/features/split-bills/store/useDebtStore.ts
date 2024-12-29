import { create } from "zustand";
import { Debt, DebtId, Expense, ExpenseId, NewDebt, NewExpense, NewMember } from "../types/debts";
import { Member, MemberId } from "../types/member";

interface DebtStore {
  debts: { [id: DebtId]: Debt };
  debtsOrder: DebtId[];

  addDebt: (newDebt: NewDebt) => Debt;
  updateDebt: (id: DebtId, updatedDebt: Partial<Debt>) => Debt | undefined;
  removeDebt: (id: DebtId) => Debt | undefined;
  
  addExpense: (debtId: DebtId, newExpense: NewExpense) => Expense | undefined;
  updateExpense: (debtId: DebtId, expenseId: ExpenseId, updatedExpense: Partial<Expense>) => Expense | undefined;
  removeExpense: (debtId: DebtId, expenseId: ExpenseId) => Expense | undefined;
  
  addMember: (debtId: DebtId, newMember: NewMember) => Member | undefined;
  updateMember: (debtId: DebtId, memberId: MemberId, updatedMember: Partial<Member>) => Member | undefined;
  removeMember: (debtId: DebtId, memberId: string) => Member | undefined;
}

export const useDebtStore = create<DebtStore>((set, get) => ({
  debts: {},
  debtsOrder: [],

  // CRUD de deudas
  addDebt: (newDebt) => {
    const id = crypto.randomUUID();
    const debt: Debt = {
      id,
      ...newDebt,
      members: [],
      expenses: []
    };

    set((state) => ({
      debts: { ...state.debts, [id]: debt },
      debtsOrder: [...state.debtsOrder, id],
    }));

    return debt;
  },

  updateDebt: (id, updatedDebt) => {
    const currentDebt = get().debts[id];
    if (!currentDebt) return undefined;

    const updatedDebtFull = {
      ...currentDebt,
      ...updatedDebt
    };

    set((state) => ({
      debts: {
        ...state.debts,
        [id]: updatedDebtFull,
      },
    }));

    return updatedDebtFull;
  },

  removeDebt: (id) => {
    const currentDebt = get().debts[id];
    if (!currentDebt) return undefined;

    set((state) => {
      const { [id]: _, ...remainingDebts } = state.debts;
      return {
        debts: remainingDebts,
        debtsOrder: state.debtsOrder.filter((debtId) => debtId !== id),
      };
    });

    return currentDebt;
  },

  // CRUD de gastos
  addExpense: (debtId, newExpense) => {
    const currentDebt = get().debts[debtId];
    if (!currentDebt) return undefined;

    const expense: Expense = {
      id: crypto.randomUUID(),
      ...newExpense
    };

    set((state) => ({
      debts: {
        ...state.debts,
        [debtId]: {
          ...state.debts[debtId],
          expenses: [...state.debts[debtId].expenses, expense],
        },
      },
    }));

    return expense;
  },

  updateExpense: (debtId, expenseId, updatedExpense) => {
    const currentDebt = get().debts[debtId];
    if (!currentDebt) return undefined;

    const currentExpense = currentDebt.expenses.find(e => e.id === expenseId);
    if (!currentExpense) return undefined;

    const updatedExpenseFull = {
      ...currentExpense,
      ...updatedExpense
    };

    set((state) => ({
      debts: {
        ...state.debts,
        [debtId]: {
          ...state.debts[debtId],
          expenses: state.debts[debtId].expenses.map((expense) =>
            expense.id === expenseId ? updatedExpenseFull : expense
          ),
        },
      },
    }));

    return updatedExpenseFull;
  },

  removeExpense: (debtId, expenseId) => {
    const currentDebt = get().debts[debtId];
    if (!currentDebt) return undefined;

    const expenseToRemove = currentDebt.expenses.find(e => e.id === expenseId);
    if (!expenseToRemove) return undefined;

    set((state) => ({
      debts: {
        ...state.debts,
        [debtId]: {
          ...state.debts[debtId],
          expenses: state.debts[debtId].expenses.filter(
            (expense) => expense.id !== expenseId
          ),
        },
      },
    }));

    return expenseToRemove;
  },

  // CRUD de miembros
  addMember: (debtId, newMember) => {
    const currentDebt = get().debts[debtId];
    if (!currentDebt) return undefined;

    const member: Member = {
      id: crypto.randomUUID(),
      ...newMember
    };

    set((state) => ({
      debts: {
        ...state.debts,
        [debtId]: {
          ...state.debts[debtId],
          members: [...state.debts[debtId].members, member],
        },
      },
    }));

    return member;
  },

  updateMember: (debtId, memberId, updatedMember) => {
    const currentDebt = get().debts[debtId];
    if (!currentDebt) return undefined;

    const currentMember = currentDebt.members.find(m => m.id === memberId);
    if (!currentMember) return undefined;

    const updatedMemberFull = {
      ...currentMember,
      ...updatedMember
    };

    set((state) => ({
      debts: {
        ...state.debts,
        [debtId]: {
          ...state.debts[debtId],
          members: state.debts[debtId].members.map(member =>
            member.id === memberId ? updatedMemberFull : member
          ),
        },
      },
    }));

    return updatedMemberFull;
  },

  removeMember: (debtId, memberId) => {
    const currentDebt = get().debts[debtId];
    if (!currentDebt) return undefined;

    const memberToRemove = currentDebt.members.find(m => m.id === memberId);
    if (!memberToRemove) return undefined;

    set((state) => ({
      debts: {
        ...state.debts,
        [debtId]: {
          ...state.debts[debtId],
          members: state.debts[debtId].members.filter(
            (member) => member.id !== memberId
          ),
        },
      },
    }));

    return memberToRemove;
  },
}));