import { useBillsStore } from 'src/features/split-bills/store/useBillsStore';

export function useBills() {
  const bills = useBillsStore((state) => state.bills);
  const billsOrder = useBillsStore((state) => state.billsOrder);
  const addBill = useBillsStore((state) => state.addBill);
  const deleteBill = useBillsStore((state) => state.deleteBill);
  const updateBill = useBillsStore((state) => state.updateBill);

  return {
    bills,
    billsOrder,
    addBill,
    deleteBill,
    updateBill,
  };
}

export default useBills;
