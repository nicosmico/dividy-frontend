import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';

export type AvatarMood = 'happy' | 'sad';

const HAPPY_MOUTHS = [
  'happy01',
  'happy02',
  'happy03',
  'happy04',
  'happy05',
  'happy06',
  'happy07',
  'happy08',
  'happy09',
  'happy10',
  'happy11',
  'happy12',
  'happy13',
  'happy14',
  'happy15',
  'happy16',
  'happy17',
  'happy18',
] as const;

const SAD_MOUTHS = [
  'sad01',
  'sad02',
  'sad03',
  'sad04',
  'sad05',
  'sad06',
  'sad07',
  'sad08',
  'sad09',
] as const;

const BACKGROUNDS = [
  'fef3c7',
  'fde68a',
  'e7e5e4',
  'ecfccb',
  'e0f2fe',
  'ffe4e6',
];

const cache = new Map<string, string>();

/** Illustrated avatar as a data URI, generated locally (no network). Cached. */
export function getAvatarUri(seed: string, mood: AvatarMood): string {
  const key = `${mood}:${seed}`;
  let uri = cache.get(key);
  if (!uri) {
    uri = createAvatar(lorelei, {
      seed,
      mouth: [...(mood === 'happy' ? HAPPY_MOUTHS : SAD_MOUTHS)],
      backgroundColor: BACKGROUNDS,
      backgroundType: ['solid'],
    }).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}
