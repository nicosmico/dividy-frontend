import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ENTITY_ICONS } from './entity-icons';
import { ICON_KEYS, KEYWORDS, type IconKey, type IconKind } from './keywords';
import { suggestIcon, tokenize } from './suggest-icon';

type Case = [text: string, kind: IconKind, expected: IconKey];

const CASES: Case[] = [
  // Comida
  ['Asado', 'expense', 'beef'],
  ['Asado del viernes', 'group', 'beef'],
  ['Carne para el asado', 'expense', 'beef'],
  ['Completos', 'expense', 'sandwich'],
  ['Choripán', 'expense', 'sandwich'],
  ['Once', 'expense', 'coffee'],
  ['Desayuno', 'expense', 'coffee'],
  ['Almuerzo', 'expense', 'utensils'],
  ['Cena de fin de año', 'expense', 'utensils'],
  ['Empanadas', 'expense', 'utensils'],
  ['Restorán', 'expense', 'utensils'],
  ['Pizza', 'expense', 'pizza'],
  ['Sushi', 'expense', 'fish'],
  // Bebidas
  ['Copete', 'expense', 'cocktail'],
  ['Piscola', 'expense', 'cocktail'],
  ['Chelas', 'expense', 'beer'],
  ['Cerveza', 'expense', 'beer'],
  ['Vino', 'expense', 'wine'],
  ['Tragos', 'expense', 'cocktail'],
  ['Bebidas', 'expense', 'soda'],
  ['Jugo', 'expense', 'soda'],
  ['Café', 'expense', 'coffee'],
  ['Té', 'expense', 'coffee'],
  // Supermercado
  ['Supermercado', 'expense', 'shopping-cart'],
  ['Súper', 'expense', 'shopping-cart'],
  ['super', 'expense', 'shopping-cart'],
  ['Jumbo', 'expense', 'shopping-cart'],
  ['LÍDER', 'expense', 'shopping-cart'],
  ['Santa Isabel', 'expense', 'shopping-cart'],
  ['Feria', 'expense', 'shopping-cart'],
  ['Almacén', 'expense', 'shopping-cart'],
  // Transporte
  ['Uber', 'expense', 'taxi'],
  ['Uber al terminal', 'expense', 'taxi'],
  ['Cabify', 'expense', 'taxi'],
  ['Taxi', 'expense', 'taxi'],
  ['Micro', 'expense', 'bus'],
  ['Metro', 'expense', 'bus'],
  ['Pasajes', 'expense', 'bus'],
  ['Buses', 'expense', 'bus'],
  ['Bencina', 'expense', 'fuel'],
  ['Peaje', 'expense', 'car'],
  ['Estacionamiento', 'expense', 'car'],
  ['Arriendo de auto', 'expense', 'car'],
  ['Pasaje avión', 'expense', 'plane'],
  ['Vuelo', 'expense', 'plane'],
  // Alojamiento
  ['Cabaña', 'expense', 'bed'],
  ['Hotel', 'expense', 'bed'],
  ['Airbnb', 'expense', 'bed'],
  ['Camping', 'expense', 'tent'],
  ['Arriendo cabaña', 'expense', 'bed'],
  // Casa y cuentas
  ['Arriendo', 'expense', 'house'],
  ['Gastos comunes', 'expense', 'house'],
  ['Dividendo', 'expense', 'house'],
  ['Luz', 'expense', 'electricity'],
  ['Luces', 'expense', 'electricity'],
  ['Agua', 'expense', 'water'],
  ['Gas', 'expense', 'gas'],
  ['Internet', 'expense', 'wifi'],
  // Panoramas
  ['Entradas', 'expense', 'ticket'],
  ['Cine', 'expense', 'film'],
  ['Concierto', 'expense', 'music'],
  ['Tocata', 'expense', 'music'],
  ['Carrete', 'expense', 'party'],
  ['Bowling', 'expense', 'party'],
  ['Cumple de Eli', 'group', 'cake'],
  ['Cumpleaños', 'expense', 'cake'],
  ['Torta', 'expense', 'cake'],
  ['Regalo', 'expense', 'gift'],
  // Salud, mascotas, deporte
  ['Farmacia', 'expense', 'pill'],
  ['Remedios', 'expense', 'pill'],
  ['Veterinario', 'expense', 'paw'],
  ['Comida del perro', 'expense', 'paw'],
  ['Cancha de fútbol', 'expense', 'sports'],
  ['Pádel', 'expense', 'sports'],
  ['Gimnasio', 'expense', 'dumbbell'],
  // Viajes (grupos)
  ['Viaje a Pucón', 'group', 'plane'],
  ['Vacaciones', 'group', 'palm-tree'],
  ['Paseo', 'group', 'palm-tree'],
  ['Pucón', 'group', 'mountain'],
  ['Playa', 'group', 'palm-tree'],
  ['Sur', 'group', 'mountain'],
  ['Norte', 'group', 'mountain'],
  // Normalización
  ['  ASADO  ', 'expense', 'beef'],
  ['asado!!!', 'expense', 'beef'],
  ['SÚPER', 'expense', 'shopping-cart'],
  ['sUpErMeRcAdO', 'expense', 'shopping-cart'],
  ['PUCÓN', 'group', 'mountain'],
  // Palabra completa, nunca subcadena
  ['Gastos', 'expense', 'receipt'],
  ['Gastos varios', 'expense', 'receipt'],
  ['Teatro', 'expense', 'film'],
  ['Tetera', 'expense', 'receipt'],
  ['Asadores', 'expense', 'receipt'],
  ['Superhéroes', 'expense', 'receipt'],
  ['Bar', 'expense', 'cocktail'],
  ['Barbacoa', 'expense', 'receipt'],
  ['Agua mineral', 'expense', 'soda'],
  ['Aguas', 'expense', 'water'],
  // Prioridad: gana la primera palabra con coincidencia
  ['Uber al supermercado', 'expense', 'taxi'],
  ['Supermercado y Uber', 'expense', 'shopping-cart'],
  ['Compras para el asado', 'expense', 'shopping-cart'],
  ['Pizza y chelas', 'expense', 'pizza'],
  ['Chelas y pizza', 'expense', 'beer'],
  ['Gas y luz', 'expense', 'gas'],
  ['Luz y gas', 'expense', 'electricity'],
  ['Regalo de cumpleaños', 'expense', 'gift'],
  ['Hola asado', 'expense', 'beef'],
  // Ambiguas
  ['Arriendo', 'group', 'house'],
  ['Arriendo de auto', 'group', 'car'],
  ['Arriendo depto', 'expense', 'bed'],
  ['Pasaje', 'expense', 'bus'],
  ['Pasaje aéreo', 'expense', 'plane'],
  ['Comida', 'expense', 'utensils'],
  ['Comida de gato', 'expense', 'paw'],
  ['Uber Eats', 'expense', 'utensils'],
  // Sin coincidencia
  ['', 'expense', 'receipt'],
  ['', 'group', 'users'],
  ['   ', 'expense', 'receipt'],
  ['???', 'group', 'users'],
  ['Cosas varias', 'expense', 'receipt'],
  ['Los amigos', 'group', 'users'],
  ['Familia', 'group', 'users'],
  ['Xyzzy', 'expense', 'receipt'],
  ['12345', 'expense', 'receipt'],
  ['😀🎉', 'group', 'users'],
];

describe('suggestIcon', () => {
  it('tiene al menos 50 casos de tabla', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(50);
  });

  it.each(CASES)('%j (%s) → %s', (text, kind, expected) => {
    expect(suggestIcon(text, kind)).toBe(expected);
  });

  it('sin coincidencia usa la boleta para gastos y las personas para grupos', () => {
    expect(suggestIcon('Cosas', 'expense')).toBe('receipt');
    expect(suggestIcon('Cosas', 'group')).toBe('users');
  });

  it('las palabras sólo de grupos no afectan a los gastos', () => {
    const groupOnly = KEYWORDS.filter((entry) => entry.only === 'group');
    for (const entry of groupOnly) {
      for (const word of entry.words) {
        expect(suggestIcon(word, 'expense')).not.toBe(entry.icon);
      }
    }
  });
});

describe('tokenize', () => {
  it('pasa a minúsculas, quita tildes y eñes, parte en palabras y omite conectores', () => {
    expect(tokenize('Arriendo de AUTO, con Peaje!')).toEqual([
      'arriendo',
      'auto',
      'peaje',
    ]);
    expect(tokenize('Cumpleaños  de Ñandú')).toEqual(['cumpleanos', 'nandu']);
  });
});

describe('diccionario', () => {
  it('toda clave tiene un componente de Lucide', () => {
    for (const key of ICON_KEYS) expect(ENTITY_ICONS[key]).toBeDefined();
    expect(Object.keys(ENTITY_ICONS).sort()).toEqual([...ICON_KEYS].sort());
  });

  it('cada palabra del diccionario se resuelve a su propio ícono', () => {
    for (const entry of KEYWORDS) {
      const kinds: IconKind[] = entry.only
        ? [entry.only]
        : ['group', 'expense'];
      for (const word of entry.words) {
        for (const kind of kinds) {
          expect(suggestIcon(word, kind), `${word} (${kind})`).toBe(entry.icon);
        }
      }
    }
  });

  it('ninguna palabra apunta a dos íconos distintos', () => {
    const seen = new Map<string, IconKey>();
    for (const entry of KEYWORDS) {
      for (const word of entry.words) {
        const key = tokenize(word).join(' ');
        const previous = seen.get(key);
        expect(
          previous === undefined || previous === entry.icon,
          `"${word}" está en ${previous} y en ${entry.icon}`
        ).toBe(true);
        seen.set(key, entry.icon);
      }
    }
  });
});

describe('suggestIcon (propiedades)', () => {
  const valid = new Set<string>(ICON_KEYS);
  const kind = fc.constantFrom<IconKind>('group', 'expense');

  it('nunca lanza error y siempre devuelve una clave válida', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), kind, (text, k) => {
        expect(valid.has(suggestIcon(text, k))).toBe(true);
      })
    );
    fc.assert(
      fc.property(fc.string(), kind, (text, k) => {
        expect(valid.has(suggestIcon(text, k))).toBe(true);
      })
    );
  });

  it('ignora mayúsculas y es determinista (palabras ASCII)', () => {
    const words = KEYWORDS.flatMap((entry) => entry.words).map((w) =>
      tokenize(w).join(' ')
    );
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...words, 'xyz', 'hola'), { maxLength: 4 }),
        kind,
        (parts, k) => {
          const text = parts.join(' ');
          expect(suggestIcon(text.toUpperCase(), k)).toBe(suggestIcon(text, k));
          expect(suggestIcon(text, k)).toBe(suggestIcon(text, k));
        }
      )
    );
  });
});
