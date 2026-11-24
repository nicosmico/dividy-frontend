import fc from 'fast-check';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import {
  computeBalances,
  createSnapshot,
  snapshotToGroup,
  toCompactSnapshotV1,
  type Group,
  type Snapshot,
} from '@/domain';
import { groupArb } from '@/domain/test-utils/arbitraries';
import { makeGroup } from '@/domain/test-utils/fixtures';
import {
  buildSnapshotUrl,
  decodeSnapshot,
  encodeSnapshot,
  isSnapshotLinkSupported,
} from './snapshot-codec';

const TAKEN = '2026-11-24T13:42:10.123Z';

const sampleGroup = (): Group => ({
  ...makeGroup({
    name: 'Viaje a Pucón',
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        description: 'Cabaña',
        amount: 90_000,
        payer: 'Carla',
        among: ['Carla', 'Ana', 'Beto'],
        date: '2026-03-10',
      },
      {
        description: 'Café ☕ y pan',
        amount: 1_001,
        payer: 'Ana',
        among: ['Beto', 'Ana'],
      },
    ],
    payments: [{ from: 'Beto', to: 'Carla', amount: 5_000 }],
  }),
  id: 'group-xyz',
});

const sampleSnapshot = (): Snapshot => createSnapshot(sampleGroup(), TAKEN);

/** Builds a token from any JSON value, to test payloads the app would never produce. */
async function tokenFromJson(value: unknown, version = 1): Promise<string> {
  const bytes = new TextEncoder().encode(
    typeof value === 'string' ? value : JSON.stringify(value)
  );
  return `v${version}.${await deflateBase64Url(bytes)}`;
}

async function deflateBase64Url(bytes: Uint8Array): Promise<string> {
  // zlib instead of CompressionStream: an independent implementation of the format.
  return deflateRawSync(bytes).toString('base64url');
}

describe('encodeSnapshot / decodeSnapshot', () => {
  it('el navegador de los tests puede crear links', () => {
    expect(isSnapshotLinkSupported()).toBe(true);
  });

  it('ida y vuelta devuelve la misma captura', async () => {
    const snapshot = sampleSnapshot();
    const token = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(token)).toEqual({ ok: true, value: snapshot });
  });

  it('el link lleva el prefijo de versión y solo caracteres seguros para una URL', async () => {
    const token = await encodeSnapshot(sampleSnapshot());
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  });

  it('no deja a la vista nombres ni montos (van comprimidos)', async () => {
    const token = await encodeSnapshot(sampleSnapshot());
    expect(token).not.toContain('Cabaña');
    expect(token).not.toContain('Pucón');
  });

  it('es determinista: la misma captura da el mismo link', async () => {
    const snapshot = sampleSnapshot();
    expect(await encodeSnapshot(snapshot)).toBe(await encodeSnapshot(snapshot));
  });

  it('conserva tildes, ñ, emojis y los avatares', async () => {
    const group = sampleGroup();
    group.name = 'Año nuevo 🎆';
    group.members[0].avatar = { color: 6, seed: 'semilla-ñandú' };
    const snapshot = createSnapshot(group, TAKEN);
    const result = await decodeSnapshot(await encodeSnapshot(snapshot));
    expect(result).toEqual({ ok: true, value: snapshot });
  });

  it('acepta el link con "#" delante y espacios alrededor', async () => {
    const snapshot = sampleSnapshot();
    const token = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(`  #${token}\n`)).toEqual({
      ok: true,
      value: snapshot,
    });
  });

  it('un grupo vacío (sin gastos ni pagos) también viaja', async () => {
    const snapshot = createSnapshot(
      makeGroup({ members: ['Ana', 'Beto'] }),
      TAKEN
    );
    expect(await decodeSnapshot(await encodeSnapshot(snapshot))).toEqual({
      ok: true,
      value: snapshot,
    });
  });

  it('buildSnapshotUrl pone el grupo en el hash, nunca en la ruta ni en la query', async () => {
    const token = await encodeSnapshot(sampleSnapshot());
    const url = new URL(buildSnapshotUrl('https://dividy.app', token));
    expect(url.pathname).toBe('/shared');
    expect(url.search).toBe('');
    expect(url.hash).toBe(`#${token}`);
  });
});

describe('links dañados (decodificar nunca lanza)', () => {
  it.each([
    ['vacío', ''],
    ['solo espacios', '   '],
    ['solo el prefijo', 'v1.'],
    ['sin prefijo de versión', 'eJyrVkrNS1GyUspIzcnJVwIAEF4DKA'],
    ['prefijo sin número', 'v.abc'],
    ['caracteres inválidos', 'v1.@@@@####'],
    ['base64 que no es deflate', 'v1.aGVsbG8gbXVuZG8'],
    ['base64 de longitud imposible', 'v1.a'],
    ['solo el hash', '#'],
  ])('%s → error amable', async (_name, token) => {
    const result = await decodeSnapshot(token);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_snapshot');
      expect(result.error.message).toMatch(/Pide que te lo compartan de nuevo/);
    }
  });

  it('un link truncado en cualquier punto da error, no un grupo a medias', async () => {
    const token = await encodeSnapshot(sampleSnapshot());
    for (const cut of [4, 10, Math.floor(token.length / 2), token.length - 8]) {
      const result = await decodeSnapshot(token.slice(0, cut));
      expect(result.ok, `cortado en ${cut}`).toBe(false);
    }
  });

  it('un link con caracteres cambiados nunca lanza (da error o un grupo válido)', async () => {
    const token = await encodeSnapshot(sampleSnapshot());
    for (let i = 3; i < token.length; i += 7) {
      const flipped =
        token.slice(0, i) + (token[i] === 'A' ? 'B' : 'A') + token.slice(i + 1);
      const result = await decodeSnapshot(flipped);
      if (result.ok) expect(result.value.members.length).toBeGreaterThan(0);
    }
  });

  it('versión desconocida → error propio y amable', async () => {
    for (const token of ['v2.abc', 'v99.abc', await tokenFromJson([], 7)]) {
      const result = await decodeSnapshot(token);
      expect(result).toMatchObject({
        ok: false,
        error: { code: 'unsupported_snapshot_version' },
      });
      if (!result.ok) expect(result.error.message).toMatch(/versión/);
    }
  });

  it.each([
    ['no es JSON', 'esto no es json'],
    ['JSON que no es una lista', { a: 1 }],
    ['lista vacía', []],
    ['faltan campos', ['g1', 1700000000000, 'Casa']],
    ['campos con tipos equivocados', ['g1', 'ayer', 'Casa', [], [], []]],
    ['sobran campos', ['g1', 1700000000000, 'Casa', [], [], [], 'extra']],
    [
      'miembro sin semilla',
      ['g1', 1700000000000, 'Casa', [['Ana', 0]], [], []],
    ],
  ])('un payload válido de deflate pero %s → error', async (_name, value) => {
    const result = await decodeSnapshot(await tokenFromJson(value));
    expect(result.ok).toBe(false);
  });

  it('un payload con la forma correcta pero datos imposibles → error', async () => {
    const compact = toCompactSnapshotV1(sampleSnapshot());
    compact[4][0][2] = 42; // pagador que no existe
    const result = await decodeSnapshot(await tokenFromJson(compact));
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'invalid_snapshot' },
    });
  });

  it('un payload gigante que se descomprime a megabytes se rechaza (zip bomb)', async () => {
    const bomb = await tokenFromJson('0'.repeat(5_000_000));
    expect(bomb.length).toBeLessThan(10_000);
    expect((await decodeSnapshot(bomb)).ok).toBe(false);
  });
});

describe('propiedades', () => {
  it('decode(encode(g)) equivale a g y da los mismos saldos', async () => {
    await fc.assert(
      fc.asyncProperty(
        groupArb({ maxMembers: 10, maxExpenses: 20, maxPayments: 8 }),
        async (group) => {
          const snapshot = createSnapshot(group, TAKEN);
          const result = await decodeSnapshot(await encodeSnapshot(snapshot));
          expect(result).toEqual({ ok: true, value: snapshot });
          if (!result.ok) return;
          expect(
            computeBalances(snapshotToGroup(result.value)).map((b) => b.balance)
          ).toEqual(computeBalances(group).map((b) => b.balance));
        }
      ),
      { numRuns: 60 }
    );
  });

  it('decodificar texto cualquiera nunca lanza', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string(),
          fc.stringMatching(/^v[0-9]{1,3}\.[A-Za-z0-9_-]{0,60}$/)
        ),
        async (text) => {
          const result = await decodeSnapshot(text);
          expect(typeof result.ok).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('tamaño del link', () => {
  /** Small deterministic generator so the measured size is reproducible. */
  function rng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return s / 4_294_967_296;
    };
  }

  const DESCRIPTIONS = [
    'Supermercado',
    'Bencina',
    'Almuerzo',
    'Cena en el pueblo',
    'Peaje',
    'Entradas al parque',
    'Carne y carbón',
    'Helados',
    'Farmacia',
    'Taxi',
    'Desayuno',
    'Cabaña',
    'Pan y bebidas',
    'Estacionamiento',
    'Leña',
    'Vino',
    'Lancha',
    'Cafetería',
    'Botellas de agua',
    'Pizza',
  ];
  const ALPHABET =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

  /** A busy, realistic group: 8 members with nanoid-like seeds, 60 expenses, 6 payments. */
  function busyGroup(): Group {
    const random = rng(2026);
    const id21 = () =>
      Array.from(
        { length: 21 },
        () => ALPHABET[Math.floor(random() * ALPHABET.length)]
      ).join('');
    const names = [
      'Ana',
      'Beto',
      'Carla',
      'Diego',
      'Elisa',
      'Felipe',
      'Gabriela',
      'Hugo',
    ];
    const base = Date.parse('2026-03-01T12:00:00.000Z');
    const expenses = Array.from({ length: 60 }, (_, i) => {
      const payer = names[Math.floor(random() * names.length)];
      const among = names.filter(() => random() < 0.7);
      const day = 1 + Math.floor(i / 4);
      return {
        id: `e${i}`,
        description: `${DESCRIPTIONS[Math.floor(random() * DESCRIPTIONS.length)]}`,
        amount:
          (1 + Math.floor(random() * 120)) * 500 +
          Math.floor(random() * 3) * 100,
        payer,
        among: among.length > 0 ? among : [payer],
        date: `2026-03-${String(day).padStart(2, '0')}`,
        createdAt: new Date(
          base + i * 3_600_000 + Math.floor(random() * 3_600_000)
        ).toISOString(),
      };
    });
    const payments = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      from: names[i],
      to: names[(i + 3) % names.length],
      amount: 5_000 * (i + 1),
      date: '2026-03-20',
      createdAt: new Date(base + 20 * 86_400_000 + i * 60_000).toISOString(),
    }));
    const group = makeGroup({
      name: 'Vacaciones en la cabaña',
      members: names,
      expenses,
      payments,
    });
    group.id = id21();
    group.members = group.members.map((m) => ({
      ...m,
      avatar: { color: m.avatar.color, seed: id21() },
    }));
    return group;
  }

  it('un grupo de 8 miembros y 60 gastos queda bajo 4.000 caracteres', async () => {
    const snapshot = createSnapshot(busyGroup(), TAKEN);
    expect(snapshot.expenses).toHaveLength(60);
    expect(snapshot.members).toHaveLength(8);
    const token = await encodeSnapshot(snapshot);
    const url = buildSnapshotUrl('https://dividy.netlify.app', token);
    // Measured: 1.897 characters of token, 1.931 with the URL (ADR 0006).
    expect(url.length).toBeLessThan(4_000);
    expect(token.length).toBeLessThan(2_200);
    expect(await decodeSnapshot(token)).toEqual({ ok: true, value: snapshot });
  });
});
