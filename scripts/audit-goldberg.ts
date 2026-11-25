// Re-checks src/data/systems.ts against the text of Goldberg, Kishore & Lennen (2002).
//
//   node scripts/audit-goldberg.ts <goldberg-2002.txt>
//
// The paper is not redistributed here. Get the PDF from NIST (https://www.nist.gov/document/jpcrd615pdf) and extract
// its text layer to a file (the published audit used macOS PDFKit's page.string; `pdftotext -raw` gives similar
// text). The text layer drops minus signs, charges and "≈", so the three checks below test what the text can test:
//
// 1. Section 7 tables: empirical formula, molecular weight, and every pK, |ΔrH°| and |ΔrCp°| in the "Selected
//    values" line match the data file; ΔrG° = RT·ln10·pK holds for the selected pK.
// 2. Signs of ΔrH°: literature pK values measured at I = 0 must fall with temperature when ΔrH° > 0.
// 3. Charges: literature pK values at I = 0.05–0.5 M near 25 °C shift from the I = 0 value by about (2·z_acid − 1)·A·f(I),
//    so the size and direction of the shift tell the charge type of each step.
// Findings are reported, not asserted: literature values scatter, and a step without data cannot be checked.

import { readFileSync } from 'node:fs';
import { SYSTEMS } from '../src/data/systems.ts';
import { molarMass, parseFormula } from '../src/elements.ts';
import { pKAt } from '../src/model.ts';
import { debyeHuckelA, GAS_CONSTANT } from '../src/physics.ts';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/audit-goldberg.ts <text of Goldberg et al. 2002>'); process.exit(2); }
const txt = readFileSync(file, 'utf8');
const parts = txt.split(/TABLE (7\.\d+)\. /).slice(1);
const sec = new Map<string, string>();
for (let i = 0; i < parts.length; i += 2) sec.set(parts[i]!, parts[i + 1]!);
const RTln10 = (GAS_CONSTANT * 298.15 * Math.LN10) / 1000;
const sameComposition = (a: string, b: string) => {
  const x = parseFormula(a), y = parseFormula(b);
  return x.size === y.size && [...x].every(([el, n]) => y.get(el) === n);
};

// 1. constants
let c1 = 0;
console.log('1. Section 7 constants, formulas and molecular weights');
for (const sys of SYSTEMS) {
  const body = sec.get(sys.section);
  if (!body) { console.log(`   !! ${sys.id}: section ${sys.section} not found`); c1++; continue; }
  const formula = /Empirical formula\s+(\S+)/.exec(body)?.[1];
  const mw = Number(/Molecular weight\s+([\d.]+)/.exec(body)?.[1]);
  const at = body.indexOf('Selected values');
  const sel = body.slice(at, at + 900).replace(/\s+/g, ' ');
  const pks = [...sel.matchAll(/pK\S*\s+([\d.]+)/g)].map((m) => Number(m[1]));
  const dhs = [...sel.matchAll(/rH°\/\(kJ mol 1\)\s+([\d.]+)/g)].map((m) => Number(m[1]));
  const dcps = [...sel.matchAll(/rCp\S*\/\(J K 1 mol 1\)\s+([\d.]+)/g)].map((m) => Number(m[1]));
  const issues: string[] = [];
  if (formula && !sameComposition(formula, sys.formula)) issues.push(`formula ${formula} ≠ ${sys.formula}`);
  if (Math.abs(mw - sys.mw) > 0.005) issues.push(`molecular weight ${mw} ≠ ${sys.mw}`);
  if (Math.abs(molarMass(sys.formula) - mw) > 0.02) issues.push(`formula mass ${molarMass(sys.formula).toFixed(3)} vs ${mw}`);
  for (const st of sys.steps) {
    if (st.assumed) continue;
    if (!pks.some((q) => Math.abs(q - Math.abs(st.pK)) < 1e-9)) issues.push(`pK ${st.pK} not in [${pks}]`);
    if (st.dH !== null && !dhs.some((q) => Math.abs(q - Math.abs(st.dH!)) < 1e-9)) issues.push(`|ΔH| ${Math.abs(st.dH)} not in [${dhs}]`);
    if (st.dCp !== null && !dcps.some((q) => Math.abs(q - Math.abs(st.dCp!)) < 1e-9)) issues.push(`|ΔCp| ${Math.abs(st.dCp)} not in [${dcps}]`);
  }
  for (const m of sel.matchAll(/rG°\/\(kJ mol 1\)\s+([\d.]+)/g)) {
    const p = Number(m[1]) / RTln10;
    if (!pks.some((q) => Math.abs(q - p) < 0.01)) issues.push(`ΔG ${m[1]} ⇒ pK ${p.toFixed(3)} (another reaction in the section?)`);
  }
  if (issues.length) { c1++; console.log(`   !! ${sys.section} ${sys.id}: ${issues.join('; ')}`); }
}
console.log(`   ${SYSTEMS.length - c1} of ${SYSTEMS.length} systems without findings\n`);

// literature rows "pK [ΔH] T I" in a section
function rows(body: string, ionic: 'zero' | 'salt') {
  const lit = body.slice(Math.max(0, body.indexOf('Values from literature')), body.indexOf('Values adjusted') > 0 ? body.indexOf('Values adjusted') : undefined);
  const re = ionic === 'zero'
    ? /^(-?\d+\.\d+)\s+(?:-?\d+\.\d+\s+)?(2[7-9]\d\.\d+|3[0-3]\d\.\d+)\s+0(?:\s|$)/gm
    : /^(-?\d+\.\d+)\s+(?:-?\d+\.\d+\s+)?(29[3-9]\.\d+|30[0-3]\.\d+)\s+(\d\.\d+)\s*M\b/gm;
  return [...lit.matchAll(re)].map((m) => ({ pK: Number(m[1]), T: Number(m[2]), I: m[3] ? Number(m[3]) : 0 }));
}

// 2. signs of ΔH
let s2 = 0, s2bad = 0;
console.log('2. Sign of ΔrH° against literature pK(T) at I = 0');
for (const sys of SYSTEMS) {
  const r = rows(sec.get(sys.section) ?? '', 'zero');
  for (const st of sys.steps) {
    if (st.assumed || st.dH === null || Math.abs(st.dH) < 3) continue;
    const near = r.filter((x) => Math.abs(x.pK - st.pK) < 0.6);
    const lo = near.filter((x) => x.T < 293), hi = near.filter((x) => x.T > 303);
    if (!lo.length || !hi.length) continue;
    const mean = (a: typeof near) => a.reduce((s, x) => s + x.pK, 0) / a.length;
    const slope = mean(hi) - mean(lo);
    s2++;
    if ((slope < 0) !== (st.dH > 0)) { s2bad++; console.log(`   ?? ${sys.id} pK ${st.pK}: ΔH ${st.dH} but literature pK goes ${mean(lo).toFixed(3)} → ${mean(hi).toFixed(3)}`); }
  }
}
console.log(`   ${s2 - s2bad} of ${s2} checkable steps agree\n`);

// 3. charges
let c3 = 0, c3bad = 0;
const f = (I: number) => Math.sqrt(I) / (1 + Math.sqrt(I)) - 0.3 * I;
console.log('3. Charge type against literature pK at I = 0.05–0.5 M (Davies form)');
for (const sys of SYSTEMS) {
  const r = rows(sec.get(sys.section) ?? '', 'salt').filter((x) => x.I >= 0.05 && x.I <= 0.5);
  sys.steps.forEach((st, j) => {
    if (st.assumed) return;
    const zA = sys.z0 - j;
    const near = r.filter((x) => Math.abs(x.pK - pKAt(st, x.T - 273.15)) < 0.8);
    if (!near.length) return;
    const obs = near.map((x) => x.pK - pKAt(st, x.T - 273.15));
    const unit = near.map((x) => debyeHuckelA(x.T - 273.15) * f(x.I));
    const err = (z: number) => obs.reduce((a, o, k) => a + Math.abs(o - (2 * z - 1) * unit[k]!), 0) / obs.length;
    const best = [-3, -2, -1, 0, 1, 2].reduce((b, z) => (err(z) < err(b) ? z : b));
    c3++;
    if (best !== zA && err(zA) - err(best) >= 0.03) {
      c3bad++;
      console.log(`   ?? ${sys.id} pK ${st.pK}: acid charge ${zA}, literature fits ${best} better (n=${obs.length}, mean shift ${(obs.reduce((a, b) => a + b, 0) / obs.length).toFixed(3)})`);
    }
  });
}
console.log(`   ${c3 - c3bad} of ${c3} checkable steps agree`);
