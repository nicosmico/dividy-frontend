import {
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

/** Shape of a saved snapshot plus every invariant (see `getSnapshotIssues`). */
export const snapshotSchema = z
  .object({
    sourceGroupId: z.string().min(1),
    takenAt: isoTimestamp,
    name: z.string(),
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
