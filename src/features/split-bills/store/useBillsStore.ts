import { Bill, NewBill } from 'src/features/split-bills/types/bill';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type BillsStore = {
  bills: { [id: string]: Bill };
  billsOrder: string[];
  addBill: (newBill: NewBill) => Bill;
  deleteBill: (id: string) => void;
  updateBill: (id: string, billData: Partial<Bill>) => Bill;
};

export const useBillsStore = create<BillsStore>()(
  persist(
    (set, get) => ({
      bills: {},
      billsOrder: [] as string[],
      addBill: (newBill) => {
        const id = crypto.randomUUID();
        const bill: Bill = {
          id,
          ...newBill,
        };
        set((state) => ({
          bills: { ...state.bills, [id]: bill },
          billsOrder: [...state.billsOrder, id],
        }));
        return bill;
      },
      deleteBill: (id) => {
        set((state) => {
          const remainingBills = { ...state.bills };
          delete remainingBills[id];

          return {
            bills: remainingBills,
            billsOrder: state.billsOrder.filter((b) => b !== id),
          };
        });
      },
      updateBill: (id, billData) => {
        set((state) => {
          const updatedBill = { ...state.bills[id], ...billData };
          return {
            bills: { ...state.bills, [id]: updatedBill },
          };
        });
        return get().bills[id];
      },
    }),
    {
      name: 'bills-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
