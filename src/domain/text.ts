/**
 * Uppercases the first letter of `text` (product rule, Ronda 17).
 * Leading punctuation, symbols and emoji are skipped ("¡asado!" -> "¡Asado!");
 * a leading digit stops the search ("123 completos" is unchanged). Only that
 * one letter changes: the rest of the text and its length stay as they are, so
 * a letter whose uppercase form is longer (e.g. "ß" -> "SS") is left alone.
 */
export function capitalizeFirst(text: string): string {
  let index = 0;
  for (const char of text) {
    if (/\p{N}/u.test(char)) return text;
    if (/\p{L}/u.test(char)) {
      const upper = char.toLocaleUpperCase('es-CL');
      if (upper.length !== char.length) return text;
      return text.slice(0, index) + upper + text.slice(index + char.length);
    }
    index += char.length;
  }
  return text;
}
