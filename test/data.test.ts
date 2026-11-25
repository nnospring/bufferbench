import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEMS } from '../src/data/systems.ts';
import { REAGENTS, reagentCharge } from '../src/data/reagents.ts';
import { molarMass, parseFormula } from '../src/elements.ts';
import { ION_CHARGE } from '../src/equilibrium.ts';

test('system ids and reagent ids are unique', () => {
  assert.equal(new Set(SYSTEMS.map((s) => s.id)).size, SYSTEMS.length);
  assert.equal(new Set(REAGENTS.map((r) => r.id)).size, REAGENTS.length);
});

test('formula mass of every system matches the molecular weight printed in Goldberg et al. (2002) Section 7', () => {
  for (const s of SYSTEMS) {
    const m = molarMass(s.formula);
    assert.ok(Math.abs(m - s.mw) <= 0.02, `${s.id}: ${s.formula} = ${m.toFixed(3)} but the paper prints ${s.mw}`);
  }
});

test('ionization steps are listed from the most protonated species, pK ascending', () => {
  for (const s of SYSTEMS) {
    assert.ok(s.steps.length > 0, s.id);
    assert.ok(Number.isInteger(s.z0), s.id);
    for (let i = 1; i < s.steps.length; i++) assert.ok(s.steps[i]!.pK > s.steps[i - 1]!.pK, `${s.id}: step ${i} pK not ascending`);
    for (const st of s.steps) {
      assert.ok(Number.isFinite(st.pK), s.id);
      if (st.dCp !== null) assert.notEqual(st.dH, null, `${s.id}: ΔCp without ΔH`);
    }
    assert.ok(s.zh.length > 0 && s.name.length > 0, s.id);
  }
});

test('every reagent is electrically neutral and its formula parses', () => {
  for (const r of REAGENTS) {
    assert.ok(Math.abs(reagentCharge(r)) < 1e-12, `${r.id} has net charge ${reagentCharge(r)}`);
    assert.ok(molarMass(r.formula) > 0, r.id);
    for (const ion of Object.keys(r.ions)) assert.ok(ion === 'H+' || ion === 'OH-' || ion in ION_CHARGE, `${r.id}: unknown ion ${ion}`);
    if (r.system) assert.ok(SYSTEMS.some((s) => s.id === r.system), `${r.id}: unknown system ${r.system}`);
  }
});

test('every buffer reagent carries the skeleton of its system (salts and hydrates included)', () => {
  // Counter-ions, protons and water of crystallisation aside, the heavy-atom skeleton (C, N, S, P, B, As) of a
  // reagent must be perUnit × that of Goldberg's reference species. This is what catches a wrong salt formula,
  // which would put a wrong mass on the recipe.
  for (const r of REAGENTS) {
    if (!r.system) continue;
    const sys = SYSTEMS.find((s) => s.id === r.system)!;
    const a = parseFormula(r.formula), b = parseFormula(sys.formula);
    const n = r.perUnit ?? 1;
    for (const el of ['C', 'N', 'S', 'P', 'B', 'As']) assert.equal(a.get(el) ?? 0, (b.get(el) ?? 0) * n, `${r.id}: ${el} count differs from ${n} × ${sys.formula}`);
    // hydrogen and oxygen: the reagent may differ from the reference species only by protons, H2O, and (for
    // carbonate, whose reference is CO2) one H2O of hydration
    const dO = (a.get('O') ?? 0) - (b.get('O') ?? 0) * n;
    assert.ok(Number.isInteger(dO) && dO >= -0 && dO <= 12 + (sys.id === 'carbonate' ? 1 : 0), `${r.id}: oxygen differs by ${dO}`);
  }
});

test('formula parser handles hydrates, dots and parentheses', () => {
  assert.equal(parseFormula('Na2HPO4·7H2O').get('H'), 15);
  assert.equal(parseFormula('Na2HPO4.7H2O').get('O'), 11);
  assert.equal(parseFormula('(HOCH2)3CNH2').get('C'), 4);
  assert.equal(parseFormula('C6H9N3O2·HCl·H2O').get('Cl'), 1);
  assert.throws(() => parseFormula('Xx2'), SyntaxError);
  assert.throws(() => parseFormula('C(H2'), SyntaxError);
});
