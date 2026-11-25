import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BufferError, predict, recipe, suggest, type RecipeRequest } from '../src/recipe.ts';
import { getReagent } from '../src/data/reagents.ts';

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);

function amountsOf(r: ReturnType<typeof recipe>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of r.ingredients) out[i.reagent] = i.molarity / r.request.stockFactor;
  return out;
}

const CASES: RecipeRequest[] = [
  { system: 'hepes', concentration: 0.05, pH: 7.4, tUse: 37, tPrep: 22, volume: 1, additives: { nacl: 0.15 } },
  { system: 'tris', concentration: 0.05, pH: 8, tUse: 4, tPrep: 25, volume: 0.5 },
  { system: 'tris', concentration: 0.1, pH: 7.5, tUse: 25, volume: 1, method: 'mix' },
  { system: 'phosphate', concentration: 0.1, pH: 7, tUse: 25, volume: 1 },
  { system: 'mes', concentration: 0.1, pH: 6, tUse: 25, volume: 0.25, titrant: 'koh' },
  { system: 'acetate', concentration: 0.1, pH: 4.75, tUse: 25, volume: 1, method: 'mix' },
  { system: 'citrate', concentration: 0.05, pH: 5, tUse: 25, volume: 1 },
  { system: 'glycine', concentration: 0.1, pH: 9.5, tUse: 25, volume: 1 },
  { system: 'phosphate', concentration: 0.01, pH: 7.4, tUse: 25, volume: 1, stockFactor: 10, additives: { nacl: 0.137, kcl: 0.0027 } },
];

test('round trip: the recipe, predicted forward, gives the target pH at the use temperature', () => {
  for (const req of CASES) {
    const r = recipe(req);
    const p = predict({ amounts: amountsOf(r), tPrep: r.request.tPrep, t: req.tUse });
    close(p.pH, req.pH, 1e-6, `${req.system} pH ${req.pH}`);
    close(r.use.pH, req.pH, 1e-6);
  }
});

test('masses follow from amounts and molar masses', () => {
  const r = recipe({ system: 'hepes', concentration: 0.05, pH: 7.5, tUse: 25, volume: 0.5 });
  const hepes = r.ingredients.find((i) => i.reagent === 'hepes')!;
  close(hepes.mol, 0.025, 1e-12);
  close(hepes.grams, 0.025 * 238.302, 0.01);
  const naoh = r.ingredients.find((i) => i.reagent === 'naoh')!;
  close(naoh.stockML!, naoh.mol / 1 * 1000, 1e-9);
});

test('Tris made at 25 °C for use at 4 °C must be adjusted about 0.6 lower', () => {
  const r = recipe({ system: 'tris', concentration: 0.05, pH: 8, tUse: 4, tPrep: 25, volume: 1 });
  assert.ok(r.prep.pH! < 7.5 && r.prep.pH! > 7.3, String(r.prep.pH));
  assert.ok(r.notes.some((n) => n.code === 'adjust-at-prep-temperature'));
  assert.equal(r.ingredients[0]!.reagent, 'tris');
  assert.equal(r.ingredients[1]!.reagent, 'hcl');
});

test('PIPES free acid needs about 1.5 equivalents of base at its pKa (one sulfonic acid + half the amine)', () => {
  const r = recipe({ system: 'pipes', concentration: 0.1, pH: 6.76, tUse: 25, volume: 1 });
  const eq = r.ingredients.find((i) => i.role === 'titrant')!.molarity / 0.1;
  assert.ok(eq > 1.4 && eq < 1.6, String(eq));
});

test('a 10× PBS stock is too concentrated to predict its own pH reading, but the working solution is fine', () => {
  const r = recipe(CASES[8]!);
  assert.equal(r.prep.pH, null);
  assert.ok(r.notes.some((n) => n.code === 'stock-pH-unpredictable'));
  close(r.use.pH, 7.4, 1e-6);
});

test('tiers: certified chemistry, model only, and extrapolation', () => {
  assert.equal(recipe({ system: 'tris', concentration: 0.05, pH: 8, tUse: 25, volume: 1 }).tier, 'checked');
  assert.equal(recipe({ system: 'hepes', concentration: 0.02, pH: 7.5, tUse: 25, volume: 1 }).tier, 'model');
  assert.equal(recipe({ system: 'hepes', concentration: 0.02, pH: 7.5, tUse: 25, volume: 1, additives: { nacl: 0.15 } }).tier, 'extrapolated');
  assert.equal(recipe({ system: 'tris', concentration: 0.05, pH: 8, tUse: 55, volume: 1 }).tier, 'extrapolated');
  assert.equal(recipe({ system: 'bistris', concentration: 0.05, pH: 6.5, tUse: 25, volume: 1 }).tier, 'model');
});

test('requests that cannot be met throw BufferError with a code', () => {
  const codeOf = (fn: () => unknown) => { try { fn(); } catch (e) { assert.ok(e instanceof BufferError); return e.code; } return 'no error'; };
  assert.equal(codeOf(() => recipe({ system: 'hepes', concentration: 0.05, pH: 7.5, tUse: 25, volume: 1, start: 'hepes-na', titrant: 'naoh' })), 'target-unreachable');
  assert.equal(codeOf(() => recipe({ system: 'tris', concentration: 1, pH: 8, tUse: 25, volume: 1, additives: { nacl: 1 } })), 'ionic-strength-too-high');
  assert.equal(codeOf(() => recipe({ system: 'tris', concentration: 0.05, pH: 8, tUse: 80, volume: 1 })), 'temperature-out-of-range');
  assert.equal(codeOf(() => recipe({ system: 'tris', concentration: 0, pH: 8, tUse: 25, volume: 1 })), 'invalid-input');
  assert.equal(codeOf(() => recipe({ system: 'acetate', concentration: 0.1, pH: 9, tUse: 25, volume: 1, method: 'mix' })), 'target-unreachable');
});

test('warnings appear where they should', () => {
  const far = recipe({ system: 'tris', concentration: 0.05, pH: 6.5, tUse: 25, volume: 1 });
  assert.ok(far.notes.some((n) => n.code === 'weak-buffering'));
  const mg = recipe({ system: 'phosphate', concentration: 0.05, pH: 7, tUse: 25, volume: 1, additives: { 'mgcl2-6h2o': 0.005 } });
  assert.ok(mg.notes.some((n) => n.code === 'metal-complexation'));
  const noDH = recipe({ system: 'btp', concentration: 0.05, pH: 6.8, tUse: 37, volume: 1 });
  assert.ok(noDH.notes.some((n) => n.code === 'no-enthalpy'));
  assert.equal(noDH.tier, 'extrapolated');
});

test('suggest lists buffers near the target with temperature coefficients', () => {
  const list = suggest({ pH: 7.5, t: 25 });
  assert.ok(list.length > 5);
  assert.ok(list.slice(0, 6).some((s) => s.system === 'hepes'));
  for (let i = 1; i < list.length; i++) assert.ok(list[i]!.distance >= list[i - 1]!.distance);
  const tris = suggest({ pH: 8.1, t: 25 }).find((s) => s.system === 'tris')!;
  close(tris.dpKadT!, -0.028, 0.002);
});

test('ingredient roles and titrant stocks', () => {
  const r = recipe({ system: 'hepes', concentration: 0.05, pH: 7.4, tUse: 25, volume: 1, titrantMolarity: 10 });
  const t = r.ingredients.find((i) => i.role === 'titrant')!;
  assert.equal(getReagent(t.reagent).role, 'titrant');
  assert.equal(t.stockMolarity, 10);
  close(t.stockML!, t.mol * 100, 1e-9);
});

test('"checked" applies only to the ionization step a certified standard exercises', () => {
  assert.equal(recipe({ system: 'phosphate', concentration: 0.01, pH: 7, tUse: 25, volume: 1 }).tier, 'checked');
  assert.equal(recipe({ system: 'phosphate', concentration: 0.01, pH: 2.5, tUse: 25, volume: 1, method: 'titrate', start: 'nah2po4', titrant: 'hcl' }).tier, 'model');
  assert.equal(recipe({ system: 'citrate', concentration: 0.01, pH: 5, tUse: 25, volume: 1 }).tier, 'model');
  const near = suggest({ pH: 7.2, t: 25 }).find((s) => s.system === 'phosphate')!;
  assert.equal(near.certified, true);
});

test('every activity model runs through predict and recipe; only I > 0.5 is refused', () => {
  for (const model of ['davies', 'bates-guggenheim', 'ideal'] as const) {
    const p = predict({ amounts: { tris: 0.05, hcl: 0.04 }, t: 25, model });
    assert.ok(p.pH > 7.3 && p.pH < 8.5, `${model} ${p.pH}`);
    const r = recipe({ system: 'hepes', concentration: 0.05, pH: 7.4, tUse: 25, volume: 1, additives: { nacl: 0.15 }, model });
    close(r.use.pH, 7.4, 1e-6);
  }
  assert.ok(predict({ amounts: { tris: 0.05, hcl: 0.04 }, t: 25, model: 'ideal' }).notes.some((n) => n.code === 'ideal-model'));
  assert.ok(recipe({ system: 'hepes', concentration: 0.05, pH: 7.4, tUse: 25, volume: 1, additives: { nacl: 0.15 }, model: 'bates-guggenheim' }).notes.some((n) => n.code === 'model-limit-exceeded'));
});

test('the titration reading is given for the more concentrated solution at 80 % of the volume', () => {
  const r = recipe({ system: 'phosphate', concentration: 0.1, pH: 7, tUse: 25, volume: 1, method: 'titrate' });
  close(r.prep.pH!, 7, 1e-6);
  assert.ok(r.prep.pHAdjust! < r.prep.pH! - 0.005, `${r.prep.pHAdjust} vs ${r.prep.pH}`);
  assert.equal(recipe({ system: 'phosphate', concentration: 0.1, pH: 7, tUse: 25, volume: 1, method: 'mix' }).prep.pHAdjust, null);
});

test('"checked" also needs the certificates\' temperature range and a pH near the certified step', () => {
  assert.equal(predict({ amounts: { kh2po4: 0.01, na2hpo4: 0.01 }, t: 25 }).tier, 'checked');
  assert.equal(predict({ amounts: { kh2po4: 0.01, na2hpo4: 0.01 }, t: 2 }).tier, 'model'); // phosphate certified from 5 °C
  assert.equal(predict({ amounts: { nahco3: 0.01, na2co3: 0.01 }, t: 45 }).tier, 'model'); // carbonate certified 10–35 °C
  assert.equal(predict({ amounts: { nah2po4: 0.01 }, t: 25 }).tier, 'model'); // pH ≈ 4.7, far from pK2
  assert.equal(predict({ amounts: { tris: 0.05, hcl: 0.025 }, t: 0 }).tier, 'checked'); // Tris certified from 0 °C
});

test('a target just beside a form\'s own pH with salt present still solves or fails with a readable reason', () => {
  for (const pH of [4.3, 4.5, 4.7, 9.1, 9.3]) {
    try { const r = recipe({ system: 'phosphate', concentration: 0.05, pH, tUse: 25, volume: 1, method: 'titrate', additives: { nacl: 0.15 } }); close(r.use.pH, pH, 1e-6); }
    catch (e) { assert.ok(e instanceof BufferError); assert.ok(Object.keys(e.params).length > 0, `${e.code} without params`); }
  }
});

test('every certified standard, at every certified temperature, is itself in the "checked" tier', async () => {
  const { CERTIFIED } = await import('../benchmark/certified.ts');
  const { compositionFromMolalities } = await import('../src/mixture.ts');
  for (const c of CERTIFIED) {
    for (const t of Object.keys(c.values).map(Number)) {
      // certificates are in mol/kg; as mol/L at the same temperature this is the same composition
      const amounts: Record<string, number> = {};
      for (const [id, m] of Object.entries(c.composition)) amounts[id] = m * (await import('../src/physics.ts')).waterDensity(t) / 1000;
      const p = predict({ amounts, tPrep: t, t });
      assert.equal(p.tier, 'checked', `${c.id} at ${t} °C`);
      void compositionFromMolalities;
    }
  }
});

test('system notes are translated', () => {
  const r = recipe({ system: 'pipes', concentration: 0.05, pH: 6.8, tUse: 25, volume: 1 });
  const note = r.notes.find((n) => n.code === 'system-note')!;
  assert.match(String(note.params!.textZh), /磺酸/);
});
