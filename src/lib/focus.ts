/** Id of the `<main>` element, also the target of the "skip to content" link. */
export const MAIN_ID = 'main-content';

/**
 * After something that held focus disappears (a deleted row, a closed dialog
 * whose trigger no longer exists), the browser drops focus on `<body>` and a
 * keyboard user has to tab from the top again. Call this once the change is
 * rendered: if focus was lost it moves to `fallback`, or to `<main>`.
 * Focus that is somewhere real is left alone.
 */
export function restoreFocusIfLost(fallback?: HTMLElement | null) {
  // Runs after Radix has had its own chance to give focus back to the trigger.
  window.setTimeout(() => {
    const active = document.activeElement;
    if (active && active !== document.body && document.contains(active)) return;
    const target =
      fallback && fallback.isConnected
        ? fallback
        : document.getElementById(MAIN_ID);
    target?.focus({ preventScroll: true });
  }, 60);
}
