import { nanoid } from 'nanoid';

/**
 * New unique id. Uses nanoid on purpose: `crypto.randomUUID` is unavailable in
 * non-secure contexts (e.g. the app opened through a local IP).
 */
export function newId(): string {
  return nanoid();
}
