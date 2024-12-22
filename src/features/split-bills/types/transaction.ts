import { Bill } from './bill';
import { MemberId } from './member';

export type Transaction = {
  from: MemberId;
  to: MemberId;
  amount: number;
};

export function simplifyDebts(bills: Bill[]): Transaction[] {
  const balances: Record<MemberId, number> = {};

  // Paso 1: Calcular el balance de cada miembro (balance = lo que recibe - lo que debe)
  for (const bill of bills) {
    const { paidBy, total, members } = bill;
    const splitAmount = total / members.length;

    // Sumar balance al pagador
    balances[paidBy] = (balances[paidBy] || 0) + total;

    // Restar balance a cada miembro de esta Bill
    for (const member of members) {
      balances[member] = (balances[member] || 0) - splitAmount;
    }
  }

  // Separar acreedores y deudores
  const debtors: { id: MemberId; amount: number }[] = [];
  const creditors: { id: MemberId; amount: number }[] = [];

  for (const [id, balance] of Object.entries(balances)) {
    if (balance < 0) {
      debtors.push({ id, amount: -balance }); // Convertir a positivo
    } else if (balance > 0) {
      creditors.push({ id, amount: balance });
    }
  }

  // Paso 2: Redistribuir deudas
  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Determinar cuánto se puede transferir
    const payment = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      from: debtor.id,
      to: creditor.id,
      amount: payment,
    });

    // Ajustar los saldos
    debtor.amount -= payment;
    creditor.amount -= payment;

    // Avanzar en las listas si los saldos quedan en 0
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transactions;
}
