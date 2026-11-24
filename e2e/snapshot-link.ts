import { deflateRawSync } from 'node:zlib';

import type { Group } from '../src/domain';
import {
  createSnapshot,
  toCompactSnapshotV1,
  toCompactSnapshotV2,
  toCompactSnapshotV3,
} from '../src/domain';

/**
 * The `v3.<payload>` token of a link (ADR 0006), built with Node's zlib: an
 * implementation independent from the browser's CompressionStream that the
 * app uses, so opening it also proves both agree on the format. With
 * `version: 1` it builds the old format (equal splits only) and with 2 the one
 * without currency, to prove that links shared before v3 still open (as CLP).
 */
export function snapshotToken(
  group: Group,
  takenAt: string,
  version: 1 | 2 | 3 = 3
): string {
  const snapshot = createSnapshot(group, takenAt);
  const compact =
    version === 1
      ? toCompactSnapshotV1(snapshot)
      : version === 2
        ? toCompactSnapshotV2(snapshot)
        : toCompactSnapshotV3(snapshot);
  const payload = deflateRawSync(Buffer.from(JSON.stringify(compact)));
  return `v${version}.${payload.toString('base64url')}`;
}

/** Path (with hash) that opens a snapshot of `group`, e.g. `/shared#v3...`. */
export function snapshotPath(
  group: Group,
  takenAt: string,
  version: 1 | 2 | 3 = 3
): string {
  return `/shared#${snapshotToken(group, takenAt, version)}`;
}
