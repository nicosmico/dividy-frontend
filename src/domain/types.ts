export type MemberId = string;
export type ExpenseId = string;
export type PaymentId = string;
export type GroupId = string;

/** Whole Chilean pesos (CLP has no decimals). See ADR 0001. */
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

/** Discriminated union so other split kinds can be added without migrations. */
export type Split = EqualSplit;

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
  currency: 'CLP';
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
  | 'invalid_date'
  | 'payer_not_found'
  | 'participant_not_found'
  | 'duplicate_participant'
  | 'invalid_avatar'
  | 'invalid_snapshot'
  | 'unsupported_snapshot_version'
  | 'no_participants'
  | 'same_member_payment';

export interface DomainError {
  code: DomainErrorCode;
  /** Spanish, safe to show to the user. */
  message: string;
}

export type Result<T, E = DomainError> =
  { ok: true; value: T } | { ok: false; error: E };
