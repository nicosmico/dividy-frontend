import { Bill, BillItem } from './bill';

export interface MemberDebts {
  uuid: string;
  member: string; // Member ID
  debts: Debt[];
}

export interface Debt {
  bill: Bill;
  items: BillItem[];
  total: number;
}

export class Summary {
  constructor(private readonly bills: Bill[]) {}

  public getMembersDebts(): { [uuid: string]: MemberDebts } {
    // Group bill to pay by member
    const billsToPayByMember: {
      [memberUuid: string]: { [billUuid: string]: Debt };
    } = {};
    this.bills.forEach((bill) => {
      bill.items.forEach((item) => {
        item.members.forEach((memberUuid) => {
          // Add bill if not exists
          billsToPayByMember[memberUuid] ??= {};
          billsToPayByMember[memberUuid][bill.uuid] ??= {
            bill,
            items: [],
            total: 0,
          };

          // Add item to bill and update totalToPay
          billsToPayByMember[memberUuid][bill.uuid].items.push(item);
          billsToPayByMember[memberUuid][bill.uuid].total += item.price;
        });
      });
    });

    // Format to MemberDebts
    const memberDebts: { [uuid: string]: MemberDebts } = {};
    Object.entries(billsToPayByMember).forEach(([memberUuid, billsToPay]) => {
      memberDebts[memberUuid] = {
        uuid: crypto.randomUUID(),
        member: memberUuid,
        debts: Object.values(billsToPay),
      };
    });
    return memberDebts;
  }
}
