import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { capitalizeFirst } from './text';

describe('capitalizeFirst', () => {
  it.each([
    ['nico', 'Nico'],
    ['inaguración casa marcelo', 'Inaguración casa marcelo'],
    ['iPhone nuevo', 'IPhone nuevo'],
    ['ñandú', 'Ñandú'],
    ['élite', 'Élite'],
    ['123 completos', '123 completos'],
    ['¡asado!', '¡Asado!'],
    ['  nico', '  Nico'],
    ['Nico', 'Nico'],
    ['NICO', 'NICO'],
    ['', ''],
    ['!!!', '!!!'],
    ['$1000 pizza', '$1000 pizza'],
    ['🍕 pizza', '🍕 Pizza'],
    ['ß', 'ß'],
    ['ana maría', 'Ana maría'],
  ])('%j -> %j', (input, expected) => {
    expect(capitalizeFirst(input)).toBe(expected);
  });

  it('es idempotente y solo toca la primera letra', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (text) => {
        const once = capitalizeFirst(text);
        expect(capitalizeFirst(once)).toBe(once);
        expect(once.length).toBe(text.length);
        const diffs = [...text].filter((c, i) => c !== [...once][i]);
        expect(diffs.length).toBeLessThanOrEqual(1);
      })
    );
  });

  it('solo cambia un carácter y lo deja como su mayúscula', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme' }), (text) => {
        const once = capitalizeFirst(text);
        const a = [...text];
        const b = [...once];
        expect(b).toHaveLength(a.length);
        a.forEach((c, i) => {
          if (c !== b[i]) expect(b[i]).toBe(c.toLocaleUpperCase('es-CL'));
        });
      })
    );
  });
});
