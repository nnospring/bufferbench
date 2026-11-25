import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { MESSAGE_CODES, MESSAGE_CODES_ZH } from '../src/messages.ts';
import { VERSION } from '../src/version.ts';

const root = join(import.meta.dirname, '..');

test('every note and error code used in the library has an English and a Chinese message', () => {
  assert.deepEqual([...MESSAGE_CODES].sort(), [...MESSAGE_CODES_ZH].sort());
  const src = readdirSync(join(root, 'src')).filter((f) => f.endsWith('.ts')).map((f) => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/code: '([a-z-]+)'/g)].map((m) => m[1]!).concat([...src.matchAll(/new BufferError\('([a-z-]+)'/g)].map((m) => m[1]!)));
  for (const code of used) assert.ok(MESSAGE_CODES.includes(code), `no message for ${code}`);
});

test('version in src/version.ts matches package.json', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(VERSION, pkg.version);
});

test('benchmark: committed results are current and the default model is within the gate', () => {
  const out = execFileSync(process.execPath, [join(root, 'scripts', 'benchmark.ts'), '--check'], { encoding: 'utf8' });
  assert.match(out, /benchmark ok/);
});

test('library code has no Node-only imports (it runs in the browser)', () => {
  for (const f of readdirSync(join(root, 'src'), { recursive: true }) as string[]) {
    if (!f.endsWith('.ts') || f === 'cli.ts') continue;
    assert.doesNotMatch(readFileSync(join(root, 'src', f), 'utf8'), /from 'node:/, f);
  }
});
