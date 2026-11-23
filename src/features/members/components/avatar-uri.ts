export type AvatarMood = 'happy' | 'sad';

const cache = new Map<string, string>();

const keyOf = (seed: string, mood: AvatarMood) => `${mood}:${seed}`;

/** The avatar if it was already generated, `undefined` otherwise. Synchronous. */
export function getCachedAvatarUri(
  seed: string,
  mood: AvatarMood
): string | undefined {
  return cache.get(keyOf(seed, mood));
}

/**
 * Avatar as a data URI. The generator (dicebear, ~100 kB gzip) is loaded the
 * first time it is needed; results are cached by seed and mood.
 */
export async function loadAvatarUri(
  seed: string,
  mood: AvatarMood
): Promise<string> {
  const cached = getCachedAvatarUri(seed, mood);
  if (cached) return cached;
  const { generateAvatarUri } = await import('./avatar-generator');
  const uri = generateAvatarUri(seed, mood);
  cache.set(keyOf(seed, mood), uri);
  return uri;
}
