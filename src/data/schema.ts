import { getGroupIssues, type Group } from '@/domain';
import { z } from 'zod';

/** Version 3: every member has an `avatar` (`color` 0-7 and `seed`). */
export const CURRENT_VERSION = 3;

const isoTimestamp = z.string().min(1);
const dateString = z.string();

// Range and non-empty seed are checked by `getGroupIssues` (see `groupSchema`).
const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  avatar: z.object({ color: z.number(), seed: z.string() }),
});

const expenseSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  amount: z.number(),
  payerId: z.string(),
  split: z.object({
    type: z.literal('equal'),
    participantIds: z.array(z.string()),
  }),
  date: dateString,
  createdAt: isoTimestamp,
});

const paymentSchema = z.object({
  id: z.string().min(1),
  fromId: z.string(),
  toId: z.string(),
  amount: z.number(),
  date: dateString,
  createdAt: isoTimestamp,
});

/** Shape of a group plus every domain invariant (see `getGroupIssues`). */
export const groupSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    currency: z.literal('CLP'),
    members: z.array(memberSchema),
    expenses: z.array(expenseSchema),
    payments: z.array(paymentSchema),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  })
  .superRefine((group, ctx) => {
    for (const issue of getGroupIssues(group as Group)) {
      ctx.addIssue({ code: 'custom', message: issue });
    }
  });

/** Envelope only: each group is validated on its own (see `parseDocument`). */
export const documentEnvelope = z.object({
  version: z.literal(CURRENT_VERSION),
  groups: z.array(z.unknown()),
});

/** Latest document shape. */
export interface StoredDocument {
  version: typeof CURRENT_VERSION;
  groups: Group[];
}
