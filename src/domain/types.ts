import type { CurrencyCode } from './currency';

export type MemberId = string;
export type ExpenseId = string;
export type PaymentId = string;
export type GroupId = string;

/**
 * A whole number of the smallest unit of the group's currency: pesos for CLP,
 * cents for USD. Decimals only exist when an amount is shown or typed (ADR 0009).
 */
export type Amount = number;

/**
 * Face and background of a member. Both are stored so the avatar never changes
 * by itself: `color` is an index into the 8-color palette (0-7) and `seed`
 * decides the face (it starts as the member id and changes on "regenerate").
 */
export interface MemberAvatar {
  color: number;
  seed: string;
}

export interface Member {
  id: MemberId;
  name: string;
  avatar: MemberAvatar;
}

export interface EqualSplit {
  type: 'equal';
  participantIds: MemberId[];
}

/** Each participant owes an amount in the group's smallest unit; the amounts add up to the expense. */
export interface ExactSplit {
  type: 'exact';
  participantIds: MemberId[];
  amounts: Record<MemberId, Amount>;
}

/**
 * Each participant owes a percentage, stored as integer basis points
 * (100,00 % = 10000); they add up to 10000. See ADR 0008.
 */
export interface PercentSplit {
  type: 'percent';
  participantIds: MemberId[];
  basisPoints: Record<MemberId, number>;
}

/** Each participant owes in proportion to their parts (integers, at least 1). */
export interface SharesSplit {
  type: 'shares';
  participantIds: MemberId[];
  parts: Record<MemberId, number>;
}

/** Discriminated union: how an expense is divided among its participants. */
export type Split = EqualSplit | ExactSplit | PercentSplit | SharesSplit;
export type SplitType = Split['type'];

export interface Expense {
  id: ExpenseId;
  description: string;
  amount: Amount;
  payerId: MemberId;
  split: Split;
  /** 'YYYY-MM-DD' */
  date: string;
  /** ISO timestamp */
  createdAt: string;
}

export interface Payment {
  id: PaymentId;
  fromId: MemberId;
  toId: MemberId;
  amount: Amount;
  /** 'YYYY-MM-DD' */
  date: string;
  /** ISO timestamp */
  createdAt: string;
}

export interface Group {
  id: GroupId;
  name: string;
  currency: CurrencyCode;
  /** Order matters: it decides who receives the remainder and display order. */
  members: Member[];
  expenses: Expense[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export type DomainErrorCode =
  | 'invalid_group_name'
  | 'invalid_member_name'
  | 'duplicate_member_name'
  | 'duplicate_member_id'
  | 'duplicate_id'
  | 'member_not_found'
  | 'member_has_activity'
  | 'invalid_reassign_target'
  | 'expense_not_found'
  | 'payment_not_found'
  | 'invalid_description'
  | 'invalid_amount'
  | 'invalid_currency'
  | 'currency_locked'
  | 'invalid_date'
  | 'payer_not_found'
  | 'participant_not_found'
  | 'duplicate_participant'
  | 'invalid_avatar'
  | 'invalid_snapshot'
  | 'unsupported_snapshot_version'
  | 'no_participants'
  | 'invalid_split'
  | 'same_member_payment';

export interface DomainError {
  code: DomainErrorCode;
  /** Spanish, safe to show to the user. */
  message: string;
}

export type Result<T, E = DomainError> =
  { ok: true; value: T } | { ok: false; error: E };
