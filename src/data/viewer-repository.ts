import type { ViewerChoice, ViewerScope } from '@/domain';

/**
 * Persistence port for "who am I" on this device (ADR 0007): asynchronous like
 * the other repositories (ADR 0002) and just as free of business rules. A
 * choice belongs to the device, not to a group or a snapshot, so it lives
 * outside them. Whether a saved member still exists is decided by the domain
 * (`resolveViewer`), not here.
 */
export interface ViewerRepository {
  /** The saved choice, or `null` when the person was never asked. */
  get(scope: ViewerScope): Promise<ViewerChoice | null>;
  /** Saves the choice or replaces the one of the same scope. */
  set(scope: ViewerScope, choice: ViewerChoice): Promise<void>;
  /** Forgets the choice (the person will be asked again). Clearing an unknown scope is a no-op. */
  clear(scope: ViewerScope): Promise<void>;
}

/** Key of a scope in a flat map. A group and a snapshot never share one. */
export function viewerScopeKey(scope: ViewerScope): string {
  return `${scope.kind}:${scope.id}`;
}
