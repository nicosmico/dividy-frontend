import { Bill, BillItem } from 'src/features/split-bills/types/bill';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BillsStore {
  bills: { [id: string]: Bill };
  billsOrder: string[];
  addBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  updateBill: (id: string, billData: Partial<Bill>) => void;
  addItemToBill: (id: string, item: BillItem) => void;
  removeItemFromBill: (id: string, itemUuid: string) => void;
  updateItemInBill: (
    id: string,
    itemUuid: string,
    itemData: Partial<BillItem>
  ) => void;
}

export const useBillsStore = create<BillsStore>()(
  persist(
    (set) => ({
      bills: {},
      billsOrder: [] as string[],
      addBill: (bill) => {
        set((state) => ({
          bills: { ...state.bills, [bill.id]: bill },
          billsOrder: [...state.billsOrder, bill.id],
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
      addItemToBill: (id, item) => {
        set((state) => {
          const bill = state.bills[id];
          bill.items.push(item);
          bill.total += item.price;
          return {
            bills: { ...state.bills, [id]: bill },
          };
        });
      },
      removeItemFromBill: (id, itemUuid) => {
        set((state) => {
          const bill = state.bills[id];
          bill.items = bill.items.filter((i) => i.id !== itemUuid);
          const item = bill.items.find((i) => i.id === itemUuid);
          bill.total -= item?.price ?? 0;
          return {
            bills: { ...state.bills, [id]: bill },
          };
        });
      },
      updateItemInBill: (id, itemUuid, itemData) => {
        set((state) => {
          const bill = state.bills[id];
          let item = bill.items.find((i) => i.id === itemUuid);
          if (!item) return state;

          item = { ...item, ...itemData };
          if (!item) return state;

          bill.items = bill.items.map((i) => (i.id === itemUuid ? item! : i));
          return {
            bills: { ...state.bills, [id]: bill },
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
