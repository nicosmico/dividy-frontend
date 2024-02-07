import { useBillsStore } from 'src/features/split-bills/store/useBillsStore';

export function useBills() {
  const bills = useBillsStore((state) => state.bills);
  const addBill = useBillsStore((state) => state.addBill);
  const deleteBill = useBillsStore((state) => state.deleteBill);
  const updateBill = useBillsStore((state) => state.updateBill);
  const getBill = (id: string) => {
    return bills.find((bill) => bill.id === id);
  };

  return { bills, addBill, deleteBill, updateBill, getBill };
}

export default useBills;
