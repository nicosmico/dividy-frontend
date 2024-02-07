export interface Bill {
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
