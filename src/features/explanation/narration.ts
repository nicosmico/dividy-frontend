import { formatAmount, formatPercent, splitTypeLabel } from '@/domain';
import type {
  Explanation,
  ExplainedExpense,
  MemberExplanation,
} from './build-explanation';
import type { ShareStep } from './share-steps';

export const STEP_TITLES = [
  'Cada uno paga',
  'Se calcula su parte',
  'Se compara',
  'Se salda',
] as const;

export const STEP_COUNT = STEP_TITLES.length;

/** "a, b y c" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

const MAX_NARRATED_EXPENSES = 4;
const MAX_NARRATED_MEMBERS = 5;

function nameOf(explanation: Explanation, id: string): string {
  return (
    explanation.members.find((m) => m.member.id === id)?.member.name ??
    'alguien'
  );
}

function payNarration(explanation: Explanation): string {
  const { expenses, members } = explanation;
  if (expenses.length === 0) return 'Todavía no hay gastos.';
  const description = (id: string) =>
    expenses.find((e) => e.id === id)?.description ?? 'un gasto';
  const payers = members.filter((m) => m.paidSlices.length > 0);
  if (expenses.length <= MAX_NARRATED_EXPENSES && payers.length <= 4) {
    // Members in group order, so the text follows the columns.
    const parts = payers.map(
      (m) =>
        `${m.member.name} pagó ${joinList(
          m.paidSlices.map(
            (s) =>
              `${description(s.expenseId)} (${formatAmount(s.amount, explanation.currency)})`
          )
        )}`
    );
    return `${joinList(parts)}.`;
  }
  return `Se registraron ${expenses.length} gastos por ${formatAmount(explanation.totalSpent, explanation.currency)} en total. La barra "Gastó" muestra cuánto gastó cada uno, dividido por gasto.`;
}

function shareNarration(explanation: Explanation): string {
  const { expenses, members } = explanation;
  const everyone = members.length;
  const sets = new Map<
    string,
    { ids: string[]; names: string[]; how: string }
  >();
  for (const expense of expenses) {
    const how =
      expense.split.type === 'equal' ? '' : splitTypeLabel(expense.split.type);
    const key = `${how}|${[...expense.participantIds].sort().join('|')}`;
    const entry = sets.get(key) ?? {
      ids: expense.participantIds,
      names: [],
      how,
    };
    entry.names.push(expense.description);
    sets.set(key, entry);
  }
  const base = 'Cada gasto se divide entre quienes lo comparten';
  const hasCustom = expenses.some((e) => e.split.type !== 'equal');
  if (
    expenses.length === 0 ||
    expenses.length > MAX_NARRATED_EXPENSES + 1 ||
    sets.size > 3
  ) {
    return hasCustom
      ? `${base}, en partes iguales o como se indicó en cada gasto (montos, porcentajes o partes). Sumando todos los gastos, sale la parte de cada uno.`
      : `${base}. Sumando todos los gastos, sale la parte de cada uno.`;
  }
  const parts = [...sets.values()].map(({ ids, names, how }) => {
    const who =
      ids.length === everyone && everyone > 1
        ? `entre los ${everyone}`
        : ids.length === 1
          ? `solo para ${nameOf(explanation, ids[0])}`
          : `solo entre ${joinList(ids.map((id) => nameOf(explanation, id)))}`;
    return `${joinList(names)} ${who}${how ? `, ${how}` : ''}`;
  });
  return `${base}: ${parts.join('; ')}. Sumando, sale la parte de cada uno.`;
}

function compareNarration(explanation: Explanation): string {
  const { members, payments } = explanation;
  const tail = payments.length > 0 ? ' Ya cuenta los pagos registrados.' : '';
  if (members.length > MAX_NARRATED_MEMBERS) {
    const owed = members.filter((m) => m.balance > 0).length;
    const owing = members.filter((m) => m.balance < 0).length;
    return `Se compara lo que gastó cada uno con su parte: ${owed} ${owed === 1 ? 'persona tiene' : 'personas tienen'} saldo a favor y ${owing} ${owing === 1 ? 'debe' : 'deben'}.${tail}`;
  }
  const describe = (m: MemberExplanation) =>
    m.balance > 0
      ? `a ${m.member.name} le deben ${formatAmount(m.balance, explanation.currency)}`
      : m.balance < 0
        ? `${m.member.name} debe ${formatAmount(-m.balance, explanation.currency)}`
        : `${m.member.name} está al día`;
  return `Se compara lo que gastó cada uno con su parte: ${joinList(members.map(describe))}.${tail}`;
}

function transfersText(explanation: Explanation): string {
  const byPayer = new Map<string, string[]>();
  for (const t of explanation.transfers) {
    const list = byPayer.get(t.fromId) ?? [];
    list.push(
      `${formatAmount(t.amount, explanation.currency)} a ${nameOf(explanation, t.toId)}`
    );
    byPayer.set(t.fromId, list);
  }
  return [...byPayer.entries()]
    .map(
      ([from, parts]) =>
        `${nameOf(explanation, from)} le transfiere ${joinList(parts)}`
    )
    .join('; ');
}

function settleNarration(
  explanation: Explanation,
  settledAtEnd: boolean
): string {
  const { transfers, payments } = explanation;
  const paid =
    payments.length > 0
      ? `Ya se ${payments.length === 1 ? 'registró 1 pago' : `registraron ${payments.length} pagos`}. `
      : '';
  if (transfers.length === 0) {
    return `${paid}No falta ninguna transferencia: ¡están al día!`;
  }
  const text = transfersText(explanation);
  return settledAtEnd
    ? `${text}. Ahora cada uno pagó exactamente su parte: ¡están al día!`
    : `${paid}Para quedar al día: ${text}. Con eso, cada uno habrá pagado exactamente su parte.`;
}

/** What each one puts in a value, as said in the narration ("2 partes", "$50.000", "50 %"). */
function entryText(
  explanation: Explanation,
  expense: ExplainedExpense,
  value: number
): string {
  return expense.split.type === 'exact'
    ? formatAmount(value, explanation.currency)
    : expense.split.type === 'percent'
      ? formatPercent(value)
      : `${value} ${value === 1 ? 'parte' : 'partes'}`;
}

/**
 * How a custom split is told, from its data: "Cabaña se divide por partes:
 * Ana pone 2 partes y los demás 1." The most common value is "los demás"
 * (when two or more people share it), and everyone else is named.
 */
function customDivisionText(
  explanation: Explanation,
  expense: ExplainedExpense
): string {
  const { split } = expense;
  if (split.type === 'equal') return '';
  const values: Record<string, number> =
    split.type === 'exact'
      ? split.amounts
      : split.type === 'percent'
        ? split.basisPoints
        : split.type === 'shares'
          ? split.parts
          : {};
  // In group order, so the text follows the columns.
  const entries = explanation.members
    .filter((m) => expense.participantIds.includes(m.member.id))
    .map((m) => ({ name: m.member.name, value: values[m.member.id] ?? 0 }));
  const head = `${expense.description} se divide ${splitTypeLabel(split.type)}`;
  if (entries.length === 1) {
    return `${head}: solo ${entries[0].name}, con ${entryText(explanation, expense, entries[0].value)}.`;
  }
  const counts = new Map<number, number>();
  for (const { value } of entries)
    counts.set(value, (counts.get(value) ?? 0) + 1);
  const [common, count] = [...counts.entries()].reduce((best, entry) =>
    entry[1] > best[1] ? entry : best
  );
  if (counts.size === 1) {
    return `${head}: cada uno pone ${entryText(explanation, expense, common)}.`;
  }
  const named =
    count >= 2 ? entries.filter((e) => e.value !== common) : entries;
  const told = named.map((e, i) =>
    i === 0
      ? `${e.name} pone ${entryText(explanation, expense, e.value)}`
      : `${e.name} ${split.type === 'shares' ? e.value : entryText(explanation, expense, e.value)}`
  );
  if (count >= 2) {
    told.push(
      `los demás ${split.type === 'shares' ? common : entryText(explanation, expense, common)}`
    );
  }
  return `${head}: ${joinList(told)}.`;
}

/**
 * Text of one sub-step of step 2: who paid the expense and how it is split.
 * With a remainder, says who gets the extra unit. Generated from the data.
 */
export function narrateShareStep(
  explanation: Explanation,
  step: ShareStep
): string {
  if (step.kind === 'rest') {
    const rest = explanation.expenses.filter((e) =>
      step.expenseIds.includes(e.id)
    );
    const total = rest.reduce((sum, e) => sum + e.amount, 0);
    const how = rest.every((e) => e.split.type === 'equal')
      ? 'igual'
      : 'según su división';
    return rest.length === 1
      ? `El otro gasto (${formatAmount(total, explanation.currency)}) se divide ${how} entre quienes lo comparten. Con eso, la parte de cada uno queda completa.`
      : `Los otros ${rest.length} gastos (${formatAmount(total, explanation.currency)} en total) se dividen ${how} entre quienes los comparten. Con eso, la parte de cada uno queda completa.`;
  }
  const expense = explanation.expenses.find((e) => e.id === step.expenseIds[0]);
  if (!expense) return '';
  const { shares } = expense;
  const people = expense.participantIds.length;
  const paid = `${nameOf(explanation, expense.payerId)} pagó ${expense.description} (${formatAmount(expense.amount, explanation.currency)}).`;
  if (shares.length === 0) return paid;
  if (expense.split.type !== 'equal') {
    return `${paid} ${customDivisionText(explanation, expense)}`;
  }
  const base =
    shares.length < people ? 0 : Math.min(...shares.map((s) => s.amount));
  const extra = shares.filter((s) => s.amount > base);
  const everyone = people === 1 ? 'Solo lo paga' : `Se divide entre ${people}:`;
  const each =
    people === 1
      ? `${nameOf(explanation, shares[0].memberId)}.`
      : `${formatAmount(base, explanation.currency)} cada uno.`;
  const rounding =
    extra.length === 0 || extra.length === shares.length
      ? ''
      : extra.length === 1
        ? ` A ${nameOf(explanation, extra[0].memberId)} le toca ${formatAmount(1, explanation.currency)} más por redondeo.`
        : ` A ${joinList(extra.map((s) => nameOf(explanation, s.memberId)))} les toca ${formatAmount(1, explanation.currency)} más por redondeo.`;
  return `${paid} ${everyone} ${each}${rounding}`;
}

/**
 * Text of each step, written from the explanation (never hand-typed numbers).
 * `settledAtEnd` is the welcome example, where the last step shows the
 * suggested transfers as already paid.
 */
export function narrate(
  explanation: Explanation,
  step: number,
  settledAtEnd = false,
  shareStep?: ShareStep
): string {
  switch (step) {
    case 0:
      return payNarration(explanation);
    case 1:
      return shareStep
        ? narrateShareStep(explanation, shareStep)
        : shareNarration(explanation);
    case 2:
      return compareNarration(explanation);
    default:
      return settleNarration(explanation, settledAtEnd);
  }
}
