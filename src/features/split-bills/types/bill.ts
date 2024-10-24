export type Bill = {
  id: string;
  name: string;
  price: number;
  paidBy: string; // Member ID
  members: string[];
  totalByMember: number;
};

export type NewBill = Omit<Bill, 'id'>;
