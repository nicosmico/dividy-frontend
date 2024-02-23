import { useBillsStore } from 'src/features/split-bills/store/useBillsStore';

export function useBills() {
  const bills = useBillsStore((state) => state.bills);
  const billsOrder = useBillsStore((state) => state.billsOrder);
  const addBill = useBillsStore((state) => state.addBill);
  const deleteBill = useBillsStore((state) => state.deleteBill);
  const updateBill = useBillsStore((state) => state.updateBill);
  const addItemToBill = useBillsStore((state) => state.addItemToBill);

  return { bills, billsOrder, addBill, deleteBill, updateBill, addItemToBill };
}

export default useBills;
