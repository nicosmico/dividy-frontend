import { Bill, NewBill } from 'src/features/split-bills/types/bill';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type BillsStore = {
  bills: { [id: string]: Bill };
  billsOrder: string[];
  addBill: (newBill: NewBill) => void;
  deleteBill: (id: string) => void;
  updateBill: (id: string, billData: Partial<Bill>) => void;
};

export const useBillsStore = create<BillsStore>()(
  persist(
    (set) => ({
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
      },
    }),
    {
      name: 'bills-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
