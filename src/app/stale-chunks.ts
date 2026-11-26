/**
 * After a new version is published, a page that was already open still asks
 * for the old files of each screen (their names change with every build) and
 * those files no longer exist: opening a screen that was not loaded yet
 * fails. The fix is to reload the page, which brings the new version.
 */

const RELOADED_AT_KEY = 'dividy.staleChunkReloadAt';
/** A file that is really missing must not reload the page in a loop. */
const COOLDOWN_MS = 10_000;

/**
 * True for the error a browser gives when a lazily loaded file cannot be
 * fetched (each browser words it differently).
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i.test(
    `${error.name} ${error.message}`
  );
}

/**
 * Reloads the page to get the new version, at most once every 10 seconds.
 * Returns whether it reloaded. Without session storage it does not reload,
 * since it could not tell a loop apart.
 */
export function reloadForNewVersion({
  storage = window.sessionStorage,
  now = Date.now(),
  reload = () => window.location.reload(),
}: {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  now?: number;
  reload?: () => void;
} = {}): boolean {
  try {
    const last = Number(storage.getItem(RELOADED_AT_KEY)) || 0;
    if (now - last < COOLDOWN_MS) return false;
    storage.setItem(RELOADED_AT_KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}

/**
 * Vite reports a failed preload of a screen's files with `vite:preloadError`;
 * reloading there avoids the error screen altogether.
 */
export function listenForStaleChunks(target: Window = window) {
  target.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
}
