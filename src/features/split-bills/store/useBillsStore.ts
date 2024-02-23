import { Bill } from 'src/features/split-bills/types/bill';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BillsStore {
  bills: { [uuid: string]: Bill };
  billsOrder: string[];
  addBill: (bill: Bill) => void;
  deleteBill: (uuid: string) => void;
  updateBill: (uuid: string, billValues: Partial<Bill>) => void;
}

export const useBillsStore = create<BillsStore>()(
  persist(
    (set) => ({
      bills: {},
      billsOrder: [],
      addBill: (bill) => {
        set((state) => ({
          bills: { ...state.bills, [bill.uuid]: bill },
          billsOrder: [...state.billsOrder, bill.uuid],
        }));
      },
      deleteBill: (uuid) => {
        set((state) => {
          const remainingBills = { ...state.bills };
          delete remainingBills[uuid];

          return {
            bills: remainingBills,
            billsOrder: [...state.billsOrder].filter((b) => b !== uuid),
          };
        });
      },
      updateBill: (uuid, billValues) => {
        set((state) => ({
          bills: {
            ...state.bills,
            [uuid]: {
              ...state.bills[uuid],
              ...billValues,
            },
          },
        }));
      },
    }),
    {
      name: 'bills-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
