import { deflateRawSync } from 'node:zlib';

import type { Group } from '../src/domain';
import {
  createSnapshot,
  toCompactSnapshotV1,
  toCompactSnapshotV2,
} from '../src/domain';

/**
 * The `v2.<payload>` token of a link (ADR 0006), built with Node's zlib: an
 * implementation independent from the browser's CompressionStream that the
 * app uses, so opening it also proves both agree on the format. With
 * `version: 1` it builds the old format (equal splits only), to prove that
 * links shared before v2 still open.
 */
export function snapshotToken(
  group: Group,
  takenAt: string,
  version: 1 | 2 = 2
): string {
  const snapshot = createSnapshot(group, takenAt);
  const compact =
    version === 1
      ? toCompactSnapshotV1(snapshot)
      : toCompactSnapshotV2(snapshot);
  const payload = deflateRawSync(Buffer.from(JSON.stringify(compact)));
  return `v${version}.${payload.toString('base64url')}`;
}

/** Path (with hash) that opens a snapshot of `group`, e.g. `/shared#v2...`. */
export function snapshotPath(
  group: Group,
  takenAt: string,
  version: 1 | 2 = 2
): string {
  return `/shared#${snapshotToken(group, takenAt, version)}`;
}
