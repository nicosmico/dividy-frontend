import { useEffect, useState } from 'react';

import { createSnapshot, type Group, type Snapshot } from '@/domain';
import { useServices } from '@/features/groups/data';
import {
  buildSnapshotUrl,
  encodeSnapshot,
  isSnapshotLinkSupported,
} from './snapshot-codec';

export interface ShareLink {
  /** The full read-only link, e.g. `https://dividy.app/shared#v2...`. */
  url: string;
  /** The moment of the capture the link opens. */
  takenAt: string;
}

/** The link of a snapshot, or `null` when this browser cannot make links. */
export async function buildShareLink(
  snapshot: Snapshot
): Promise<ShareLink | null> {
  if (!isSnapshotLinkSupported()) return null;
  try {
    const token = await encodeSnapshot(snapshot);
    return {
      url: buildSnapshotUrl(window.location.origin, token),
      takenAt: snapshot.takenAt,
    };
  } catch {
    return null;
  }
}

/**
 * Prepares the read-only link while the screen is open, so the share button
 * can call `navigator.share` right away: awaiting the compression inside the
 * click handler can lose the user gesture on iOS.
 *
 * Without `fixed` the link is a new capture of `group` (taken when `group`
 * last changed). With `fixed` (a snapshot being viewed) it is that same
 * capture, so the link and its date never change.
 */
export function useShareLink(group: Group, fixed?: Snapshot | null) {
  const { now } = useServices();
  const [link, setLink] = useState<ShareLink | null>(null);

  useEffect(() => {
    let cancelled = false;
    const snapshot = fixed ?? createSnapshot(group, now());
    void buildShareLink(snapshot).then((built) => {
      if (!cancelled) setLink(built);
    });
    return () => {
      cancelled = true;
    };
  }, [group, fixed, now]);

  return {
    link,
    /** Builds the link now (for when the click comes before the effect finished). */
    build: () => buildShareLink(fixed ?? createSnapshot(group, now())),
  };
}
