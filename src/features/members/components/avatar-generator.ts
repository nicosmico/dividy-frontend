import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';

import { avatarBackground } from './avatar-palette';
import type { AvatarMood } from './avatar-uri';

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

/**
 * Illustrated avatar as a data URI, generated locally (no network). This
 * module is the only one that imports dicebear and is loaded on demand by
 * `avatar-uri.ts`, so the library stays out of the initial and tab chunks.
 */
export function generateAvatarUri(
  seed: string,
  color: number,
  mood: AvatarMood
): string {
  return createAvatar(lorelei, {
    seed,
    mouth: [...(mood === 'happy' ? HAPPY_MOUTHS : SAD_MOUTHS)],
    backgroundColor: [avatarBackground(color).slice(1)],
    backgroundType: ['solid'],
  }).toDataUri();
}
