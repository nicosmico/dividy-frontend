import { Bill } from './bill';
import { Member } from './member';

export interface MemberDebtsSummary {
  debtor: Member;
  debts: MemberDebt[];
  total: number;
}

export interface MemberDebt {
  payer: Member;
  bills: MemberDebtBill[];
  total: number;
}

export interface MemberDebtBill {
  bill: Bill; // Original bill
  items: MemberDebtBillItem[];
  total: number;
}

export interface MemberDebtBillItem {
  name: string;
  price: number;
  totalByMember: number;
  members: number;
}

export class Summary {
  constructor(
    private readonly bills: { [id: string]: Bill },
    private readonly billsOrder: string[],
    private readonly members: { [id: string]: Member },
    private readonly membersOrder: string[]
  ) {}

  public getMembersDebtSummary() {
    const memberDebtsSummary: { [member: string]: MemberDebtsSummary } = {};

    const bills = Object.values(this.bills);
    bills.forEach((bill) => {
      //

      bill.items.forEach((item) => {
        //

        item.members.forEach((member) => {
          // Check for existing member debt summary
          if (!memberDebtsSummary[member]) {
            memberDebtsSummary[member] = {
              debtor: this.members[member],
              debts: [],
              total: 0
            };
          }

          // Check for existing member to member summary
          if (!memberDebtsSummary[member].debts.find(debt => debt.payer.id === bill.paidBy)) {
            memberDebtsSummary[member].debts.push({
              payer: this.members[bill.paidBy],
              bills: [],
              total: 0
            });
          }

          const memberDebt: MemberDebt = {
            payer: this.members[bill.paidBy],
            bills: 
          }
        });
      });
    });

    return Object.values(memberDebtsSummary);
  }
}
