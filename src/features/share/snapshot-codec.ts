import { z } from 'zod';

import {
  fail,
  fromCompactSnapshotV1,
  toCompactSnapshotV1,
  type CompactSnapshotV1,
  type Result,
  type Snapshot,
} from '@/domain';

/**
 * Link format (ADR 0006): `v<version>.<payload>` in the URL hash.
 *
 * v1 payload: compact snapshot (`toCompactSnapshotV1`) -> JSON -> UTF-8 ->
 * deflate-raw -> base64url. Each version has its own decoder in `DECODERS`, so
 * links shared with an older version keep opening after the format changes.
 */
export const LINK_VERSION = 1;

/** The decompressed text of a link can never be larger than this (guards against zip bombs). */
const MAX_DECOMPRESSED_BYTES = 1_000_000;

const compactV1Schema = z.tuple([
  z.string(),
  z.number(),
  z.string(),
  z.array(z.tuple([z.string(), z.number(), z.string()])),
  z.array(
    z.tuple([
      z.string(),
      z.number(),
      z.number(),
      z.array(z.number()),
      z.string(),
      z.number(),
    ])
  ),
  z.array(
    z.tuple([z.number(), z.number(), z.number(), z.string(), z.number()])
  ),
]);

// --- base64url ------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// --- compression ------------------------------------------------------------

/** Pipes `input` through a (de)compression stream and collects the output. */
async function pipe(
  input: Uint8Array,
  transform: CompressionStream | DecompressionStream,
  maxBytes = Infinity
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // A failure shows up when reading; avoid an unhandled rejection here.
  void writer
    .write(input as Uint8Array<ArrayBuffer>)
    .then(() => writer.close())
    .catch(() => undefined);
  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RangeError('too large');
    }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/** Whether this browser can create and open links (CompressionStream is missing before Safari 16.4). */
export function isSnapshotLinkSupported(): boolean {
  return (
    typeof CompressionStream === 'function' &&
    typeof DecompressionStream === 'function'
  );
}

// --- public API -------------------------------------------------------------

/** Link token of a snapshot, e.g. `v1.eJy...` (what goes after `#`). */
export async function encodeSnapshot(snapshot: Snapshot): Promise<string> {
  const json = JSON.stringify(toCompactSnapshotV1(snapshot));
  const bytes = new TextEncoder().encode(json);
  const deflated = await pipe(bytes, new CompressionStream('deflate-raw'));
  return `v${LINK_VERSION}.${toBase64Url(deflated)}`;
}

async function decodeV1(payload: string): Promise<Result<Snapshot>> {
  const inflated = await pipe(
    fromBase64Url(payload),
    new DecompressionStream('deflate-raw'),
    MAX_DECOMPRESSED_BYTES
  );
  const json: unknown = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(inflated)
  );
  const parsed = compactV1Schema.safeParse(json);
  if (!parsed.success) return fail('invalid_snapshot', BROKEN);
  return fromCompactSnapshotV1(parsed.data as CompactSnapshotV1);
}

const DECODERS: Record<number, (payload: string) => Promise<Result<Snapshot>>> =
  { 1: decodeV1 };

const BROKEN =
  'Este link está incompleto o dañado. Pide que te lo compartan de nuevo.';
const UNSUPPORTED =
  'Este link es de una versión de Dividy que no conocemos. Pide que te lo compartan de nuevo.';

/** Accepts `#v1.xxx`, `v1.xxx` and surrounding whitespace. */
const TOKEN = /^v(\d{1,4})\.([A-Za-z0-9_-]+)$/;

/**
 * Opens a link token. It never throws: an empty, truncated, corrupt or
 * unknown-version token gives `{ ok: false, error }` with a message in Spanish.
 */
export async function decodeSnapshot(token: string): Promise<Result<Snapshot>> {
  const match = TOKEN.exec(token.trim().replace(/^#/, ''));
  if (!match) return fail('invalid_snapshot', BROKEN);
  const decoder = DECODERS[Number(match[1])];
  if (!decoder) return fail('unsupported_snapshot_version', UNSUPPORTED);
  try {
    return await decoder(match[2]);
  } catch {
    return fail('invalid_snapshot', BROKEN);
  }
}

/** Public link to a snapshot: the group travels in the hash, which never reaches the server. */
export function buildSnapshotUrl(origin: string, token: string): string {
  return `${origin}/shared#${token}`;
}
