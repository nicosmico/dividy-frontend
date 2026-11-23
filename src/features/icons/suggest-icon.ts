import {
  DEFAULT_ICON,
  KEYWORDS,
  type IconKey,
  type IconKind,
} from './keywords';

/** Words that carry no meaning on their own ("arriendo de auto" → "arriendo auto"). */
const STOPWORDS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'para',
  'por',
  'un',
  'una',
  'y',
]);

/** Lowercase, no accents (`ñ` → `n`), words made of letters and digits. */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '' && !STOPWORDS.has(word));
}

type Index = Map<string, IconKey>;

function buildIndex(kind: IconKind): { index: Index; maxWords: number } {
  const index: Index = new Map();
  let maxWords = 1;
  for (const entry of KEYWORDS) {
    if (entry.only && entry.only !== kind) continue;
    for (const phrase of entry.words) {
      const tokens = tokenize(phrase);
      if (tokens.length === 0) continue;
      maxWords = Math.max(maxWords, tokens.length);
      const key = tokens.join(' ');
      if (!index.has(key)) index.set(key, entry.icon);
    }
  }
  return { index, maxWords };
}

const INDEXES: Record<IconKind, ReturnType<typeof buildIndex>> = {
  group: buildIndex('group'),
  expense: buildIndex('expense'),
};

/** Singular candidates of a word: itself, without `s`, without `es`, `ces` → `z`. */
function candidates(word: string): string[] {
  const result = [word];
  if (word.length > 3 && word.endsWith('s')) result.push(word.slice(0, -1));
  if (word.length > 4 && word.endsWith('es')) result.push(word.slice(0, -2));
  if (word.length > 4 && word.endsWith('ces'))
    result.push(`${word.slice(0, -3)}z`);
  return result;
}

/** Looks the phrase up trying every singular candidate of each word. */
function lookup(index: Index, words: string[]): IconKey | undefined {
  let phrases = [''];
  for (const word of words) {
    const forms = candidates(word);
    phrases = phrases.flatMap((prefix) =>
      forms.map((form) => (prefix ? `${prefix} ${form}` : form))
    );
  }
  for (const phrase of phrases) {
    const icon = index.get(phrase);
    if (icon) return icon;
  }
  return undefined;
}

/**
 * Icon key for a group name or an expense description (decision 89).
 *
 * - Case, accents and simple plurals do not matter.
 * - Whole words only: "gas" never matches "gastos", "té" never "teatro".
 * - The first word (left to right) with a match wins, so "Uber al
 *   supermercado" is transport; at the same position the longest phrase wins.
 * - No match: the generic icon (`receipt` for expenses, `users` for groups).
 *
 * Pure and total: it never throws, whatever the text.
 */
export function suggestIcon(text: string, kind: IconKind): IconKey {
  const { index, maxWords } = INDEXES[kind];
  const words = tokenize(text);
  for (let start = 0; start < words.length; start++) {
    const longest = Math.min(maxWords, words.length - start);
    for (let length = longest; length >= 1; length--) {
      const icon = lookup(index, words.slice(start, start + length));
      if (icon) return icon;
    }
  }
  return DEFAULT_ICON[kind];
}
