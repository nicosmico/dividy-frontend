import { deflateRawSync } from 'node:zlib';

import type { Group } from '../src/domain';
import { createSnapshot, toCompactSnapshotV1 } from '../src/domain';

/**
 * The `v1.<payload>` token of a link (ADR 0006), built with Node's zlib: an
 * implementation independent from the browser's CompressionStream that the
 * app uses, so opening it also proves both agree on the format.
 */
export function snapshotToken(group: Group, takenAt: string): string {
  const compact = toCompactSnapshotV1(createSnapshot(group, takenAt));
  const payload = deflateRawSync(Buffer.from(JSON.stringify(compact)));
  return `v1.${payload.toString('base64url')}`;
}

/** Path (with hash) that opens a snapshot of `group`, e.g. `/shared#v1...`. */
export function snapshotPath(group: Group, takenAt: string): string {
  return `/shared#${snapshotToken(group, takenAt)}`;
}
