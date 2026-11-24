import { capitalizeFirst, type Group } from '@/domain';
import {
  CURRENT_VERSION,
  documentEnvelope,
  groupSchema,
  type StoredDocument,
} from './schema';

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capitalizeField(item: unknown, field: string): unknown {
  if (!isObject(item) || typeof item[field] !== 'string') return item;
  return { ...item, [field]: capitalizeFirst(item[field]) };
}

/**
 * Capitalizes member names of one group. A name whose capitalized form would
 * clash (ignoring case) with a name already kept keeps its original value, so
 * no data is lost. v1 compared names ignoring case, so this should never
 * happen with valid data.
 */
function capitalizeMembers(members: unknown): unknown {
  if (!Array.isArray(members)) return members;
  const taken = new Set<string>();
  return members.map((member: unknown) => {
    if (!isObject(member) || typeof member.name !== 'string') return member;
    const capitalized = capitalizeFirst(member.name);
    const key = capitalized.trim().toLowerCase();
    const name = taken.has(key) ? member.name : capitalized;
    taken.add(name.trim().toLowerCase());
    return { ...member, name };
  });
}

/** v1 -> v2: capitalizes group names, member names and expense descriptions. */
function migrateV1toV2(doc: unknown): unknown {
  if (!isObject(doc) || !Array.isArray(doc.groups))
    return { ...(doc as Json), version: 2 };
  const groups = doc.groups.map((group: unknown) => {
    if (!isObject(group)) return group;
    const named = capitalizeField(group, 'name') as Json;
    return {
      ...named,
      members: capitalizeMembers(named.members),
      expenses: Array.isArray(named.expenses)
        ? named.expenses.map((e: unknown) => capitalizeField(e, 'description'))
        : named.expenses,
    };
  });
  return { ...doc, version: 2, groups };
}

/**
 * Migrations by source version: `migrations[n]` turns a version `n` document
 * into version `n + 1`. Add an entry (and bump `CURRENT_VERSION`) when the
 * format changes.
 */
export const migrations: Record<number, (doc: unknown) => unknown> = {
  1: migrateV1toV2,
};

/** Applies `table[version]`, `table[version + 1]`... until `target`. */
export function runMigrations(
  raw: unknown,
  version: number,
  target: number,
  table: Record<number, (doc: unknown) => unknown> = migrations
): { ok: true; value: unknown } | { ok: false; reason: string } {
  let current = raw;
  for (let v = version; v < target; v++) {
    const migrate = table[v];
    if (!migrate) return { ok: false, reason: `no migration from v${v}` };
    current = migrate(current);
  }
  return { ok: true, value: current };
}

export function emptyDocument(): StoredDocument {
  return { version: CURRENT_VERSION, groups: [] };
}

/** A group of the stored document that failed validation. */
export interface RejectedGroup {
  /** The group exactly as it was stored. */
  raw: unknown;
  reason: string;
}

export type ParseResult =
  | { ok: true; document: StoredDocument; rejected: RejectedGroup[] }
  | { ok: false; reason: string };

/**
 * Parses stored text, applies pending migrations and validates the result.
 * Invalid JSON, a missing/unknown version or a wrong envelope make the whole
 * document unusable (`ok: false`). Otherwise every group is validated on its
 * own: valid ones are returned, invalid ones are reported in `rejected`.
 */
export function parseDocument(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid JSON' };
  }
  if (typeof raw !== 'object' || raw === null || !('version' in raw)) {
    return { ok: false, reason: 'missing version' };
  }
  const version = (raw as { version: unknown }).version;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    return { ok: false, reason: 'invalid version' };
  }
  if (version > CURRENT_VERSION) {
    return { ok: false, reason: `unsupported future version ${version}` };
  }
  const migrated = runMigrations(raw, version, CURRENT_VERSION);
  if (!migrated.ok) return migrated;
  raw = migrated.value;
  const envelope = documentEnvelope.safeParse(raw);
  if (!envelope.success) {
    return {
      ok: false,
      reason: envelope.error.issues[0]?.message ?? 'invalid shape',
    };
  }
  const groups: Group[] = [];
  const rejected: RejectedGroup[] = [];
  for (const candidate of envelope.data.groups) {
    const parsed = groupSchema.safeParse(candidate);
    if (parsed.success) groups.push(parsed.data as Group);
    else {
      rejected.push({
        raw: candidate,
        reason: parsed.error.issues[0]?.message ?? 'invalid shape',
      });
    }
  }
  return {
    ok: true,
    document: { version: CURRENT_VERSION, groups },
    rejected,
  };
}
