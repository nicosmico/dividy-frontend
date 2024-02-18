import { useBillsStore } from 'src/features/split-bills/store/useBillsStore';

export function useBills() {
  const bills = useBillsStore((state) => state.bills);
  const setBills = useBillsStore((state) => state.setBills);
  const deleteBill = useBillsStore((state) => state.deleteBill);

  return { bills, setBills, deleteBill };
}

export default useBills;
