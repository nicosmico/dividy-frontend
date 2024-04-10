import { Bill } from './bill';

export interface Summary {
  uuid: string;
  member: string; // Member ID
  bills: SummaryBill[]; // Bill with items to pay for
}

// Bill with FILTERED items, not the original bill
export interface SummaryBill extends Bill {}
