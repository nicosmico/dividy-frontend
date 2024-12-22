import { MemberId } from './member';

export type BillId = string;

export type Bill = {
  id: BillId;
  name: string;
  total: number;
  paidBy: MemberId;
  members: MemberId[];
  // members: { // TODO
  //   id: string;
  //   ammount: number;
  // };
};

export type NewBill = Omit<Bill, 'id'>;
