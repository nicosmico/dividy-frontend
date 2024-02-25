import { Bill, BillItem } from 'src/features/split-bills/types/bill';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BillsStore {
  bills: { [uuid: string]: Bill };
  billsOrder: string[];
  addBill: (bill: Bill) => void;
  deleteBill: (uuid: string) => void;
  updateBill: (uuid: string, billData: Partial<Bill>) => void;
  addItemToBill: (uuid: string, item: BillItem) => void;
  removeItemFromBill: (uuid: string, itemUuid: string) => void;
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
            billsOrder: state.billsOrder.filter((b) => b !== uuid),
          };
        });
      },
      updateBill: (uuid, billData) => {
        set((state) => {
          const updatedBill = { ...state.bills[uuid], ...billData };
          return {
            bills: { ...state.bills, [uuid]: updatedBill },
          };
        });
      },
      addItemToBill: (uuid, item) => {
        set((state) => {
          const bill = state.bills[uuid];
          bill.items.push(item);
          return {
            bills: { ...state.bills, [uuid]: bill },
          };
        });
      },
      removeItemFromBill: (uuid, itemUuid) => {
        set((state) => {
          const bill = state.bills[uuid];
          bill.items = bill.items.filter((i) => i.uuid !== itemUuid);
          return {
            bills: { ...state.bills, [uuid]: bill },
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
