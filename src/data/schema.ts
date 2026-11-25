import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  getGroupIssues,
  getSnapshotIssues,
  type Group,
  type Snapshot,
} from '@/domain';
import { z } from 'zod';

/**
 * Version 4: a `snapshots` list next to `groups` (read-only captures opened
 * from a link, ADR 0006). Version 3 added `avatar` (`color` 0-7 and `seed`) to
 * every member.
 *
 * Currencies per group (ADR 0009) did not change the version: `currency` was
 * already stored (always `'CLP'`), so existing documents stay valid as they
 * are, and a saved snapshot without one reads as CLP (`default` below).
 */
export const CURRENT_VERSION = 4;

const isoTimestamp = z.string().min(1);
const dateString = z.string();

// Range and non-empty seed are checked by `getGroupIssues` (see `groupSchema`).
const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  avatar: z.object({ color: z.number(), seed: z.string() }),
});

const participantIds = z.array(z.string());
const perParticipant = z.record(z.string(), z.number());

/**
 * The four kinds of split (ADR 0008). Adding the three custom kinds only
 * widens what is accepted, so documents written before them stay valid and
 * the document version does not change; what each value means (and that they
 * add up) is checked by `getGroupIssues`.
 */
const splitSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('equal'), participantIds }),
  z.object({
    type: z.literal('exact'),
    participantIds,
    amounts: perParticipant,
  }),
  z.object({
    type: z.literal('percent'),
    participantIds,
    basisPoints: perParticipant,
  }),
  z.object({
    type: z.literal('shares'),
    participantIds,
    parts: perParticipant,
  }),
]);

const expenseSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  amount: z.number(),
  payerId: z.string(),
  split: splitSchema,
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
    currency: z.enum(CURRENCY_CODES),
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

/** Shape of a saved snapshot plus every invariant (see `getSnapshotIssues`). */
export const snapshotSchema = z
  .object({
    sourceGroupId: z.string().min(1),
    takenAt: isoTimestamp,
    name: z.string(),
    currency: z.enum(CURRENCY_CODES).default(DEFAULT_CURRENCY),
    members: z.array(memberSchema),
    expenses: z.array(expenseSchema),
    payments: z.array(paymentSchema),
  })
  .superRefine((snapshot, ctx) => {
    for (const issue of getSnapshotIssues(snapshot as Snapshot)) {
      ctx.addIssue({ code: 'custom', message: issue });
    }
  });

/** Envelope only: each group and snapshot is validated on its own (see `parseDocument`). */
export const documentEnvelope = z.object({
  version: z.literal(CURRENT_VERSION),
  groups: z.array(z.unknown()),
  snapshots: z.array(z.unknown()).default([]),
});

/** Latest document shape. */
export interface StoredDocument {
  version: typeof CURRENT_VERSION;
  groups: Group[];
  snapshots: Snapshot[];
}
