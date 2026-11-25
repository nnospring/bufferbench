import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, bufferCapacity, ION_CHARGE, type Composition } from '../src/equilibrium.ts';
import { compositionFromMolalities } from '../src/mixture.ts';
import { pKw } from '../src/physics.ts';
import { ACTIVITY_MODELS, pKAt } from '../src/model.ts';
import { getSystem } from '../src/data/systems.ts';

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);

function chargeOf(c: Composition, tC: number) {
  const e = solve(c, { tC });
  let q = e.hydrogenMolality - e.hydroxideMolality;
  for (const [ion, m] of Object.entries(c.ions)) q += ION_CHARGE[ion]! * m;
  for (const s of e.species) q += s.charge * s.molality;
  return { e, q };
}

test('pure water: pH = pKw/2', () => {
  for (const t of [0, 25, 50]) close(solve({ systems: {}, ions: {} }, { tC: t }).pH, pKw(t) / 2, 1e-6, `${t} °C`);
});

test('charge balance and mass balance close to machine precision', () => {
  const cases: Record<string, number>[] = [
    { kh2po4: 0.025, na2hpo4: 0.025 },
    { tris: 0.05, hcl: 0.03, nacl: 0.15 },
    { 'citric-acid': 0.02, naoh: 0.03 },
    { hepes: 0.05, naoh: 0.025, 'mgcl2-6h2o': 0.002 },
    { borax: 0.01 },
  ];
  for (const amounts of cases) {
    const c = compositionFromMolalities(amounts);
    const { e, q } = chargeOf(c, 25);
    assert.ok(Math.abs(q) < 1e-12, `charge ${q} for ${JSON.stringify(amounts)}`);
    for (const [sys, total] of Object.entries(c.systems)) {
      const sum = e.species.filter((s) => s.system === sys).reduce((a, s) => a + s.molality, 0);
      close(sum, total, 1e-14 * Math.max(1, total));
    }
    let i2 = e.hydrogenMolality + e.hydroxideMolality;
    for (const [ion, m] of Object.entries(c.ions)) i2 += ION_CHARGE[ion]! ** 2 * m;
    for (const s of e.species) i2 += s.charge ** 2 * s.molality;
    close(e.ionicStrength, i2 / 2, 1e-12);
  }
});

test('an equimolar conjugate pair in the ideal model sits at the pK', () => {
  const c = compositionFromMolalities({ tris: 0.05, 'tris-hcl': 0.05 });
  close(solve(c, { tC: 25, model: 'ideal' }).pH, 8.072, 0.002);
  close(solve(c, { tC: 37, model: 'ideal' }).pH, pKAt(getSystem('tris').steps[0]!, 37), 0.002);
});

test('strong acid: 1 mmol/kg HCl', () => {
  const c = compositionFromMolalities({ hcl: 0.001 });
  close(solve(c, { tC: 25, model: 'ideal' }).pH, 3, 1e-6);
  assert.ok(solve(c, { tC: 25 }).pH > 3); // γ < 1 raises −lg a(H⁺)
});

test('adding base raises pH; warming Tris lowers it', () => {
  let last = -Infinity;
  for (const n of [0, 0.01, 0.02, 0.03, 0.04]) {
    const pH = solve(compositionFromMolalities({ hepes: 0.05, naoh: n }), { tC: 25 }).pH;
    assert.ok(pH > last); last = pH;
  }
  const tris = compositionFromMolalities({ tris: 0.05, hcl: 0.025 });
  assert.ok(solve(tris, { tC: 4 }).pH - solve(tris, { tC: 37 }).pH > 0.9);
});

test('ionic strength lowers the pH of an anionic-acid buffer and raises it for a cationic acid', () => {
  const phos = { kh2po4: 0.01, na2hpo4: 0.01 };
  const tris = { tris: 0.01, 'tris-hcl': 0.01 };
  const p0 = solve(compositionFromMolalities(phos), { tC: 25 }).pH;
  const p1 = solve(compositionFromMolalities({ ...phos, nacl: 0.15 }), { tC: 25 }).pH;
  assert.ok(p1 < p0 - 0.05, `phosphate ${p0} → ${p1}`);
  const t0 = solve(compositionFromMolalities(tris), { tC: 25 }).pH;
  const t1 = solve(compositionFromMolalities({ ...tris, nacl: 0.15 }), { tC: 25 }).pH;
  assert.ok(t1 > t0 + 0.02, `Tris ${t0} → ${t1}`);
});

test('buffer capacity peaks near the pKa and matches the ideal-solution formula', () => {
  // β = 2.303 (C·Ka·[H]/(Ka+[H])² + [H] + [OH]) for a monoprotic acid
  const C = 0.05;
  for (const n of [0.01, 0.025, 0.04]) {
    const comp = compositionFromMolalities({ tris: C, hcl: C - n });
    const e = solve(comp, { tC: 25, model: 'ideal' });
    const H = 10 ** -e.pH, Ka = 10 ** -8.072, Kw = 10 ** -pKw(25);
    const beta = Math.LN10 * ((C * Ka * H) / (Ka + H) ** 2 + H + Kw / H);
    close(bufferCapacity(comp, { tC: 25, model: 'ideal' }), beta, beta * 1e-4);
  }
});

test('every activity model solves every system', () => {
  for (const model of ACTIVITY_MODELS) {
    for (const id of ['phosphate', 'citrate', 'pyrophosphate', 'histidine', 'btp', 'pipes', 'sulfate']) {
      const c: Composition = { systems: { [id]: 0.01 }, ions: { 'Na+': 0.01 } };
      const e = solve(c, { tC: 25, model });
      assert.ok(e.pH > 0 && e.pH < 14, `${id} ${model} ${e.pH}`);
    }
  }
});

test('bad input is refused', () => {
  assert.throws(() => solve({ systems: { nosuch: 0.1 }, ions: {} }, { tC: 25 }));
  assert.throws(() => solve({ systems: {}, ions: { 'Xx+': 0.1 } }, { tC: 25 }));
  assert.throws(() => solve({ systems: { tris: -1 }, ions: {} }, { tC: 25 }), RangeError);
});
