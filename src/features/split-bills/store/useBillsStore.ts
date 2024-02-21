import { Bill } from 'src/features/split-bills/types/bill';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BillsStore {
  bills: Bill[];
  setBills: (bills: Bill[]) => void;
  deleteBill: (uuid: string) => void;
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
      deleteBill: (uuid) => {
        set((state) => ({
          bills: state.bills.filter((b) => b.uuid !== uuid),
        }));
      },
    }),
    {
      name: 'bills-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
