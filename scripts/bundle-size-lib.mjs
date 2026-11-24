// Pure logic of the bundle size budget (no file system, no process): the
// command `scripts/check-bundle-size.mjs` reads `dist/` and calls this, and
// `scripts/bundle-size.test.mjs` tests it.

/** Name without the content hash: `index-DPbRCEuH.js` -> `index.js`. */
export function chunkName(file) {
  const match = /^(.*)-[A-Za-z0-9_-]{8}(\.[a-z]+)$/.exec(file);
  return match ? `${match[1]}${match[2]}` : file;
}

/**
 * What `index.html` loads before anything else: the entry script, its
 * modulepreloads and the stylesheets. Paths come back relative to `dist/`.
 */
export function initialAssets(html) {
  const js = new Set();
  const css = new Set();
  for (const tag of html.match(/<(script|link)\b[^>]*>/g) ?? []) {
    const href = /\b(?:src|href)="([^"]+)"/.exec(tag)?.[1];
    if (!href) continue;
    const path = href.replace(/^\//, '');
    if (/^<script\b[^>]*\btype="module"/.test(tag)) js.add(path);
    else if (/\brel="modulepreload"/.test(tag)) js.add(path);
    else if (/\brel="stylesheet"/.test(tag)) css.add(path);
  }
  return { js: [...js], css: [...css] };
}

/** Next multiple of 100 bytes, so budgets are short readable numbers. */
export function roundUp(bytes) {
  return Math.ceil(bytes / 100) * 100;
}

/** A budget with `margin` (0.1 = 10 %) over what was measured. */
export function budgetFromMeasured(measured, margin = 0.1) {
  const chunks = {};
  for (const [name, bytes] of Object.entries(measured.chunks)) {
    chunks[name] = roundUp(Math.round(bytes * (1 + margin)));
  }
  return {
    initialJs: roundUp(Math.round(measured.initialJs * (1 + margin))),
    initialCss: roundUp(Math.round(measured.initialCss * (1 + margin))),
    chunks,
  };
}

/**
 * Compares measured gzip sizes with the budget.
 *
 * `measured` is `{ initialJs, initialCss, chunks: { [name]: bytes } }` and
 * `budget` has the same shape. Returns the table rows (always) and the
 * `failures` (rows over budget, chunks with no budget) so the caller can
 * print one and exit with the other.
 */
export function compareToBudget(measured, budget) {
  const rows = [];
  const failures = [];
  const add = (label, bytes, limit) => {
    const row = { label, bytes, limit };
    if (limit === undefined) {
      row.status = 'sin presupuesto';
      failures.push({
        ...row,
        message: `${label} es nuevo y no tiene presupuesto: agrégalo a bundle-budget.json (ver docs/testing.md).`,
      });
    } else if (bytes > limit) {
      row.status = 'EXCEDIDO';
      failures.push({
        ...row,
        message: `${label} pesa ${formatKb(bytes)} gzip y el presupuesto es ${formatKb(limit)}: se pasó por ${formatKb(bytes - limit)}.`,
      });
    } else {
      row.status = 'ok';
    }
    rows.push(row);
  };
  add('JS inicial', measured.initialJs, budget.initialJs);
  add('CSS inicial', measured.initialCss, budget.initialCss);
  for (const name of Object.keys(measured.chunks).sort()) {
    add(name, measured.chunks[name], budget.chunks?.[name]);
  }
  const unused = Object.keys(budget.chunks ?? {}).filter(
    (name) => !(name in measured.chunks)
  );
  return { rows, failures, unused };
}

/** `75830` -> `75,8 kB` (decimal comma, es-CL). */
export function formatKb(bytes) {
  const kb = (bytes / 1000).toFixed(1).replace('.', ',');
  return `${kb} kB`;
}

export function formatTable(rows) {
  const width = Math.max(...rows.map((row) => row.label.length), 5);
  const line = (a, b, c, d) =>
    `${a.padEnd(width)}  ${b.padStart(10)}  ${c.padStart(10)}  ${d}`;
  return [
    line('Pieza', 'Gzip', 'Presupuesto', 'Estado'),
    ...rows.map((row) =>
      line(
        row.label,
        formatKb(row.bytes),
        row.limit === undefined ? '-' : formatKb(row.limit),
        row.status
      )
    ),
  ].join('\n');
}

export function formatMarkdown(rows) {
  return [
    '| Pieza | Gzip | Presupuesto | Estado |',
    '| --- | ---: | ---: | --- |',
    ...rows.map(
      (row) =>
        `| ${row.label} | ${formatKb(row.bytes)} | ${
          row.limit === undefined ? '-' : formatKb(row.limit)
        } | ${row.status} |`
    ),
  ].join('\n');
}
