import { fail, ok } from './result';
import { splitValuesOf } from './split';
import type {
  Expense,
  Group,
  GroupId,
  Member,
  MemberId,
  Payment,
  Result,
  Split,
} from './types';
import { getGroupIssues } from './validation';

/**
 * Fixed copy of a group at a moment in time (ADR 0006). It is opened from a
 * link and can only be looked at. Ids are replaced by positions (`m0`, `e0`,
 * `p0`...), so a snapshot says nothing about the ids of the original group
 * beyond `sourceGroupId`, which is what tells two snapshots of the same group
 * apart from snapshots of different ones.
 */
export interface Snapshot {
  sourceGroupId: GroupId;
  /** ISO timestamp (canonical: `toISOString()`). */
  takenAt: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  payments: Payment[];
}

/** Canonical ISO form of a timestamp, or `fallback` when it is not a date. */
function canonicalIso(value: string, fallback: string): string {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? fallback : new Date(ms).toISOString();
}

/** The split with member ids replaced by `m<position>`, participants sorted by position. */
function positionalSplit(
  split: Split,
  position: (id: MemberId) => number
): Split {
  const participantIds = split.participantIds
    .map(position)
    .sort((a, b) => a - b)
    .map((p) => `m${p}`);
  const values = splitValuesOf(split);
  if (!values) return { type: 'equal', participantIds };
  const moved = Object.fromEntries(
    split.participantIds.map((id) => [`m${position(id)}`, values[id]])
  );
  switch (split.type) {
    case 'exact':
      return { type: 'exact', participantIds, amounts: moved };
    case 'percent':
      return { type: 'percent', participantIds, basisPoints: moved };
    default:
      return { type: 'shares', participantIds, parts: moved };
  }
}

/**
 * Copies `group` into a snapshot taken at `takenAt`. Ids become positions,
 * participants are sorted by member position and timestamps are written in
 * canonical form, so the same group always gives the same snapshot and
 * `decode(encode(snapshot))` equals `snapshot`.
 */
export function createSnapshot(group: Group, takenAt: string): Snapshot {
  const taken = canonicalIso(takenAt, new Date(0).toISOString());
  const memberIndex = new Map<MemberId, number>(
    group.members.map((m, i) => [m.id, i])
  );
  const position = (id: MemberId) => memberIndex.get(id) ?? -1;
  return {
    sourceGroupId: group.id,
    takenAt: taken,
    name: group.name,
    members: group.members.map((m, i) => ({
      id: `m${i}`,
      name: m.name,
      avatar: { color: m.avatar.color, seed: m.avatar.seed },
    })),
    expenses: group.expenses.map((e, i) => ({
      id: `e${i}`,
      description: e.description,
      amount: e.amount,
      payerId: `m${position(e.payerId)}`,
      split: positionalSplit(e.split, position),
      date: e.date,
      createdAt: canonicalIso(e.createdAt, taken),
    })),
    payments: group.payments.map((p, i) => ({
      id: `p${i}`,
      fromId: `m${position(p.fromId)}`,
      toId: `m${position(p.toId)}`,
      amount: p.amount,
      date: p.date,
      createdAt: canonicalIso(p.createdAt, taken),
    })),
  };
}

/**
 * The snapshot as a `Group`, so every calculation and screen that works on a
 * group works on a snapshot. The group id is the `sourceGroupId`; `createdAt`
 * and `updatedAt` are the moment of the capture.
 */
export function snapshotToGroup(snapshot: Snapshot): Group {
  return {
    id: snapshot.sourceGroupId,
    name: snapshot.name,
    currency: 'CLP',
    members: snapshot.members,
    expenses: snapshot.expenses,
    payments: snapshot.payments,
    createdAt: snapshot.takenAt,
    updatedAt: snapshot.takenAt,
  };
}

/** Broken invariants of a snapshot (empty when it is valid). */
export function getSnapshotIssues(snapshot: Snapshot): string[] {
  const issues: string[] = [];
  if (snapshot.sourceGroupId.length === 0) issues.push('empty sourceGroupId');
  if (Number.isNaN(Date.parse(snapshot.takenAt))) {
    issues.push('invalid takenAt');
  }
  for (const e of snapshot.expenses) {
    if (Number.isNaN(Date.parse(e.createdAt))) {
      issues.push(`expense ${e.id}: invalid createdAt`);
    }
  }
  for (const p of snapshot.payments) {
    if (Number.isNaN(Date.parse(p.createdAt))) {
      issues.push(`payment ${p.id}: invalid createdAt`);
    }
  }
  return [...issues, ...getGroupIssues(snapshotToGroup(snapshot))];
}

/** How an incoming snapshot compares with the one already saved. */
export type SnapshotSaveDecision =
  /** Nothing saved for that group yet. */
  | 'save'
  /** The incoming one is newer: it replaces the saved one. */
  | 'replace'
  /** Same capture: already saved. */
  | 'same'
  /** The saved one is newer: keep it and warn. */
  | 'older';

/** Decides what saving `incoming` means given the snapshot saved for the same group (by `takenAt`). */
export function decideSnapshotSave(
  saved: Snapshot | null,
  incoming: Snapshot
): SnapshotSaveDecision {
  if (!saved) return 'save';
  const diff = Date.parse(incoming.takenAt) - Date.parse(saved.takenAt);
  if (diff > 0) return 'replace';
  if (diff < 0) return 'older';
  return 'same';
}

/**
 * Compact form of format `v1` (see ADR 0006): positional arrays instead of
 * objects and member positions instead of ids. Equal splits only.
 */
export type CompactSnapshotV1 = [
  sourceGroupId: string,
  takenAt: number,
  name: string,
  members: [name: string, color: number, seed: string][],
  expenses: [
    description: string,
    amount: number,
    payer: number,
    participants: number[],
    date: string,
    createdAt: number,
  ][],
  payments: [
    from: number,
    to: number,
    amount: number,
    date: string,
    createdAt: number,
  ][],
];

/**
 * Split kind of a v2 expense: 1 `exact`, 2 `percent`, 3 `shares`. An equal
 * split writes neither the kind nor the values (ADR 0006, section v2).
 */
export type CompactSplitKind = 1 | 2 | 3;
const KIND_OF_TYPE = { exact: 1, percent: 2, shares: 3 } as const;
const TYPE_OF_KIND = { 1: 'exact', 2: 'percent', 3: 'shares' } as const;

/**
 * Compact form of format `v2`: the v1 shape with two trailing fields in each
 * expense, only for custom splits: the split kind and one value per
 * participant (same order as `participants`).
 */
export type CompactSnapshotV2 = [
  ...CompactSnapshotV1Head,
  expenses: (
    | CompactExpenseV1
    | [...CompactExpenseV1, kind: CompactSplitKind, values: number[]]
  )[],
  payments: CompactSnapshotV1[5],
];
type CompactSnapshotV1Head = [
  sourceGroupId: CompactSnapshotV1[0],
  takenAt: CompactSnapshotV1[1],
  name: CompactSnapshotV1[2],
  members: CompactSnapshotV1[3],
];
type CompactExpenseV1 = CompactSnapshotV1[4][number];

/** Replaces ids by positions and timestamps by epoch milliseconds. Equal splits only (use v2 for the rest). */
export function toCompactSnapshotV1(snapshot: Snapshot): CompactSnapshotV1 {
  const compact = toCompactSnapshotV2(snapshot);
  return [
    compact[0],
    compact[1],
    compact[2],
    compact[3],
    compact[4].map((e): CompactExpenseV1 => [
      e[0],
      e[1],
      e[2],
      e[3],
      e[4],
      e[5],
    ]),
    compact[5],
  ];
}

/** Replaces ids by positions and timestamps by epoch milliseconds. */
export function toCompactSnapshotV2(snapshot: Snapshot): CompactSnapshotV2 {
  const index = new Map<MemberId, number>(
    snapshot.members.map((m, i) => [m.id, i])
  );
  const at = (id: MemberId) => index.get(id) ?? -1;
  return [
    snapshot.sourceGroupId,
    Date.parse(snapshot.takenAt),
    snapshot.name,
    snapshot.members.map((m) => [m.name, m.avatar.color, m.avatar.seed]),
    snapshot.expenses.map((e) => {
      const base: CompactExpenseV1 = [
        e.description,
        e.amount,
        at(e.payerId),
        e.split.participantIds.map(at),
        e.date,
        Date.parse(e.createdAt),
      ];
      const values = splitValuesOf(e.split);
      if (!values || e.split.type === 'equal') return base;
      return [
        ...base,
        KIND_OF_TYPE[e.split.type],
        e.split.participantIds.map((id) => values[id]),
      ];
    }),
    snapshot.payments.map((p) => [
      at(p.fromId),
      at(p.toId),
      p.amount,
      p.date,
      Date.parse(p.createdAt),
    ]),
  ];
}

const INVALID = 'El contenido del link no es válido.';

/** Rebuilds a snapshot from the compact form of `v1`. */
export function fromCompactSnapshotV1(
  compact: CompactSnapshotV1
): Result<Snapshot> {
  return fromCompactSnapshotV2(compact);
}

/**
 * Rebuilds a snapshot from its compact form (`v2`, and `v1`, which is the
 * same without custom splits), checking that every position points to a
 * member and that the result satisfies every group invariant.
 */
export function fromCompactSnapshotV2(
  compact: CompactSnapshotV1 | CompactSnapshotV2
): Result<Snapshot> {
  const [sourceGroupId, takenAt, name, members, expenses, payments] = compact;
  const instants = [
    takenAt,
    ...expenses.map((e) => e[5]),
    ...payments.map((p) => p[4]),
  ];
  const validInstant = (ms: number) =>
    Number.isFinite(ms) && Math.abs(ms) <= 8.64e15;
  if (!instants.every(validInstant)) return fail('invalid_snapshot', INVALID);

  const count = members.length;
  const isPosition = (i: number) => Number.isInteger(i) && i >= 0 && i < count;
  const positions = expenses.flatMap((e) => [e[2], ...e[3]]);
  for (const p of payments) positions.push(p[0], p[1]);
  if (!positions.every(isPosition)) return fail('invalid_snapshot', INVALID);

  const splits: Split[] = [];
  for (const e of expenses) {
    const participantIds = e[3].map((p) => `m${p}`);
    const [, , , , , , kind, values] = e as [
      ...CompactExpenseV1,
      CompactSplitKind?,
      number[]?,
    ];
    if (kind === undefined) {
      splits.push({ type: 'equal', participantIds });
      continue;
    }
    const type = TYPE_OF_KIND[kind];
    if (!type || !values || values.length !== participantIds.length) {
      return fail('invalid_snapshot', INVALID);
    }
    const byId = Object.fromEntries(
      participantIds.map((id, i) => [id, values[i]])
    );
    splits.push(
      type === 'exact'
        ? { type, participantIds, amounts: byId }
        : type === 'percent'
          ? { type, participantIds, basisPoints: byId }
          : { type, participantIds, parts: byId }
    );
  }

  const iso = (ms: number) => new Date(ms).toISOString();
  const snapshot: Snapshot = {
    sourceGroupId,
    takenAt: iso(takenAt),
    name,
    members: members.map(([memberName, color, seed], i) => ({
      id: `m${i}`,
      name: memberName,
      avatar: { color, seed },
    })),
    expenses: expenses.map(
      ([description, amount, payer, , date, createdAt], i) => ({
        id: `e${i}`,
        description,
        amount,
        payerId: `m${payer}`,
        split: splits[i],
        date,
        createdAt: iso(createdAt),
      })
    ),
    payments: payments.map(([from, to, amount, date, createdAt], i) => ({
      id: `p${i}`,
      fromId: `m${from}`,
      toId: `m${to}`,
      amount,
      date,
      createdAt: iso(createdAt),
    })),
  };
  if (getSnapshotIssues(snapshot).length > 0) {
    return fail('invalid_snapshot', INVALID);
  }
  return ok(snapshot);
}
