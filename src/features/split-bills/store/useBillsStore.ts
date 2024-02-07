import { Bill } from 'src/models/Bill';
import { create } from 'zustand';

interface BillsStore {
  bills: Bill[];
  addBill: (bill: Bill) => void;
  deleteBill: (bill: Bill) => void;
  updateBill: (id: string, bill: Bill) => void;
}

export const useBillsStore = create<BillsStore>((set) => ({
  bills: [],
  addBill: (bill) =>
    set((state) => {
      bill.id = crypto.randomUUID(); // Create ID
      return { bills: [bill, ...state.bills] };
    }),
  deleteBill: (bill) =>
    set((state) => ({ bills: state.bills.filter((b) => b.id !== bill.id) })),
  updateBill: (id, bill) =>
    set((state) => ({
      bills: state.bills.map((b) => (b.id === id ? bill : b)),
    })),
}));
