export interface Bill {
  id: string;
  name: string;
  paidBy: string; // Member ID
  total: number;
  items: BillItem[];
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  members: string[]; // Member IDs
}
