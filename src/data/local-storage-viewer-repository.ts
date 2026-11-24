import { z } from 'zod';

import type { ViewerChoice, ViewerScope } from '@/domain';
import { viewerScopeKey, type ViewerRepository } from './viewer-repository';

export const VIEWERS_STORAGE_KEY = 'dividy.viewers';

const choiceSchema = z.union([
  z.strictObject({ memberId: z.string().min(1) }),
  z.strictObject({ none: z.literal(true) }),
]);

/** `{ version: 1, choices: { 'group:<id>': choice, 'snapshot:<id>': choice } }` */
const documentSchema = z.object({
  version: z.literal(1),
  choices: z.record(z.string(), z.unknown()),
});

export interface LocalStorageViewerRepositoryOptions {
  storage?: Storage;
}

/**
 * Keeps the choices in their own `localStorage` key, apart from the groups and
 * snapshots document (ADR 0007): they are a preference of this device, and the
 * day groups come from a server they must not travel with them. The text is
 * read and validated each time (it is tiny); anything unreadable is treated as
 * "nobody was asked yet" and is overwritten by the next choice, because a lost
 * preference costs one tap, unlike a lost group.
 */
export class LocalStorageViewerRepository implements ViewerRepository {
  private readonly storage: Storage;

  constructor(options: LocalStorageViewerRepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage;
  }

  async get(scope: ViewerScope): Promise<ViewerChoice | null> {
    return this.read()[viewerScopeKey(scope)] ?? null;
  }

  async set(scope: ViewerScope, choice: ViewerChoice): Promise<void> {
    this.write({ ...this.read(), [viewerScopeKey(scope)]: choice });
  }

  async clear(scope: ViewerScope): Promise<void> {
    const choices = this.read();
    const key = viewerScopeKey(scope);
    if (!(key in choices)) return;
    delete choices[key];
    this.write(choices);
  }

  private read(): Record<string, ViewerChoice> {
    let raw: unknown;
    try {
      const text = this.storage.getItem(VIEWERS_STORAGE_KEY);
      if (text === null) return {};
      raw = JSON.parse(text);
    } catch {
      return {};
    }
    const parsed = documentSchema.safeParse(raw);
    if (!parsed.success) return {};
    const choices: Record<string, ViewerChoice> = {};
    for (const [key, value] of Object.entries(parsed.data.choices)) {
      const choice = choiceSchema.safeParse(value);
      if (choice.success) choices[key] = choice.data;
    }
    return choices;
  }

  private write(choices: Record<string, ViewerChoice>): void {
    this.storage.setItem(
      VIEWERS_STORAGE_KEY,
      JSON.stringify({ version: 1, choices })
    );
  }
}
