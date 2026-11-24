// Bundle size budget. Run after `npm run build`:
//   npm run size              compares dist/ with bundle-budget.json (fails if over)
//   npm run size -- --write   rewrites bundle-budget.json from dist/ (+10 %)
// Sizes are gzip, like what the browser downloads. See docs/testing.md.
import {
  appendFileSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import {
  budgetFromMeasured,
  chunkName,
  compareToBudget,
  formatMarkdown,
  formatTable,
  initialAssets,
} from './bundle-size-lib.mjs';

const dist = new URL('../dist/', import.meta.url);
const budgetFile = new URL('../bundle-budget.json', import.meta.url);

const gzipSize = (path) =>
  gzipSync(readFileSync(new URL(path, dist)), { level: 9 }).length;

function measure() {
  let html;
  try {
    html = readFileSync(new URL('index.html', dist), 'utf8');
  } catch {
    console.error('No existe dist/index.html: corre `npm run build` primero.');
    process.exit(2);
  }
  const initial = initialAssets(html);
  const chunks = {};
  for (const file of readdirSync(new URL('assets/', dist))) {
    if (!/\.(js|css)$/.test(file)) continue;
    chunks[chunkName(file)] = gzipSize(`assets/${file}`);
  }
  const sum = (paths) =>
    paths.reduce((total, path) => total + gzipSize(path), 0);
  return {
    initialJs: sum(initial.js),
    initialCss: sum(initial.css),
    chunks,
  };
}

const measured = measure();

if (process.argv.includes('--write')) {
  const budget = budgetFromMeasured(measured);
  writeFileSync(budgetFile, `${JSON.stringify(budget, null, 2)}\n`);
  console.log(`Presupuesto actualizado en ${fileURLToPath(budgetFile)}`);
  process.exit(0);
}

const budget = JSON.parse(readFileSync(budgetFile, 'utf8'));
const { rows, failures, unused } = compareToBudget(measured, budget);

console.log(formatTable(rows));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Tamaño del bundle (gzip)\n\n${formatMarkdown(rows)}\n`
  );
}
for (const name of unused) {
  console.warn(
    `Aviso: "${name}" está en bundle-budget.json pero ya no existe.`
  );
}
if (failures.length > 0) {
  console.error('\nPresupuesto de tamaño excedido:');
  for (const failure of failures) console.error(`  - ${failure.message}`);
  console.error(
    '\nSi el aumento es intencional, súbelo con `npm run size -- --write` y explícalo en el PR (ver docs/testing.md).'
  );
  process.exit(1);
}
console.log('\nTodo dentro del presupuesto.');
