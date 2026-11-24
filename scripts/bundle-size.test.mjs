import { describe, expect, it } from 'vitest';

import {
  budgetFromMeasured,
  chunkName,
  compareToBudget,
  formatKb,
  formatTable,
  initialAssets,
  roundUp,
} from './bundle-size-lib.mjs';

describe('chunkName', () => {
  it.each([
    ['index-DPbRCEuH.js', 'index.js'],
    ['index-DjZlnSnA.css', 'index.css'],
    ['explanation-QG-nFokg.js', 'explanation.js'],
    ['preload-helper-BjTPOOB-.js', 'preload-helper.js'],
    ['workbox-window.prod.es5-Bd17z0YL.js', 'workbox-window.prod.es5.js'],
    ['avatar-generator-WxFKyjJ0.js', 'avatar-generator.js'],
    ['sinhash.js', 'sinhash.js'],
  ])('%s -> %s', (file, name) => {
    expect(chunkName(file)).toBe(name);
  });
});

describe('initialAssets', () => {
  it('toma el script de entrada, los modulepreload y las hojas de estilo', () => {
    const html = `
      <script>inline()</script>
      <script type="module" crossorigin src="/assets/index-A.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-B.js">
      <link rel="stylesheet" crossorigin href="/assets/index-C.css">
      <link rel="icon" href="/favicon.svg" />
      <link rel="manifest" href="/manifest.webmanifest">`;
    expect(initialAssets(html)).toEqual({
      js: ['assets/index-A.js', 'assets/vendor-B.js'],
      css: ['assets/index-C.css'],
    });
  });

  it('sin etiquetas devuelve listas vacías', () => {
    expect(initialAssets('<html></html>')).toEqual({ js: [], css: [] });
  });
});

describe('roundUp y budgetFromMeasured', () => {
  it('redondea hacia arriba a múltiplos de 100 bytes', () => {
    expect(roundUp(1)).toBe(100);
    expect(roundUp(100)).toBe(100);
    expect(roundUp(101)).toBe(200);
  });

  it('agrega 10 % de margen a cada pieza', () => {
    const budget = budgetFromMeasured({
      initialJs: 100_000,
      initialCss: 9_000,
      chunks: { 'index.js': 75_000, 'play.js': 250 },
    });
    expect(budget).toEqual({
      initialJs: 110_000,
      initialCss: 9_900,
      chunks: { 'index.js': 82_500, 'play.js': 300 },
    });
  });
});

describe('compareToBudget', () => {
  const budget = {
    initialJs: 1000,
    initialCss: 500,
    chunks: { 'a.js': 300, 'b.js': 200 },
  };
  const within = {
    initialJs: 900,
    initialCss: 500,
    chunks: { 'a.js': 300, 'b.js': 10 },
  };

  it('pasa cuando todo está dentro del presupuesto (incluido el límite exacto)', () => {
    const { rows, failures } = compareToBudget(within, budget);
    expect(failures).toEqual([]);
    expect(rows.map((row) => row.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
  });

  it('falla indicando qué pieza se pasó y por cuánto', () => {
    const { failures } = compareToBudget(
      { ...within, chunks: { 'a.js': 1_350, 'b.js': 10 } },
      budget
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].message).toBe(
      'a.js pesa 1,4 kB gzip y el presupuesto es 0,3 kB: se pasó por 1,1 kB.'
    );
  });

  it('el JS y el CSS iniciales también cuentan', () => {
    const { failures } = compareToBudget(
      { ...within, initialJs: 1001, initialCss: 501 },
      budget
    );
    expect(failures.map((f) => f.label)).toEqual(['JS inicial', 'CSS inicial']);
  });

  it('un chunk nuevo sin presupuesto falla', () => {
    const { failures } = compareToBudget(
      { ...within, chunks: { ...within.chunks, 'nuevo.js': 5 } },
      budget
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].label).toBe('nuevo.js');
    expect(failures[0].message).toContain('no tiene presupuesto');
  });

  it('un chunk que ya no existe no falla, pero se informa', () => {
    const { failures, unused } = compareToBudget(
      { ...within, chunks: { 'a.js': 300 } },
      budget
    );
    expect(failures).toEqual([]);
    expect(unused).toEqual(['b.js']);
  });

  it('la tabla incluye todas las piezas con su estado', () => {
    const { rows } = compareToBudget(within, budget);
    const table = formatTable(rows);
    expect(table).toContain('JS inicial');
    expect(table).toContain('a.js');
    expect(table.split('\n')).toHaveLength(rows.length + 1);
  });
});

describe('formatKb', () => {
  it('usa coma decimal', () => {
    expect(formatKb(75_830)).toBe('75,8 kB');
    expect(formatKb(0)).toBe('0,0 kB');
  });
});
