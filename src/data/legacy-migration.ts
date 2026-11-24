import {
  addExpense,
  createGroup,
  isValidAmount,
  MAX_DESCRIPTION_LENGTH,
  MAX_MEMBER_NAME_LENGTH,
  type Group,
  type NewMemberInput,
} from '@/domain';
import { z } from 'zod';

export const LEGACY_MEMBERS_KEY = 'members-store';
export const LEGACY_BILLS_KEY = 'bills-store';
export const LEGACY_GROUP_NAME = 'Mi grupo';

const legacyMembersSchema = z.object({
  state: z.object({
    members: z.record(
      z.string(),
      z.object({ id: z.string(), name: z.string() })
    ),
    membersOrder: z.array(z.string()),
  }),
});

const legacyBillsSchema = z.object({
  state: z.object({
    bills: z.record(
      z.string(),
      z.object({
        id: z.string(),
        name: z.string(),
        total: z.union([z.number(), z.string()]),
        paidBy: z.string(),
        members: z.array(z.string()),
      })
    ),
    billsOrder: z.array(z.string()),
  }),
});

function parseJson(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Ids in `order` that exist, followed by the ones missing from it. */
function orderedValues<T>(record: Record<string, T>, order: string[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const id of [...order, ...Object.keys(record)]) {
    if (id in record && !seen.has(id)) {
      seen.add(id);
      result.push(record[id]);
    }
  }
  return result;
}

function clip(text: string, max: number, fallback: string): string {
  const trimmed = text.trim().slice(0, max).trim();
  return trimmed || fallback;
}

/** Makes names unique ignoring case by suffixing " (2)", " (3)"... */
function uniqueName(name: string, taken: Set<string>): string {
  let candidate = name;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    candidate =
      name.slice(0, MAX_MEMBER_NAME_LENGTH - suffix.length).trimEnd() + suffix;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

export interface LegacyMigrationInput {
  /** Raw text of the `members-store` key (or null). */
  membersStore: string | null;
  /** Raw text of the `bills-store` key (or null). */
  billsStore: string | null;
  newId: () => string;
  /** ISO timestamp used for the group, expenses and their date. */
  now: string;
}

/**
 * Converts the old `zustand/persist` data into a single group "Mi grupo"
 * (plan decision 26). Returns null when there is nothing to migrate.
 * Expenses with a missing payer, no valid participants or an invalid amount
 * are dropped; amounts are rounded to whole pesos.
 */
export function migrateLegacyData(input: LegacyMigrationInput): Group | null {
  const membersDoc = legacyMembersSchema.safeParse(
    parseJson(input.membersStore)
  );
  if (!membersDoc.success) return null;
  const legacyMembers = orderedValues(
    membersDoc.data.state.members,
    membersDoc.data.state.membersOrder
  );
  if (legacyMembers.length === 0) return null;

  const taken = new Set<string>();
  const members: NewMemberInput[] = legacyMembers.map((m) => ({
    id: m.id,
    name: uniqueName(clip(m.name, MAX_MEMBER_NAME_LENGTH, 'Sin nombre'), taken),
  }));
  const created = createGroup({
    id: input.newId(),
    name: LEGACY_GROUP_NAME,
    members,
    now: input.now,
  });
  if (!created.ok) return null;
  let group = created.value;

  const billsDoc = legacyBillsSchema.safeParse(parseJson(input.billsStore));
  if (billsDoc.success) {
    const memberIds = new Set(members.map((m) => m.id));
    for (const bill of orderedValues(
      billsDoc.data.state.bills,
      billsDoc.data.state.billsOrder
    )) {
      const amount = Math.round(Number(bill.total));
      const participantIds = [...new Set(bill.members)].filter((id) =>
        memberIds.has(id)
      );
      if (
        !isValidAmount(amount) ||
        !memberIds.has(bill.paidBy) ||
        participantIds.length === 0
      ) {
        continue;
      }
      const result = addExpense(group, {
        id: input.newId(),
        description: clip(bill.name, MAX_DESCRIPTION_LENGTH, 'Gasto'),
        amount,
        payerId: bill.paidBy,
        split: { type: 'equal', participantIds },
        date: input.now.slice(0, 10),
        createdAt: input.now,
      });
      if (result.ok) group = result.value;
    }
  }
  return group;
}
