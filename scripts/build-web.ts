// Assembles the static web app into site/: the pages from web/, the compiled library as site/lib/ and the
// benchmark results the validation tab shows.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.js'))) { console.error('dist/ is missing: run `npm run build` first'); process.exit(1); }
const site = join(root, 'site');
rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
cpSync(join(root, 'web'), site, { recursive: true });
cpSync(dist, join(site, 'lib'), { recursive: true, filter: (src) => !src.endsWith('.d.ts') && !/(^|\/)(cli)\.js$/.test(src) });
const results = join(root, 'benchmark', 'results.json');
if (existsSync(results)) cpSync(results, join(site, 'results.json'));
console.log('site/ ready');
