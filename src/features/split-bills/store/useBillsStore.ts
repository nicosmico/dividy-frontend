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
  updateItemInBill: (
    uuid: string,
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
          bill.total += item.price;
          return {
            bills: { ...state.bills, [uuid]: bill },
          };
        });
      },
      removeItemFromBill: (uuid, itemUuid) => {
        set((state) => {
          const bill = state.bills[uuid];
          bill.items = bill.items.filter((i) => i.uuid !== itemUuid);
          const item = bill.items.find((i) => i.uuid === itemUuid);
          bill.total -= item?.price ?? 0;
          return {
            bills: { ...state.bills, [uuid]: bill },
          };
        });
      },
      updateItemInBill: (uuid, itemUuid, itemData) => {
        set((state) => {
          const bill = state.bills[uuid];
          let item = bill.items.find((i) => i.uuid === itemUuid);
          if (!item) return state;

          item = { ...item, ...itemData };
          if (!item) return state;

          bill.items = bill.items.map((i) => (i.uuid === itemUuid ? item! : i));
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
