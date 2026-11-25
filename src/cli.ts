#!/usr/bin/env node
// bufferbench command-line interface.

import { parseArgs } from 'node:util';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { recipe, predict, suggest, BufferError, ADJUST_FRACTION, type RecipeRequest, type Note, type Tier } from './recipe.ts';
import { SYSTEMS, SYSTEM_BY_ID } from './data/systems.ts';
import { REAGENTS, REAGENT_BY_ID } from './data/reagents.ts';
import { molarMass } from './elements.ts';
import { noteText, tierText, type Lang } from './messages.ts';
import { ACTIVITY_MODELS, type ActivityModel } from './model.ts';
import { VERSION, HOMEPAGE } from './version.ts';
import { CHECKED_MAX_DEVIATION, CHECKED_POINTS, CHECKED_STANDARDS } from './accuracy.ts';

const HELP = `bufferbench ${VERSION} — buffer recipes and pH from NIST-evaluated data, checked against NIST pH standards

Usage:
  bufferbench recipe <buffer> --conc <c> --ph <pH> [options]
  bufferbench ph <reagent>=<c> [<reagent>=<c> ...] [--temp <°C>] [--prep-temp <°C>]
  bufferbench suggest <pH> [--temp <°C>] [--ionic-strength <mol/kg>]
  bufferbench list [buffers|reagents]

Recipe options:
  --conc <c>            total buffer concentration, e.g. 50mM, 0.1M
  --ph <pH>             target pH at the temperature of use
  --temp <°C>           temperature of use (default 25)
  --prep-temp <°C>      temperature at which you make it and read the meter (default 25)
  --volume <v>          volume to make, e.g. 1L, 500mL (default 1L)
  --method <m>          titrate (one form + strong acid/base) or mix (two forms)
  --start <reagent>     form to start from when titrating (default: chosen for you)
  --titrant <reagent>   naoh, koh or hcl (default: chosen for you)
  --titrant-conc <c>    concentration of the titrant stock (default 1M)
  --forms <a,b>         the two forms to mix
  --add <r=c,...>       other components, e.g. nacl=150mM,kcl=2.7mM
  --stock <n>           make an n× stock; the target pH applies after dilution

Common options:
  --model <m>           ${ACTIVITY_MODELS.join(', ')} (default davies)
  --lang <en|zh>        language of the text output
  --json                machine-readable output
  -h, --help            this help
  -v, --version         version

Concentrations accept M, mM, uM (µM); volumes L, mL; a bare number means M or L.
Accuracy: all ${CHECKED_POINTS} certified values of ${CHECKED_STANDARDS} NIST pH standards reproduced within ${CHECKED_MAX_DEVIATION} pH.
${HOMEPAGE}`;

class UsageError extends Error {}

function parseAmount(s: string, kind: 'conc' | 'vol'): number {
  const m = /^\s*([0-9]*\.?[0-9]+(?:e[+-]?\d+)?)\s*([a-zµμ]*)\s*$/i.exec(s);
  if (!m) throw new UsageError(`cannot read "${s}"`);
  const v = Number(m[1]);
  const u = m[2]!.toLowerCase().replace('μ', 'µ');
  const units: Record<string, number> = kind === 'conc'
    ? { '': 1, m: 1, mm: 1e-3, um: 1e-6, 'µm': 1e-6, nm: 1e-9 }
    : { '': 1, l: 1, ml: 1e-3, ul: 1e-6, 'µl': 1e-6 };
  const f = units[u];
  if (f === undefined) throw new UsageError(`unknown unit "${m[2]}" in "${s}"`);
  return v * f;
}

function parseNumber(s: string | undefined, name: string, fallback?: number): number {
  if (s === undefined) { if (fallback === undefined) throw new UsageError(`--${name} is required`); return fallback; }
  const v = Number(s.replace(/°?c$/i, ''));
  if (!Number.isFinite(v)) throw new UsageError(`--${name}: "${s}" is not a number`);
  return v;
}

function parsePairs(list: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of list.flatMap((x) => x.split(',')).filter(Boolean)) {
    const [id, c] = item.split('=');
    if (!id || c === undefined) throw new UsageError(`expected reagent=concentration, got "${item}"`);
    if (!REAGENT_BY_ID.has(id)) throw new UsageError(`unknown reagent "${id}" (see: bufferbench list reagents)`);
    out[id] = (out[id] ?? 0) + parseAmount(c, 'conc');
  }
  return out;
}

function resolveSystem(name: string): string {
  const q = name.toLowerCase();
  if (SYSTEM_BY_ID.has(q)) return q;
  const hit = SYSTEMS.find((s) => s.name.toLowerCase() === q || s.aliases.some((a) => a.toLowerCase() === q));
  if (hit) return hit.id;
  const r = REAGENT_BY_ID.get(q);
  if (r?.system) return r.system;
  throw new UsageError(`unknown buffer "${name}" (see: bufferbench list buffers)`);
}

const fmtG = (g: number) => (g >= 1 ? `${g.toFixed(3)} g` : `${(g * 1000).toFixed(1)} mg`);
const fmtC = (c: number) => (c >= 1 ? `${+c.toFixed(4)} M` : `${+(c * 1000).toFixed(3)} mM`);
/** Pads to a display width, counting CJK characters as two columns. */
const width = (s: string) => [...s].reduce((w, ch) => w + (/[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - width(s)));

function printNotes(notes: Note[], lang: Lang, tier: Tier, out: string[]) {
  out.push('', tierText(tier, lang));
  for (const n of [...notes].sort((a, b) => (a.level === b.level ? 0 : a.level === 'warning' ? -1 : 1))) out.push(`${n.level === 'warning' ? '!' : '·'} ${noteText(n, lang)}`);
}

export function main(argv: string[]): { code: number; stdout: string; stderr: string } {
  const out: string[] = [];
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        conc: { type: 'string' }, ph: { type: 'string' }, temp: { type: 'string' }, 'prep-temp': { type: 'string' },
        volume: { type: 'string' }, method: { type: 'string' }, start: { type: 'string' }, titrant: { type: 'string' },
        'titrant-conc': { type: 'string' }, forms: { type: 'string' }, add: { type: 'string', multiple: true },
        stock: { type: 'string' }, model: { type: 'string' }, lang: { type: 'string' }, json: { type: 'boolean' },
        'ionic-strength': { type: 'string' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (e) {
    return { code: 2, stdout: '', stderr: `bufferbench: ${(e as Error).message}\nRun bufferbench --help for usage.` };
  }
  const { values: o, positionals: [cmd, ...rest] } = parsed;
  if (o.version) return { code: 0, stdout: VERSION, stderr: '' };
  if (o.help || !cmd) return { code: o.help ? 0 : 2, stdout: o.help ? HELP : '', stderr: o.help ? '' : HELP };
  const lang: Lang = o.lang === 'zh' ? 'zh' : 'en';
  const model = (o.model ?? 'davies') as ActivityModel;
  try {
    if (!ACTIVITY_MODELS.includes(model)) throw new UsageError(`--model must be one of ${ACTIVITY_MODELS.join(', ')}`);
    if (cmd === 'recipe') {
      if (rest.length !== 1) throw new UsageError('recipe takes one buffer name, e.g. bufferbench recipe hepes --conc 50mM --ph 7.4');
      if (o.method && o.method !== 'titrate' && o.method !== 'mix') throw new UsageError('--method must be titrate or mix');
      const req: RecipeRequest = {
        system: resolveSystem(rest[0]!),
        concentration: o.conc !== undefined ? parseAmount(o.conc, 'conc') : (() => { throw new UsageError('--conc is required, e.g. --conc 50mM'); })(),
        pH: parseNumber(o.ph, 'ph'),
        tUse: parseNumber(o.temp, 'temp', 25),
        tPrep: parseNumber(o['prep-temp'], 'prep-temp', 25),
        volume: o.volume ? parseAmount(o.volume, 'vol') : 1,
        additives: parsePairs(o.add ?? []),
        stockFactor: o.stock ? parseNumber(o.stock, 'stock') : 1,
        titrantMolarity: o['titrant-conc'] ? parseAmount(o['titrant-conc'], 'conc') : 1,
        model,
      };
      if (o.method) req.method = o.method as 'titrate' | 'mix';
      if (o.start) req.start = o.start;
      if (o.titrant) req.titrant = o.titrant;
      if (o.forms) { const f = o.forms.split(','); if (f.length !== 2) throw new UsageError('--forms takes two reagents: a,b'); req.forms = [f[0]!, f[1]!]; }
      const r = recipe(req);
      if (o.json) {
        const { equilibrium, ...use } = r.use;
        return { code: 0, stdout: JSON.stringify({ ...r, use: { ...use, ionicStrength: equilibrium.ionicStrength }, notes: r.notes.map((n) => ({ ...n, text: noteText(n, lang) })) }, null, 2), stderr: '' };
      }
      const f = r.request.stockFactor;
      out.push(`${lang === 'zh' ? r.system.zh : r.system.name} ${fmtC(r.request.concentration)}${f > 1 ? ` (${f}× stock)` : ''}, pH ${r.request.pH} @ ${r.request.tUse} °C, ${r.request.volume >= 1 ? `${r.request.volume} L` : `${r.request.volume * 1000} mL`}`);
      out.push('');
      for (const i of r.ingredients) {
        const amount = i.role === 'titrant' && i.stockML !== undefined ? `${i.stockML.toFixed(2)} mL of ${i.stockMolarity} M` : fmtG(i.grams);
        out.push(`  ${pad(lang === 'zh' ? i.zh : i.name, 44)} ${pad(i.formula, 18)} ${pad(fmtC(i.molarity), 12)} ${amount}`);
      }
      out.push('');
      if (r.prep.pHAdjust !== null) out.push(`Titrate at ${r.request.tPrep} °C to pH ${r.prep.pHAdjust.toFixed(2)} (at ${Math.round(ADJUST_FRACTION * 100)} % of the volume), then make up to volume`);
      if (r.prep.pH !== null) out.push(`Meter reading at ${r.request.tPrep} °C after making up to volume: pH ${r.prep.pH.toFixed(2)}`);
      out.push(`At ${r.request.tUse} °C: pH ${r.use.pH.toFixed(2)}, I = ${r.use.ionicStrength.toFixed(3)} mol/kg, β = ${r.use.bufferCapacity.toFixed(1)} mM/pH, dpH/dT = ${r.use.dpHdT.toFixed(4)} /°C, pKa′ = ${r.pKa.toFixed(2)}`);
      printNotes(r.notes, lang, r.tier, out);
    } else if (cmd === 'ph') {
      if (!rest.length) throw new UsageError('ph takes reagent=concentration pairs, e.g. bufferbench ph tris=50mM hcl=40mM');
      const t = parseNumber(o.temp, 'temp', 25);
      const p = predict({ amounts: parsePairs(rest), t, tPrep: parseNumber(o['prep-temp'], 'prep-temp', t), model });
      if (o.json) {
        const { equilibrium, ...rest2 } = p;
        return { code: 0, stdout: JSON.stringify({ ...rest2, species: equilibrium.species, notes: p.notes.map((n) => ({ ...n, text: noteText(n, lang) })) }, null, 2), stderr: '' };
      }
      out.push(`pH ${p.pH.toFixed(3)} at ${p.tC} °C`);
      out.push(`I = ${p.ionicStrength.toFixed(4)} mol/kg, β = ${p.bufferCapacity.toFixed(2)} mM/pH, dpH/dT = ${p.dpHdT.toFixed(4)} /°C`);
      printNotes(p.notes, lang, p.tier, out);
    } else if (cmd === 'suggest') {
      if (rest.length !== 1) throw new UsageError('suggest takes one pH value');
      const list = suggest({ pH: parseNumber(rest[0], 'pH'), t: parseNumber(o.temp, 'temp', 25), I: o['ionic-strength'] ? parseNumber(o['ionic-strength'], 'ionic-strength') : 0.1, model });
      if (o.json) return { code: 0, stdout: JSON.stringify(list, null, 2), stderr: '' };
      if (!list.length) out.push('No buffer has a pKa within one unit of this pH.');
      for (const s of list) out.push(`  ${pad(lang === 'zh' ? s.zh : s.name, 34)} pKa ${s.pKa.toFixed(2)}  ${s.dpKadT === null ? '   (no ΔH)' : `${s.dpKadT >= 0 ? '+' : ''}${s.dpKadT.toFixed(4)}/°C`}${s.certified ? '  certified' : ''}${s.flags.length ? '  [' + s.flags.join(', ') + ']' : ''}`);
    } else if (cmd === 'list') {
      const what = rest[0] ?? 'buffers';
      if (what === 'buffers') {
        if (o.json) return { code: 0, stdout: JSON.stringify(SYSTEMS, null, 2), stderr: '' };
        for (const s of SYSTEMS) out.push(`  ${pad(s.id, 16)} ${pad(s.name, 34)} pK ${s.steps.filter((x) => !x.assumed).map((x) => x.pK).join(', ')}`);
      } else if (what === 'reagents') {
        if (o.json) return { code: 0, stdout: JSON.stringify(REAGENTS.map((r) => ({ ...r, molarMass: molarMass(r.formula) })), null, 2), stderr: '' };
        for (const r of REAGENTS) out.push(`  ${pad(r.id, 20)} ${pad(r.formula, 20)} ${molarMass(r.formula).toFixed(2).padStart(8)}  ${lang === 'zh' ? r.zh : r.name}`);
      } else throw new UsageError('list buffers | list reagents');
    } else {
      throw new UsageError(`unknown command "${cmd}"`);
    }
  } catch (e) {
    if (e instanceof UsageError) return { code: 2, stdout: '', stderr: `bufferbench: ${e.message}` };
    if (e instanceof BufferError) return { code: 1, stdout: '', stderr: `bufferbench: ${noteText({ code: e.code, params: e.params }, lang)}` };
    throw e;
  }
  return { code: 0, stdout: out.join('\n'), stderr: '' };
}

// Run when executed directly or through the npm bin link, not when imported by tests.
function invokedDirectly(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return pathToFileURL(realpathSync(arg)).href === import.meta.url; } catch { return false; }
}
if (invokedDirectly()) {
  const { code, stdout, stderr } = main(process.argv.slice(2));
  if (stdout) process.stdout.write(stdout + '\n');
  if (stderr) process.stderr.write(stderr + '\n');
  process.exitCode = code;
}
