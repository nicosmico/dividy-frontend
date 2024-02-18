import { Bill } from 'src/features/split-bills/types/bill';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BillsStore {
  bills: Bill[];
  setBills: (bills: Bill[]) => void;
  deleteBill: (id: string) => void;
}

export const useBillsStore = create<BillsStore>()(
  persist(
    (set) => ({
      bills: [],
      setBills: (bills) => {
        set(() => {
          return { bills };
        });
      },
      deleteBill: (id) => {
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
        }));
      },
    }),
    {
      name: 'bills-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
