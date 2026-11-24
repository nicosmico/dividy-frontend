import type { ViewerChoice, ViewerScope } from '@/domain';
import { viewerScopeKey, type ViewerRepository } from './viewer-repository';

/** Repository backed by a Map. For tests and as a reference implementation. */
export class InMemoryViewerRepository implements ViewerRepository {
  private readonly choices = new Map<string, ViewerChoice>();

  /** `initial` maps `viewerScopeKey(scope)` (`group:<id>`, `snapshot:<id>`) to a choice. */
  constructor(initial: Record<string, ViewerChoice> = {}) {
    for (const [key, choice] of Object.entries(initial)) {
      this.choices.set(key, structuredClone(choice));
    }
  }

  async get(scope: ViewerScope): Promise<ViewerChoice | null> {
    const choice = this.choices.get(viewerScopeKey(scope));
    return choice ? structuredClone(choice) : null;
  }

  async set(scope: ViewerScope, choice: ViewerChoice): Promise<void> {
    this.choices.set(viewerScopeKey(scope), structuredClone(choice));
  }

  async clear(scope: ViewerScope): Promise<void> {
    this.choices.delete(viewerScopeKey(scope));
  }
}
