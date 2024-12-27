import { MemberId } from './member';

export type BillId = string;

export type Bill = {
  id: BillId;
  name: string;
  total: number;
  paidBy: MemberId;
  members: MemberId[];
};

export type NewBill = Omit<Bill, 'id'>;
