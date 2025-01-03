export type DebtId = string;
export type NewDebt = Omit<Debt, 'id'>;
export type Debt = {
    id: DebtId,
    title: string,
    members: Member[],
    expenses: Expense[]
}

export type ExpenseId = string;
export type NewExpense = Omit<Expense, 'id'>;
export type Expense = {
  id: ExpenseId;
  name: string;
  total: number;
  paidBy: MemberId;
  debtors: MemberId[];
};

export type MemberId = string;
export type NewMember = Omit<Member, 'id'>;
export interface Member {
  id: MemberId;
  name: string;
  email?: string;
  phone?: string;
  picture: {
    happy: string;
    sad: string;
  };
}
