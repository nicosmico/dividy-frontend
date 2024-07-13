import { Bill, BillItem } from './bill';

export interface MemberSummary {
  id: string;
  member: string; // Member ID
  debts: Debt[];
  incomes: Debt[];
}

export interface Debt {
  id: string;
  debtor: string; // Member ID
  bill: Bill; // Bill detail (includes the paidBy field)
  items: BillItem[]; // Items that debtor must pay
  total: number; // Total amount of items
}

export class Summary {
  constructor(private readonly bills: Bill[]) {}

  private getMembersDebts(): Record<string, Debt[]> {
    // Group bill to pay by member
    // const billsToPayByMember: { [memberUuid: string]: Debt[] } = {};
    const indexedDebts: Record<string, Record<string, Debt>> = {};
    this.bills.forEach((bill) => {
      bill.items.forEach((item) => {
        item.members.forEach((memberUuid) => {
          // Add Debt if not exists
          indexedDebts[memberUuid] ??= {};
          indexedDebts[memberUuid][bill.id] ??= {
            id: crypto.randomUUID(),
            debtor: memberUuid,
            bill,
            items: [],
            total: 0,
          };

          // Add item to bill and update totalToPay
          indexedDebts[memberUuid][bill.id].items.push(item);
          indexedDebts[memberUuid][bill.id].total +=
            item.price / item.members.length;
        });
      });
    });

    // Format to Record<string, Debt[]>
    const debts: Record<string, Debt[]> = {};
    Object.entries(indexedDebts).forEach(([member, memberDebts]) => {
      debts[member] = Object.values(memberDebts);
    });
    return debts;
  }

  private getMembersIncomes(): Record<string, Debt[]> {
    this.bills.forEach((bill) => {
      // Repensar como hacer todo el reusmen, no solo esto :(
    });
    return {};
  }

  // TODO: Return the member debts and incomes
  public getMemberSummary() {
    const memberDebts = this.getMembersDebts();
    const memberIncomes = {};
  }
}
