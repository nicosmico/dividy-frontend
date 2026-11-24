export type AvatarMood = 'happy' | 'sad';

/** What decides how an avatar looks: face (seed), background (color) and mood. */
export interface AvatarSpec {
  seed: string;
  color: number;
  mood: AvatarMood;
}

const cache = new Map<string, string>();

/** Cache key: one entry per seed, color and mood. */
export const avatarKey = ({ seed, color, mood }: AvatarSpec) =>
  `${mood}:${color}:${seed}`;

/** The avatar if it was already generated, `undefined` otherwise. Synchronous. */
export function getCachedAvatarUri(spec: AvatarSpec): string | undefined {
  return cache.get(avatarKey(spec));
}

/**
 * Avatar as a data URI. The generator (dicebear, ~100 kB gzip) is loaded the
 * first time it is needed; results are cached by seed, color and mood.
 */
export async function loadAvatarUri(spec: AvatarSpec): Promise<string> {
  const cached = getCachedAvatarUri(spec);
  if (cached) return cached;
  const { generateAvatarUri } = await import('./avatar-generator');
  const uri = generateAvatarUri(spec.seed, spec.color, spec.mood);
  cache.set(avatarKey(spec), uri);
  return uri;
}
