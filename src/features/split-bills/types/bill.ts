export interface Bill {
  uuid: string;
  name: string;
  paidBy: string; // Member ID
  total: number;
  // items: BillItem[];
}

export interface BillItem {
  name: string;
  price: number;
  // members: string[]; // Member IDs
}
