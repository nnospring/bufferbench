import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { main } from '../src/cli.ts';

test('recipe: text output names the reagents and the meter readings', () => {
  const r = main(['recipe', 'hepes', '--conc', '50mM', '--ph', '7.4', '--temp', '37', '--prep-temp', '22', '--add', 'nacl=150mM']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /HEPES \(free acid\)/);
  assert.match(r.stdout, /Sodium hydroxide/);
  assert.match(r.stdout, /Titrate at 22 °C to pH 7\.\d\d/);
  assert.match(r.stdout, /At 37 °C: pH 7\.40/);
});

test('recipe: JSON output round-trips and accepts aliases and units', () => {
  const r = main(['recipe', 'Trizma', '--conc', '0.05', '--ph', '8', '--volume', '500mL', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.system.id, 'tris');
  assert.equal(j.request.volume, 0.5);
  assert.ok(Math.abs(j.use.pH - 8) < 1e-6);
  assert.ok(j.notes.every((n: { text: string }) => typeof n.text === 'string'));
});

test('ph, suggest and list', () => {
  const p = main(['ph', 'tris=50mM', 'hcl=40mM', '--temp', '4']);
  assert.equal(p.code, 0, p.stderr);
  assert.match(p.stdout, /^pH 8\.\d+ at 4 °C/);
  const s = main(['suggest', '7.4', '--json']);
  assert.ok(JSON.parse(s.stdout).some((x: { system: string }) => x.system === 'hepes'));
  assert.match(main(['list', 'reagents']).stdout, /Na2HPO4·7H2O/);
  assert.match(main(['list']).stdout, /pipes/);
});

test('errors: usage problems exit 2, chemistry problems exit 1, both in the chosen language', () => {
  assert.equal(main(['recipe', 'nosuch', '--conc', '1mM', '--ph', '7']).code, 2);
  assert.equal(main(['recipe', 'tris', '--ph', '8']).code, 2);
  assert.equal(main(['recipe', 'tris', '--conc', '5 furlongs', '--ph', '8']).code, 2);
  const bad = main(['recipe', 'tris', '--conc', '2M', '--ph', '8', '--add', 'nacl=1M', '--lang', 'zh']);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /离子强度/);
  assert.equal(main([]).code, 2);
  assert.equal(main(['--version']).stdout, JSON.parse(execFileSync(process.execPath, ['-p', 'JSON.stringify(require("./package.json").version)'], { cwd: join(import.meta.dirname, '..'), encoding: 'utf8' })));
});

test('the executable runs from the source file', () => {
  const out = execFileSync(process.execPath, [join(import.meta.dirname, '..', 'src', 'cli.ts'), 'ph', 'kh2po4=25mM', 'na2hpo4=25mM'], { encoding: 'utf8' });
  assert.match(out, /^pH 6\.8\d\d at 25 °C/);
});
